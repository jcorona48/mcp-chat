"use server";

import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { cookies } from 'next/headers';

const USER_ID_KEY = 'ai-chat-user-id';

export async function getUserId(): Promise<string> {
  'use server'
  // Only run this on the client side
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_ID_KEY)?.value as string;

  return userId;
}

export async function updateUserId(newUserId: string) {
  'use server'
    const cookieStore = await cookies();
    cookieStore.set(USER_ID_KEY, newUserId);
}

const getApiKey = (key: string): string | undefined => {
  // Check for environment variables first
  if (process.env[key]) {
    return process.env[key] || undefined;
  }

  // Fall back to localStorage if available
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(key) || undefined;
  }

  return undefined;
};
const openrouter = createOpenRouter({
  apiKey: getApiKey('OPENROUTER_API_KEY')
});

// Helper to extract text content from a message regardless of format
function getMessageText(message: any): string {
  // Check if the message has parts (new format)
  if (message.parts && Array.isArray(message.parts)) {
    const textParts = message.parts.filter((p: any) => p.type === 'text' && p.text);
    if (textParts.length > 0) {
      return textParts.map((p: any) => p.text).join('\n');
    }
  }

  // Fallback to content (old format)
  if (typeof message.content === 'string') {
    return message.content;
  }

  // If content is an array (potentially of parts), try to extract text
  if (Array.isArray(message.content)) {
    const textItems = message.content.filter((item: any) =>
      typeof item === 'string' || (item.type === 'text' && item.text)
    );

    if (textItems.length > 0) {
      return textItems.map((item: any) =>
        typeof item === 'string' ? item : item.text
      ).join('\n');
    }
  }

  return '';
}

export async function generateTitle(messages: any[]): Promise<string> {
  try {
    // Find the first user message and use it for title generation
    const userMessage = messages.find(m => m.role === 'user');

    if (!userMessage) {
      return 'New Chat';
    }

    // Extract text content from the message
    const messageText = getMessageText(userMessage);
    if (!messageText.trim()) {
      return 'New Chat';
    }

    const { object: titleObject } = await generateObject({
      model: groq('openai/gpt-oss-20b'),
      schema: z.object({
        title: z.string().describe("A short, descriptive title for the conversation"),
      }),
      prompt: `Generate a concise title (max 6 words) for a conversation that starts with: "${messageText.slice(0, 200)}"`,
    });

    return titleObject.title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}

