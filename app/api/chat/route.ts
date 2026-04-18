import { model, type modelID } from "@/ai/providers";
import { smoothStream, streamText, type UIMessage, convertToModelMessages, generateId, stepCountIs } from "ai";
import { saveChat, saveMessages, convertToDBMessages } from '@/lib/chat-store';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { chats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { type MCPServerConfig } from '@/lib/mcp-client';
import { mcpClientManager } from '@/lib/mcp-client-manager';
import { generateTitle } from '@/app/actions';
import { checkBotId } from "botid/server";

async function isNewChat(chatId: string | undefined, userId: string): Promise<boolean> {
  if (!chatId) return true;
  
  try {
    const existing = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId))
    });
    return !existing;
  } catch {
    return true;
  }
}

async function initializeNewChat(chatId: string, userId: string): Promise<void> {
  await saveChat({ id: chatId, userId, title: 'New Chat', messages: [] });
}

function generateTitleAsync(chatId: string, messages: UIMessage[]): void {
  const userMessage = messages.find(m => m.role === 'user');
  if (!userMessage) return;

  generateTitle([userMessage])
    .then(async (title) => {
      try {
        const result = await db.update(chats)
          .set({ title, updatedAt: new Date() })
          .where(and(
            eq(chats.id, chatId),
            eq(chats.title, 'New Chat')
          ));
        console.log(`Title updated for chat ${chatId}: ${title}`);
      } catch (error) {
        console.error("Error updating chat title:", error);
      }
    })
    .catch((error) => {
      console.error("Error generating title:", error);
    });
}

const SYSTEM_PROMPT = `
Eres un asistente especializado en la gestión de tiendas en línea creadas con Shopify. Tu objetivo es ayudar al usuario a entender, administrar y optimizar su tienda de forma sencilla, clara y segura, incluso si no tiene conocimientos técnicos.

Hoy es ${new Date().toISOString().split('T')[0]}.

Debes seguir estas reglas siempre:
1. Proporciona respuestas claras, concisas y fáciles de entender, evitando jerga técnica siempre que sea posible.
2. Si el usuario hace una pregunta técnica, responde de manera que un principiante pueda entenderlo, usando analogías o ejemplos simples.
3. Nunca asumas que el usuario tiene conocimientos previos sobre Shopify o comercio electrónico.
4. Si no sabes la respuesta a una pregunta, admítelo honestamente y ofrece buscar la información o sugerir recursos útiles.
5. Prioriza la seguridad y privacidad del usuario en todas tus respuestas y recomendaciones.
6. Intenta dar las respuestas mas cortas y directas posibles, evitando información innecesaria o redundante.
`;

export async function POST(req: Request) {
  const {
    messages,
    chatId,
    selectedModel,
    userId,
    mcpServers = [],
    reasoningEnabled = false,
  }: {
    messages: UIMessage[];
    chatId?: string;
    selectedModel: modelID;
    userId: string;
    mcpServers?: MCPServerConfig[];
    reasoningEnabled?: boolean;
  } = await req.json();

  const { isBot } = await checkBotId();

  if (isBot) {
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
  const isNewChatFlag = await isNewChat(chatId, userId);

  if (isNewChatFlag && messages.length > 0) {
    try {
      await initializeNewChat(id, userId);
      const userMessage = messages.find(m => m.role === 'user');
      if (userMessage) {
        generateTitleAsync(id, [userMessage]);
      }
    } catch (error) {
      console.error("Error saving new chat:", error);
    }
  }

  const { tools, cleanup } = await mcpClientManager.getClients(mcpServers, req.signal);
  let responseCompleted = false;

  // Limit context to last 50 messages to avoid processing entire conversation history
  // This reduces token consumption and improves response time significantly
  const MAX_CONTEXT_MESSAGES = 50;
  const contextMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  const result = streamText({
    model: model.languageModel(selectedModel),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(contextMessages),
    tools,
    stopWhen: stepCountIs(5),
    experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' }),
    onError: (error) => {
      console.error("Stream error:", JSON.stringify(error, null, 2));
    }
  });

  req.signal.addEventListener('abort', async () => {
    if (!responseCompleted) {
      try {
        await Promise.race([
          cleanup(),
          new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
        ]);
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: () => generateId(),
    sendReasoning: reasoningEnabled,
    headers: { 'X-Chat-ID': id },
    onFinish: async ({ messages, responseMessage}) => {
      responseCompleted = true;
      
      // Save chat and messages in parallel
      const dbMessages = convertToDBMessages(messages, id);
      
      await Promise.all([
        saveChat({
          id,
          userId,
          messages,
        }),
        dbMessages.length > 0 
          ? saveMessages({ messages: dbMessages })
          : Promise.resolve()
      ]);

      // Cleanup in background without awaiting to avoid blocking response
      cleanup().catch(error => console.error("Background cleanup error:", error));
    },
    onError: (error) => {
      if (error instanceof Error) {
        if (error.message.includes("Rate limit")) {
          return "Rate limit exceeded. Please try again later.";
        }
      }
      console.error(error);
      return "An error occurred.";
    },
  });
}