import { nanoid } from 'nanoid';
import { getCookie, setCookie } from '@/utils/cookies/client';
const USER_ID_KEY = 'ai-chat-user-id';



export function getUserId(): string {
  // Only run this on the client side
  if (typeof window === 'undefined') return '';

  let userId = getCookie(USER_ID_KEY);

  if (!userId) {
    // Generate a new user ID and store it
    userId = nanoid();
    setCookie(USER_ID_KEY, userId);
  }

  return userId;
}

export function updateUserId(newUserId: string): void {
  if (typeof window === 'undefined') return;
  setCookie(USER_ID_KEY, newUserId);
} 