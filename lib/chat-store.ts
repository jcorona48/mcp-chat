import { db } from "./db";
import { chats, messages, type Chat, type Message, MessageRole, type MessagePart, type DBMessage } from "./db/schema";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";

type AIMessage = {
  role: string;
  content?: string | any[];
  id?: string;
  parts?: MessagePart[];
};

type UIMessage = {
  id: string;
  role: string;
  content?: string;
  parts: MessagePart[];
  createdAt?: Date;
};

type SaveChatParams = {
  id?: string;
  userId: string;
  messages?: AIMessage[];
  title?: string;
};

type ChatWithMessages = Chat & {
  messages: Message[];
};

export async function saveMessages({
  messages: dbMessages,
}: {
  messages: Array<DBMessage>;
}) {
  if (dbMessages.length === 0) return null;

  try {
    return await db
      .insert(messages)
      .values(dbMessages)
      .onConflictDoUpdate({
        target: messages.id,
        set: {
          role: sql`EXCLUDED."role"`,
          parts: sql`EXCLUDED."parts"`,
          chatId: sql`EXCLUDED."chat_id"`,
        }
      });
  } catch (error) {
    console.error('Failed to save messages', error);
    throw error;
  }
}

// Function to convert AI messages to DB format
export function convertToDBMessages(aiMessages: AIMessage[], chatId: string): DBMessage[] {
  return aiMessages.map(msg => {
    // Use existing id or generate a new one
    const messageId = msg.id || nanoid();

    // If msg has parts, use them directly
    if (msg.parts) {
      return {
        id: messageId,
        chatId,
        role: msg.role,
        parts: msg.parts,
        createdAt: new Date()
      };
    }

    // Otherwise, convert content to parts
    let parts: MessagePart[];

    if (typeof msg.content === 'string') {
      parts = [{ type: 'text', text: msg.content }];
    } else if (Array.isArray(msg.content)) {
      if (msg.content.every(item => typeof item === 'object' && item !== null)) {
        // Content is already in parts-like format
        parts = msg.content as MessagePart[];
      } else {
        // Content is an array but not in parts format
        parts = [{ type: 'text', text: JSON.stringify(msg.content) }];
      }
    } else {
      // Default case
      parts = [{ type: 'text', text: String(msg.content) }];
    }

    return {
      id: messageId,
      chatId,
      role: msg.role,
      parts,
      createdAt: new Date()
    };
  });
}

// Convert DB messages to UI format
export function convertToUIMessages(dbMessages: Array<Message>): Array<UIMessage> {
  return dbMessages.map((message) => ({
    id: message.id,
    parts: message.parts as MessagePart[],
    role: message.role as string,
    content: getTextContent(message), // For backward compatibility
    createdAt: message.createdAt,
  }));
}

export async function saveChat({ id, userId, messages: aiMessages, title }: SaveChatParams) {
  const chatId = id || nanoid();
  const chatTitle = title || 'New Chat';

  const existingChat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId))
  });

  if (existingChat) {
    await db.update(chats).set({
      updatedAt: new Date()
    }).where(and(
      eq(chats.id, chatId),
      eq(chats.userId, userId)
    ));
  } else {
    await db.insert(chats).values({
      id: chatId,
      userId,
      title: chatTitle,
    });
  }
}

// Helper to get just the text content for display
export function getTextContent(message: Message): string {
  try {
    const parts = message.parts as MessagePart[];
    return parts
      .filter(part => part.type === 'text' && part.text)
      .map(part => part.text)
      .join('\n');
  } catch (e) {
    // If parsing fails, return empty string
    return '';
  }
}

export async function getChats(userId: string) {
  const chatsMessages = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: [desc(chats.updatedAt)]
  });
  return chatsMessages;
}

export async function getChatById(id: string, userId: string): Promise<ChatWithMessages | null> {
  const chat = await db.query.chats.findFirst({
    where: and(
      eq(chats.id, id),
      eq(chats.userId, userId)
    ),
  });

  if (!chat) return null;

  const chatMessages = await db.query.messages.findMany({
    where: eq(messages.chatId, id),
    orderBy: [messages.createdAt]
  });

  return {
    ...chat,
    messages: chatMessages
  };
}

export async function deleteChat(id: string, userId: string) {
  await db.delete(chats).where(
    and(
      eq(chats.id, id),
      eq(chats.userId, userId)
    )
  );
}

/**
 * Revert chat messages to a specific message index
 * Useful for "undo" functionality - removes all messages after the specified index
 * @param chatId - The chat ID
 * @param userId - The user ID (for verification)
 * @param upToMessageIndex - Keep messages up to this index (0-based), delete the rest
 */
export async function revertChatToMessage(
  chatId: string,
  userId: string,
  upToMessageIndex: number
) {
  try {
    // First, verify the chat belongs to the user
    const chat = await db.query.chats.findFirst({
      where: and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ),
    });

    if (!chat) {
      throw new Error('Chat not found or unauthorized');
    }

    // Get all messages for this chat ordered by creation
    const allMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: [messages.createdAt]
    });

    // Identify messages to delete (those after the index)
    const messagesToDelete = allMessages.slice(upToMessageIndex + 1);

    if (messagesToDelete.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Delete the messages
    const deletePromises = messagesToDelete.map(msg =>
      db.delete(messages).where(eq(messages.id, msg.id))
    );

    await Promise.all(deletePromises);

    // Update chat's updatedAt timestamp
    await db.update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId));

    return { success: true, deletedCount: messagesToDelete.length };
  } catch (error) {
    console.error('Failed to revert chat:', error);
    throw error;
  }
} 