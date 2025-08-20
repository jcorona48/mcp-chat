"use server";
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';

const USER_ID_KEY = 'ai-chat-user-id';

export async function getUserId(): Promise<string> {
    'use server'
  // Only run this on the client side
  const cookieStore = await cookies();
  let userId = cookieStore.get(USER_ID_KEY)?.value || null;

  if (!userId) {
    // Generate a new user ID and store it
    userId = nanoid();
    cookieStore.set(USER_ID_KEY, userId);
  }

  return userId;
}

export async function updateUserId(newUserId: string) {
    'use server'
    const cookieStore = await cookies();
    cookieStore.set(USER_ID_KEY, newUserId);
}