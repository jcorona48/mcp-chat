"use server";

import { db } from "@/lib/db";
import { chats, messages, type Chat, type Message, MessageRole, type MessagePart, type DBMessage } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { generateTitle } from "@/app/actions";

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
  messages?: UIMessage[];
  title?: string;
};

export type ChatWithMessages = Chat & {
  messages: Message[];
};

export async function saveMessages({
  messages: dbMessages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    if (dbMessages.length > 0) {
      const chatId = dbMessages[0].chatId;

      // First delete any existing messages for this chat
      await db
        .delete(messages)
        .where(eq(messages.chatId, chatId));

      // Then insert the new messages
      return await db.insert(messages).values(dbMessages);
    }
    return null;
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function saveChat({ id, userId, messages: aiMessages, title }: SaveChatParams) {
  // Generate a new ID if one wasn't provided
  const chatId = id || nanoid();

  // Check if title is provided, if not generate one
  let chatTitle = title;

  // Generate title if messages are provided and no title is specified
  if (aiMessages && aiMessages.length > 0) {
    const hasEnoughMessages = aiMessages.length >= 2 &&
      aiMessages.some(m => m.role === 'user') &&
      aiMessages.some(m => m.role === 'assistant');

    if (!chatTitle || chatTitle === 'New Chat' || chatTitle === undefined) {
      if (hasEnoughMessages) {
        try {
          // Use AI to generate a meaningful title based on conversation
          chatTitle = await generateTitle(aiMessages);
        } catch (error) {
          console.error('Error generating title:', error);
          // Fallback to basic title extraction if AI title generation fails
          const firstUserMessage = aiMessages.find(m => m.role === 'user');
          if (firstUserMessage) {
            // Check for parts first (new format)
            if (firstUserMessage.parts && Array.isArray(firstUserMessage.parts)) {
              const textParts = firstUserMessage.parts.filter((p: MessagePart) => p.type === 'text' && p.text);
              if (textParts.length > 0) {
                chatTitle = textParts[0].text?.slice(0, 50) || 'New Chat';
                if ((textParts[0].text?.length || 0) > 50) {
                  chatTitle += '...';
                }
              } else {
                chatTitle = 'New Chat';
              }
            }
            // Fallback to content (old format)
            else if (typeof firstUserMessage.content === 'string') {
              chatTitle = firstUserMessage.content.slice(0, 50);
              if (firstUserMessage.content.length > 50) {
                chatTitle += '...';
              }
            } else {
              chatTitle = 'New Chat';
            }
          } else {
            chatTitle = 'New Chat';
          }
        }
      } else {
        // Not enough messages for AI title, use first message
        const firstUserMessage = aiMessages.find(m => m.role === 'user');
        if (firstUserMessage) {
          // Check for parts first (new format)
          if (firstUserMessage.parts && Array.isArray(firstUserMessage.parts)) {
            const textParts = firstUserMessage.parts.filter((p: MessagePart) => p.type === 'text' && p.text);
            if (textParts.length > 0) {
              chatTitle = textParts[0].text?.slice(0, 50) || 'New Chat';
              if ((textParts[0].text?.length || 0) > 50) {
                chatTitle += '...';
              }
            } else {
              chatTitle = 'New Chat';
            }
          }
          // Fallback to content (old format)
          else if (typeof firstUserMessage.content === 'string') {
            chatTitle = firstUserMessage.content.slice(0, 50);
            if (firstUserMessage.content.length > 50) {
              chatTitle += '...';
            }
          } else {
            chatTitle = 'New Chat';
          }
        } else {
          chatTitle = 'New Chat';
        }
      }
    }
  } else {
    chatTitle = chatTitle || 'New Chat';
  }

  // Check if chat already exists
  const existingChat = await db.query.chats.findFirst({
    where: and(
      eq(chats.id, chatId),
      eq(chats.userId, userId)
    ),
  });

  if (existingChat) {
    // Update existing chat
    await db
      .update(chats)
      .set({
        title: chatTitle,
        updatedAt: new Date()
      })
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ));
  } else {
    // Create new chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      title: chatTitle,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return { id: chatId };
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
