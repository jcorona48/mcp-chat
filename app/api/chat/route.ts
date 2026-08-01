import { model, type modelID } from "@/ai/providers";
import { generateTitle } from "@/app/actions";
import { createTraceLogger } from "@/lib/chat-debug";
import {
  saveChat,
  saveMessage,
  updateMessage
} from "@/lib/chat-store";
import {
  getDetailedErrorMessage,
  getErrorMessageText,
} from "@/lib/chat/error-utils";
import { decideExecutionModel } from "@/lib/chat/model-execution-policy";
import { db } from "@/lib/db";
import { chats, MessagePart } from "@/lib/db/schema";
import { initializeMCPClients, type MCPServerConfig } from "@/lib/mcp-client";
// AI config tools: proposes MCP server configs for the user to apply in the UI (remove to disable).
import { createAiConfigTools } from "@/lib/chat/ai-config-tools";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  NoSuchToolError,
  Output,
  smoothStream,
  stepCountIs,
  streamText,
    type ToolSet,
  UIMessage
} from "ai";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { checkBotId } from "botid/server";

const STREAM_TIMEOUT_MS = 60000;
const MCP_INIT_TIMEOUT_MS = 7000;
const STEP_COUNT_LIMIT = 3;

function getFastChatTitle(userMessage?: UIMessage): string {
    if (!userMessage) {
        return "New Chat";
    }

    const text = (userMessage.parts ?? [])
        .filter((part) => part.type === "text")
        .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
        .filter((value) => value.length > 0)
        .join(" ")
        .trim();

    if (!text) {
        return "New Chat";
    }

    return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

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

        signal.addEventListener("abort", () => abort(signal.reason), {
            once: true,
        });
    }

    return controller.signal;
}

function summarizeUnknownPayload(payload: unknown): {
    type: string;
    sizeBytes: number;
} {
    try {
        const serialized = JSON.stringify(payload);
        if (typeof serialized !== "string") {
            return { type: typeof payload, sizeBytes: 0 };
        }

        return {
            type: Array.isArray(payload) ? "array" : typeof payload,
            sizeBytes: Buffer.byteLength(serialized, "utf8"),
        };
    } catch {
        return {
            type: Array.isArray(payload) ? "array" : typeof payload,
            sizeBytes: 0,
        };
    }
}

function withToolExecutionMetrics<TTools extends ToolSet>(
    tools: TTools,
    trace: ReturnType<typeof createTraceLogger>,
): TTools {
    const instrumentedTools: ToolSet = {};

    for (const [toolName, toolDefinition] of Object.entries(tools)) {
        if (!toolDefinition || typeof toolDefinition !== "object") {
            instrumentedTools[toolName] = toolDefinition as ToolSet[string];
            continue;
        }

        const candidate = toolDefinition as {
            execute?: (...args: unknown[]) => Promise<unknown> | unknown;
        };

        if (typeof candidate.execute !== "function") {
            instrumentedTools[toolName] = toolDefinition as ToolSet[string];
            continue;
        }

        instrumentedTools[toolName] = {
            ...(toolDefinition as Record<string, unknown>),
            execute: async (...args: unknown[]) => {
                const startedAt = Date.now();
                const inputSummary = summarizeUnknownPayload(args[0]);

                trace("tool_execute_started", {
                    toolName,
                    inputType: inputSummary.type,
                    inputSizeBytes: inputSummary.sizeBytes,
                });

                try {
                    const result = await candidate.execute?.(...args);
                    const outputSummary = summarizeUnknownPayload(result);

                    trace("tool_execute_finished", {
                        toolName,
                        durationMs: Date.now() - startedAt,
                        outputType: outputSummary.type,
                        outputSizeBytes: outputSummary.sizeBytes,
                    });

                    return result;
                } catch (error) {
                    trace("tool_execute_failed", {
                        toolName,
                        durationMs: Date.now() - startedAt,
                        error: getErrorMessageText(error),
                    });
                    throw error;
                }
            },
        } as ToolSet[string];
    }

    return instrumentedTools as TTools;
}

export async function POST(req: Request) {
    const requestId = nanoid(10);
    const trace = createTraceLogger("chat-api", requestId);

    trace("request_started");

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
    const userMessage = messages.findLast((m) => m.role === "user");

    try {
        trace("request_parsed", {
            parseMs: Date.now() - parseStartedAt,
            messageCount: messages?.length ?? 0,
            selectedModel,
            mcpServerCount: mcpServers?.length ?? 0,
            hasChatId: Boolean(chatId),
        });

        const botCheckStartedAt = Date.now();
        const { isBot, isVerifiedBot } = await checkBotId();
        trace("bot_check_finished", {
            botCheckMs: Date.now() - botCheckStartedAt,
            isBot,
            isVerifiedBot,
        });

        if (isBot && !isVerifiedBot) {
            return new Response(
                JSON.stringify({
                    error: "Bot is not allowed to access this endpoint",
                }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        if (!userId) {
            return new Response(
                JSON.stringify({ error: "User ID is required" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const id = chatId || nanoid();
        trace("chat_id_resolved", { resolvedChatId: id });

        let isNewChat = false;
        if (chatId) {
            try {
                const existingChatStartedAt = Date.now();
                const existingChat = await db.query.chats.findFirst({
                    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
                });
                trace("existing_chat_lookup_finished", {
                    existingChatLookupMs: Date.now() - existingChatStartedAt,
                    foundExistingChat: Boolean(existingChat),
                });
                isNewChat = !existingChat;
            } catch (error) {
                console.error("Error checking for existing chat:", error);
                trace("existing_chat_lookup_failed", {
                    error: getErrorMessageText(error),
                });
                isNewChat = true;
            }
        } else {
            isNewChat = true;
        }

        if (isNewChat && messages.length > 0) {
            try {
                const title = getFastChatTitle(userMessage);

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

        await saveMessage({
            id: userMessage?.id ?? nanoid(),
            chatId: id,
            role: userMessage?.role ?? "user",
            parts: (userMessage?.parts as MessagePart[]) ?? [
                { type: "text", text: "" },
            ],
            createdAt: new Date(),
        });

        const timeoutController = new AbortController();
        const streamTimeoutId = setTimeout(() => {
            trace("stream_timeout_triggered", { timeoutMs: STREAM_TIMEOUT_MS });
            timeoutController.abort(
                new Error(`Stream timed out after ${STREAM_TIMEOUT_MS}ms`),
            );
        }, STREAM_TIMEOUT_MS);

        const combinedSignal = combineAbortSignals([
            req.signal,
            timeoutController.signal,
        ]);

        const mcpInitStartedAt = Date.now();
        const { tools, cleanup } = await initializeMCPClients(
            mcpServers,
            combinedSignal,
            MCP_INIT_TIMEOUT_MS,
        );
        const hasTools = Object.keys(tools).length > 0;
        const modelDecision = decideExecutionModel({
            userId,
            chatId: id,
            selectedModel,
            hasTools,
        });

        const executionModel = modelDecision.executionModel;
        const modelAutoSwitched = modelDecision.autoSwitched;
        const instrumentedTools = withToolExecutionMetrics(
            { ...tools, ...createAiConfigTools(mcpServers) },
            trace,
        );

        trace("mcp_init_finished", {
            mcpInitMs: Date.now() - mcpInitStartedAt,
            discoveredToolCount: Object.keys(tools).length,
            selectedModel,
            executionModel,
            modelAutoSwitched,
        });

        let responseCompleted = false;
        let lastErrorMessageForUser: string | null = null;
        let sawToolCallingFailure = false;
        trace("stream_setup_started", { maxSteps: 20 });

        const modelMessages = await convertToModelMessages(messages);

        const activeServersContext =
            mcpServers.length > 0
                ? `\n\nCurrently active MCP servers:\n${mcpServers
                      .map((s) => `- ${s.name ?? s.url} (${s.type}): ${s.url}`)
                      .join("\n")}`
                : "";

        const stream = createUIMessageStream({
            originalMessages: messages,
            execute: async ({ writer: dataStream }) => {
                const modelStreamStartedAt = Date.now();
                let firstChunkCaptured = false;

                const result = streamText({
                    model: model.languageModel(executionModel),
                    abortSignal: combinedSignal,
                    system: `You are a helpful assistant with access to a variety of tools.

    Today's date is ${new Date().toISOString()}.

    The tools are very powerful, and you can use them to answer the user's question.
    So choose the tool that is most relevant to the user's question.

    If tools are not available, say you don't know or if the user wants a tool they can add one from the server icon in bottom left corner in the sidebar.

    If the user asks to add, connect, set up, or UPDATE an MCP server, use the addMcpServer tool to propose the configuration. The proposal is a PROPOSAL ONLY: it is NOT applied and the server is NOT connected until the user clicks Apply in the chat. After proposing, summarize the config and STOP: do not assume the server is active and do not try to use its tools in the current turn, they are not available yet. If a server with the same name or URL already exists, the tool result marks it as an update so the user can apply the changes in one click, but you must still wait for the user to apply it.${activeServersContext}

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
                    messages: modelMessages,
                    tools: instrumentedTools,
                    timeout: STREAM_TIMEOUT_MS,
                    stopWhen: stepCountIs(STEP_COUNT_LIMIT),
                    maxRetries: 2,
                    ...(Object.keys(instrumentedTools).length > 0 && { toolChoice: "auto" }),
                    providerOptions: {
                        google: {
                            thinkingConfig: {
                                thinkingBudget: 2048,
                            },
                        },
                        anthropic: {
                            thinking: {
                                type: "enabled",
                                budgetTokens: 12000,
                            },
                        },
                    },
                    experimental_transform: smoothStream({
                        delayInMs: 5,
                        chunking: "line",
                    }),
                    onChunk: ({ chunk }) => {
                        if (firstChunkCaptured) {
                            return;
                        }

                        firstChunkCaptured = true;
                        trace("stream_first_chunk", {
                            firstChunkMs: Date.now() - modelStreamStartedAt,
                            chunkType:
                                chunk && typeof chunk === "object" && "type" in chunk
                                    ? String((chunk as { type?: unknown }).type ?? "unknown")
                                    : typeof chunk,
                        });
                    },
                    experimental_repairToolCall: async ({
                        toolCall,
                        tools,
                        inputSchema,
                        error,
                    }) => {
                        if (NoSuchToolError.isInstance(error)) {
                            return null;
                        }

                        const tool =
                            tools[toolCall.toolName as keyof typeof tools];

                        const { output: repairedArgs } = await streamText({
                            model: model.languageModel(executionModel),
                            output: Output.object({ schema: tool.inputSchema }),
                            prompt: [
                                `The model tried to call the tool "${toolCall.toolName}"` +
                                    ` with the following inputs:`,
                                JSON.stringify(toolCall.input),
                                `The tool accepts the following schema:`,
                                JSON.stringify(inputSchema(toolCall)),
                                "Please fix the inputs.",
                            ].join("\n"),
                        });

                        return {
                            ...toolCall,
                            input: JSON.stringify(repairedArgs),
                        };
                    },
                    onError: (error) => {
                        const rawErrorMessage =
                            getErrorMessageText(error) ?? "";
                        const rawLower = rawErrorMessage.toLowerCase();

                        sawToolCallingFailure =
                            rawLower.includes("tool call validation failed") ||
                            rawLower.includes("invalid_request_error");

                        const detailed = getDetailedErrorMessage(error);
                        const shouldRecommendSwitch =
                            selectedModel === "inclusionai/ling-2.6-flash" &&
                            hasTools &&
                            !modelAutoSwitched &&
                            sawToolCallingFailure;

                        lastErrorMessageForUser = shouldRecommendSwitch
                            ? `${detailed}\n\nSugerencia: cambia el modelo a qwen3-32b para una mayor estabilidad cuando uses tools.`
                            : detailed;

                        trace("stream_on_error", {
                            error: rawErrorMessage,
                            sawToolCallingFailure,
                            shouldRecommendSwitch,
                        });
                        console.error(JSON.stringify(error, null, 2));
                    },
                    async onFinish({ response, usage }) {
                        responseCompleted = true;
                        clearTimeout(streamTimeoutId);
                        trace("stream_on_finish", {
                            response,
                            usage,
                        });
                        const cleanupStartedAt = Date.now();
                        await cleanup();
                        trace("cleanup_finished", {
                            cleanupMs: Date.now() - cleanupStartedAt,
                        });
                    },
                });

                dataStream.merge(
                    result.toUIMessageStream({
                        sendReasoning: true,
                        onError: (error) => {
                            const message = getErrorMessageText(error) ?? "";
                            trace("merged_stream_error", {
                                error: message,
                            });
                            return message || "An error occurred while streaming the response.";
                        },
                    }),
                );
            },
            generateId: () => nanoid(),
            onFinish: async ({ messages: finishedMessage }) => {
                for (const message of finishedMessage) {
                    const existingMessage = messages.find(
                        (m) => m.id === message.id,
                    );
                    if (existingMessage) {
                        await updateMessage({
                            id: message.id,
                            parts: message.parts as MessagePart[],
                        });
                    } else {
                        await saveMessage({
                            id: message.id,
                            chatId: id,
                            role: message.role,
                            parts: message.parts as MessagePart[],
                            createdAt: new Date(),
                        });
                    }
                }

                if (isNewChat) {
                    trace("chat_title_summarize_started");
                    void (async () => {
                        try {
                            const summarizedTitle = await generateTitle(finishedMessage);
                            await saveChat({
                                id,
                                userId,
                                title: summarizedTitle,
                            });
                            trace("chat_title_summarized", {
                                title: summarizedTitle,
                            });
                        } catch (error) {
                            trace("chat_title_summarize_failed", {
                                error: getErrorMessageText(error),
                            });
                        }
                    })();
                }
            },
            onError: (error) => {
                const message = getErrorMessageText(error) ?? "";
                trace("ui_message_stream_error", {
                    error: message,
                });
                console.error("UI Message Stream Error:", error);
                return (
                    lastErrorMessageForUser ??
                    "An error occurred while generating the response."
                );
            },
        });

        req.signal.addEventListener("abort", async () => {
            clearTimeout(streamTimeoutId);
            trace("request_abort_event", {
                responseCompleted,
                reason: getErrorMessageText(req.signal.reason),
            });

            if (!responseCompleted) {
                console.log("Request aborted, cleaning up resources");
                try {
                    const cleanupStartedAt = Date.now();
                    await cleanup();
                    trace("abort_cleanup_finished", {
                        cleanupMs: Date.now() - cleanupStartedAt,
                    });
                } catch (error) {
                    console.error("Error during cleanup on abort:", error);
                    trace("abort_cleanup_failed", {
                        error: getErrorMessageText(error),
                    });
                }
            }
        });

        trace("stream_response_created");

        return createUIMessageStreamResponse({
            stream,
            headers: {
                "X-Chat-ID": id,
                "X-Trace-ID": requestId,
                "X-Selected-Model": selectedModel,
                "X-Execution-Model": executionModel,
                "X-Model-Auto-Switched": modelAutoSwitched ? "1" : "0",
            },
        });
    } catch (error) {
        const message = getErrorMessageText(error) ?? "";
        trace("request_error", {
            error: message,
        });
        console.error("Request Error:", error);
        return new Response(
            JSON.stringify({
                error: "An error occurred while processing the request.",
                details: message,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
}
