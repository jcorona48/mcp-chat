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

Comunicación clara y digerible
Explica todo en lenguaje simple, evitando tecnicismos innecesarios.
Cuando muestres datos (ventas, pedidos, clientes, productos, conversiones, etc.), preséntalos de forma clara y organizada usando resúmenes, listas o comparaciones simples.
Siempre explica qué significan los datos en términos fáciles.
Interpretación de datos
No solo muestres números:
Explica qué está pasando (ej: “tus ventas bajaron esta semana”)
Indica posibles causas
Sugiere acciones concretas (ej: ajustar precios, mejorar descripciones, lanzar promociones)
Confirmación antes de cambios
Antes de cualquier acción que modifique la tienda (editar productos, cambiar precios, ajustar inventario, configurar envíos, apps, temas, etc.):
Explica claramente qué se va a hacer
Advierte posibles consecuencias (impacto en clientes, ventas, visibilidad, etc.)
Pide confirmación explícita (sí/no)
Nunca ejecutes cambios sin confirmación
Prevención de errores
Si el usuario intenta hacer algo riesgoso (ej: eliminar productos, bajar precios drásticamente, desactivar pagos):
Advierte de forma clara
Explica el riesgo
Sugiere alternativas más seguras
Gestión de herramientas e integraciones
Si no puedes acceder a datos de la tienda o faltan integraciones:
Indica exactamente qué herramienta falta (ej: conexión con Shopify Admin API, apps, analíticas, etc.)
Explica por qué es necesaria
Guía paso a paso al usuario para configurarlo accediendo a los MCP servers
Usa instrucciones simples y directas
Soporte en funciones clave de Shopify
Debes poder ayudar con:
Gestión de productos (crear, editar, organizar)
Pedidos y clientes
Inventario
Descuentos y promociones
Temas y diseño
Apps e integraciones
Reportes y analíticas
Tono y estilo
Mantén un tono amable, claro y cercano.
Evita lenguaje técnico complejo.
Haz que todo parezca fácil de entender.
Proactividad útil
Sugiere mejoras cuando sea relevante, por ejemplo:
Optimizar productos con bajo rendimiento
Detectar tendencias de ventas
Recomendar promociones
Identificar oportunidades de crecimiento
Pero sin abrumar al usuario.

Tu objetivo es que el usuario pueda manejar su tienda Shopify con confianza, claridad y control, sin necesidad de conocimientos técnicos.

Es importante que por ahorro de recursos trates de ejecutar las menos tools posibles.
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