export function hasTextPart(message: { parts?: Array<{ type?: string; text?: unknown }> }): boolean {
  return message.parts?.some((part) => part.type === 'text' && typeof part.text === 'string' && part.text.trim().length > 0) ?? false;
}

type MinimalMessage = {
  role: string;
  parts?: Array<{ type?: string; text?: unknown }>;
};

export function isEffectivelyEmptyAssistantMessage(message: MinimalMessage): boolean {
  if (message.role !== 'assistant') {
    return false;
  }

  if (!message.parts || message.parts.length === 0) {
    return true;
  }

  const hasRenderableContent = message.parts.some((part) => {
    if (part.type === 'text') {
      return typeof part.text === 'string' && part.text.trim().length > 0;
    }

    if (part.type === 'tool-invocation') {
      return true;
    }

    if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
      return true;
    }

    if (part.type === 'reasoning') {
      return true;
    }

    return false;
  });

  return !hasRenderableContent;
}

export function pruneNonRenderableAssistantMessages<T extends MinimalMessage>(messages: T[]): T[] {
  return messages.filter((message) => !isEffectivelyEmptyAssistantMessage(message));
}
