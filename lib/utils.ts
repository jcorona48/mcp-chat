import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChatbotError, ErrorCode } from "./errors";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      let code: unknown;
      let cause: unknown;

      try {
        const body = await response.json();
        code = body?.code;
        cause = body?.cause;
      } catch {
        // Fall through to a generic error below.
      }

      if (typeof code === "string" && code.includes(":")) {
        throw new ChatbotError(code as ErrorCode, typeof cause === "string" ? cause : undefined);
      }

      throw new Error(
        `Request failed with status ${response.status}${typeof cause === "string" ? `: ${cause}` : ""}`,
      );
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatbotError('offline:chat');
    }

    throw error;
  }
}