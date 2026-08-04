import type { MessagePart } from "@/lib/db/schema";

export function hasTextPart(message: { parts?: Array<{ type?: string; text?: unknown }> }): boolean {
  return message.parts?.some((part) => part.type === 'text' && typeof part.text === 'string' && part.text.trim().length > 0) ?? false;
}

type MinimalMessage = {
  role: string;
  parts?: Array<{ type?: string; text?: unknown }>;
};

export function isEffectivelyEmptyMessage(message: MinimalMessage): boolean {
  if (!message.parts || message.parts.length === 0) {
    return true;
  }

  const hasRenderableContent = message.parts.some((part) => {
    if (part.type === 'text') {
      return typeof part.text === 'string' && part.text.trim().length > 0;
    }

    if (part.type === 'file' || part.type === 'reasoning') {
      return true;
    }

    if (part.type === 'tool-invocation' || part.type === 'dynamic-tool') {
      return true;
    }

    if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
      return true;
    }

    return false;
  });

  return !hasRenderableContent;
}

// Persists only the metadata of file parts (the base64 data is used only
// during the request that sends the file) and drops empty text parts, so
// stored history stays lean and file-only messages keep just the chip.
export function sanitizePartsForStorage(parts: MessagePart[]): MessagePart[] {
  return parts.flatMap((part) => {
    if (part.type === "file") {
      return [
        {
          type: "file",
          mediaType: part.mediaType,
          filename: part.filename,
        },
      ];
    }

    if (
      part.type === "text" &&
      (typeof part.text !== "string" || part.text.trim().length === 0)
    ) {
      return [];
    }

    return [part];
  });
}

type ModelMessage = {
  role: string;
  content: unknown;
};

// Stored file parts carry no data anymore; drop them when re-sending
// history to the model so they never leak as empty data urls.
export function stripDataLessFileParts<T extends ModelMessage>(
  messages: T[],
): T[] {
  return messages.map((message) => {
    if (message.role !== "user" || !Array.isArray(message.content)) {
      return message;
    }

    return {
      ...message,
      content: (message.content as Array<Record<string, unknown>>).filter(
        (part) => !(part.type === "file" && !part.data),
      ),
    };
  }) as T[];
}
