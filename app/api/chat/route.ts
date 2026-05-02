import { model, type modelID } from "@/ai/providers";
import { smoothStream, streamText, type UIMessage } from "ai";
import { appendResponseMessages } from 'ai';
import { saveChat, saveMessages, convertToDBMessages } from '@/lib/chat-store';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { initializeMCPClients, type MCPServerConfig } from '@/lib/mcp-client';
import { generateTitle } from '@/app/actions';
import { createTraceLogger } from '@/lib/chat-debug';
import { getDetailedErrorMessage, getErrorMessageText } from '@/lib/chat/error-utils';
import { hasTextPart, pruneNonRenderableAssistantMessages } from '@/lib/chat/message-utils';
import { repairToolCallInput } from '@/lib/chat/tool-repair';
import { decideExecutionModel, registerSuccessfulTurn, registerToolCallingFailure } from '@/lib/chat/model-execution-policy';

import { checkBotId } from "botid/server";

const STREAM_TIMEOUT_MS = 30000;
const MCP_INIT_TIMEOUT_MS = 7000;

function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) {
      controller.abort(reason);
    }
  };

  for (const signal of signals) {
    if (signal.aborted) {
      abort(signal.reason);
      break;
    }

    signal.addEventListener('abort', () => abort(signal.reason), { once: true });
  }

  return controller.signal;
}


export async function POST(req: Request) {
  const requestId = nanoid(10);
  const trace = createTraceLogger('chat-api', requestId);

  trace('request_started');

  const parseStartedAt = Date.now();
  const {
    messages,
    chatId,
    selectedModel,
    userId,
    mcpServers = [],
  }: {
    messages: UIMessage[];
    chatId?: string;
    selectedModel: modelID;
    userId: string;
    mcpServers?: MCPServerConfig[];
  } = await req.json();

  trace('request_parsed', {
    parseMs: Date.now() - parseStartedAt,
    messageCount: messages?.length ?? 0,
    selectedModel,
    mcpServerCount: mcpServers?.length ?? 0,
    hasChatId: Boolean(chatId),
  });

  const botCheckStartedAt = Date.now();
  const { isBot, isGoodBot } = await checkBotId();
  trace('bot_check_finished', {
    botCheckMs: Date.now() - botCheckStartedAt,
    isBot,
    isGoodBot,
  });

  if (isBot && !isGoodBot) {
    return new Response(
      JSON.stringify({ error: "Bot is not allowed to access this endpoint" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "User ID is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const id = chatId || nanoid();
  trace('chat_id_resolved', { resolvedChatId: id });

  let isNewChat = false;
  if (chatId) {
    try {
      const existingChatStartedAt = Date.now();
      const existingChat = await db.query.chats.findFirst({
        where: and(
          eq(chats.id, chatId),
          eq(chats.userId, userId)
        )
      });
      trace('existing_chat_lookup_finished', {
        existingChatLookupMs: Date.now() - existingChatStartedAt,
        foundExistingChat: Boolean(existingChat),
      });
      isNewChat = !existingChat;
    } catch (error) {
      console.error("Error checking for existing chat:", error);
      trace('existing_chat_lookup_failed', {
        error: getErrorMessageText(error),
      });
      isNewChat = true;
    }
  } else {
    isNewChat = true;
  }

  if (isNewChat && messages.length > 0) {
    try {
      const userMessage = messages.find(m => m.role === 'user');
      let title = 'New Chat';

      if (userMessage) {
        try {
          title = await generateTitle([userMessage]);
        } catch (error) {
          console.error("Error generating title:", error);
        }
      }

      await saveChat({
        id,
        userId,
        title,
        messages: [],
      });
    } catch (error) {
      console.error("Error saving new chat:", error);
    }
  }

  const timeoutController = new AbortController();
  const streamTimeoutId = setTimeout(() => {
    trace('stream_timeout_triggered', { timeoutMs: STREAM_TIMEOUT_MS });
    timeoutController.abort(new Error(`Stream timed out after ${STREAM_TIMEOUT_MS}ms`));
  }, STREAM_TIMEOUT_MS);

  const combinedSignal = combineAbortSignals([req.signal, timeoutController.signal]);

  const mcpInitStartedAt = Date.now();
  const { tools, cleanup } = await initializeMCPClients(mcpServers, combinedSignal, MCP_INIT_TIMEOUT_MS);
  const hasTools = Object.keys(tools).length > 0;
  const modelDecision = decideExecutionModel({
    userId,
    chatId: id,
    selectedModel,
    hasTools,
  });

  const executionModel = modelDecision.executionModel;
  const modelAutoSwitched = modelDecision.autoSwitched;

  trace('mcp_init_finished', {
    mcpInitMs: Date.now() - mcpInitStartedAt,
    discoveredToolCount: Object.keys(tools).length,
    selectedModel,
    executionModel,
    modelAutoSwitched,
  });

  let responseCompleted = false;
  let lastErrorMessageForUser: string | null = null;
  let sawToolCallingFailure = false;
  trace('stream_setup_started', { maxSteps: 20 });

  const result = streamText({
    model: model.languageModel(executionModel),
    abortSignal: combinedSignal,
    system: `You are a helpful assistant with access to a variety of tools.

    Today's date is ${new Date().toISOString().split('T')[0]}.

    The tools are very powerful, and you can use them to answer the user's question.
    So choose the tool that is most relevant to the user's question.

    If tools are not available, say you don't know or if the user wants a tool they can add one from the server icon in bottom left corner in the sidebar.

    You can use multiple tools in a single response.
    Always respond after using the tools for better user experience.
    You can run multiple steps using all the tools!!!!
    Make sure to use the right tool to respond to the user's question.

    Multiple tools can be used in a single response and multiple steps can be used to answer the user's question.
    If a tool call fails because of invalid parameters or schema validation, inspect the error, correct the arguments, and try the tool again once before giving up.

    ## Response Format
    - Markdown is supported.
    - Respond according to tool's response.
    - Use the tools to answer the user's question.
    - If you don't know the answer, use the tools to find the answer or say you don't know.
    `,
    messages,
    tools,
    maxSteps: 20,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 2048,
        },
      },
      anthropic: {
        thinking: {
          type: 'enabled',
          budgetTokens: 12000
        },
      }
    },
    experimental_transform: smoothStream({
      delayInMs: 5,
      chunking: 'line',
    }),
    experimental_repairToolCall: async ({ toolCall, parameterSchema, error, system, messages: stepMessages, tools: availableTools }) => {
      trace('experimental_repair_callback_entered', {
        toolName: toolCall.toolName,
        error: getErrorMessageText(error),
      });

      return repairToolCallInput({
        toolCall,
        parameterSchema,
        error,
        trace,
        system,
        messages: stepMessages,
        tools: availableTools,
      });
    },
    onError: (error) => {
      const rawErrorMessage = getErrorMessageText(error) ?? '';
      const rawLower = rawErrorMessage.toLowerCase();

      sawToolCallingFailure =
        rawLower.includes('tool call validation failed') ||
        rawLower.includes('invalid_request_error');

      const detailed = getDetailedErrorMessage(error);
      const shouldRecommendSwitch =
        selectedModel === 'llama4' &&
        hasTools &&
        !modelAutoSwitched &&
        sawToolCallingFailure;

      lastErrorMessageForUser = shouldRecommendSwitch
        ? `${detailed}\n\nSugerencia: cambia el modelo a qwen3-32b para una mayor estabilidad cuando uses tools.`
        : detailed;

      trace('stream_on_error', {
        error: rawErrorMessage,
        sawToolCallingFailure,
        shouldRecommendSwitch,
      });
      console.error(JSON.stringify(error, null, 2));
    },
    async onFinish({ response }) {
      responseCompleted = true;
      clearTimeout(streamTimeoutId);
      trace('stream_on_finish', {
        responseMessageCount: response.messages.length,
      });

      let allMessages = appendResponseMessages({
        messages,
        responseMessages: response.messages,
      });

      allMessages = pruneNonRenderableAssistantMessages(allMessages);

      const newTurnMessages = allMessages.slice(messages.length);
      const hasAssistantTextInCurrentTurn = newTurnMessages.some(
        (message) => message.role === 'assistant' && hasTextPart(message),
      );

      if (sawToolCallingFailure) {
        registerToolCallingFailure({
          userId,
          chatId: id,
          selectedModel,
          hasTools,
        });

        trace('model_policy_failure_registered', {
          selectedModel,
          executionModel,
        });
      } else if (hasAssistantTextInCurrentTurn) {
        registerSuccessfulTurn({
          userId,
          chatId: id,
          selectedModel,
          hasTools,
        });

        trace('model_policy_success_registered', {
          selectedModel,
          executionModel,
        });
      }

      if (!hasAssistantTextInCurrentTurn) {
        trace('assistant_text_missing_fallback_added');
        const fallbackText = lastErrorMessageForUser
          ? `${lastErrorMessageForUser}\n\nSi quieres, vuelve a intentarlo y lo reintento automáticamente con los parámetros corregidos.`
          : 'No pude generar una respuesta útil esta vez. Inténtalo de nuevo.';

        allMessages.push({
          id: nanoid(),
          role: 'assistant',
          parts: [{ type: 'text', text: fallbackText }],
        } as UIMessage);
      }

      const saveChatStartedAt = Date.now();
      await saveChat({
        id,
        userId,
        messages: allMessages,
      });
      trace('save_chat_finished', {
        saveChatMs: Date.now() - saveChatStartedAt,
      });

      const dbMessages = convertToDBMessages(allMessages, id);
      const saveMessagesStartedAt = Date.now();
      await saveMessages({ messages: dbMessages });
      trace('save_messages_finished', {
        saveMessagesMs: Date.now() - saveMessagesStartedAt,
        dbMessageCount: dbMessages.length,
      });

      const cleanupStartedAt = Date.now();
      await cleanup();
      trace('cleanup_finished', {
        cleanupMs: Date.now() - cleanupStartedAt,
      });
    }
  });

  req.signal.addEventListener('abort', async () => {
    clearTimeout(streamTimeoutId);
    trace('request_abort_event', {
      responseCompleted,
      reason: getErrorMessageText(req.signal.reason),
    });

    if (!responseCompleted) {
      console.log("Request aborted, cleaning up resources");
      try {
        const cleanupStartedAt = Date.now();
        await cleanup();
        trace('abort_cleanup_finished', {
          cleanupMs: Date.now() - cleanupStartedAt,
        });
      } catch (error) {
        console.error("Error during cleanup on abort:", error);
        trace('abort_cleanup_failed', {
          error: getErrorMessageText(error),
        });
      }
    }
  });

  trace('stream_response_created');
  result.consumeStream();
  return result.toDataStreamResponse({
    sendReasoning: true,
    headers: {
      'X-Chat-ID': id,
      'X-Trace-ID': requestId,
      'X-Selected-Model': selectedModel,
      'X-Execution-Model': executionModel,
      'X-Model-Auto-Switched': modelAutoSwitched ? '1' : '0',
    },
    getErrorMessage: (error) => {
      clearTimeout(streamTimeoutId);
      const message = getDetailedErrorMessage(error);
      trace('stream_error_message_sent', {
        error: getErrorMessageText(error),
        userMessage: message,
      });
      console.error(error);
      return message;
    },
  });
}