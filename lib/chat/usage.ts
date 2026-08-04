export const USAGE_PART_TYPE = "usage";

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UsagePart extends TokenUsage {
  type: typeof USAGE_PART_TYPE;
}

type PartsLike = Array<{ type: string }> | null | undefined;

/**
 * Extract the usage part of a single message (assistant messages carry it).
 * Falls back to prompt+completion when total is missing.
 */
export function getMessageUsage(
  parts: PartsLike,
): TokenUsage | null {
  if (!parts) {
    return null;
  }
  const part = parts.find((p) => p.type === USAGE_PART_TYPE);
  if (!part) {
    return null;
  }
  const { promptTokens, completionTokens, totalTokens } =
    part as Partial<TokenUsage>;
  const prompt = typeof promptTokens === "number" ? promptTokens : 0;
  const completion =
    typeof completionTokens === "number" ? completionTokens : 0;
  const total =
    typeof totalTokens === "number"
      ? totalTokens
      : prompt + completion;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total };
}

/**
 * Aggregate usage across a whole chat. Returns null when no message has usage
 * info yet (e.g. no assistant responses have completed).
 */
export function getChatUsage(
  messages: Array<{ parts?: PartsLike }> | null | undefined,
): TokenUsage | null {
  if (!messages || messages.length === 0) {
    return null;
  }
  let promptTokens = 0;
  let completionTokens = 0;
  for (const message of messages) {
    const usage = getMessageUsage(message.parts);
    if (usage) {
      promptTokens += usage.promptTokens;
      completionTokens += usage.completionTokens;
    }
  }
  const totalTokens = promptTokens + completionTokens;
  if (totalTokens === 0) {
    return null;
  }
  return { promptTokens, completionTokens, totalTokens };
}

/** Build a serializable usage part from the stream's `usage` payload. */
export function createUsagePart(usage: {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): UsagePart {
  const promptTokens = usage.inputTokens ?? 0;
  const completionTokens = usage.outputTokens ?? 0;
  return {
    type: USAGE_PART_TYPE,
    promptTokens,
    completionTokens,
    totalTokens:
      usage.totalTokens ?? promptTokens + completionTokens,
  };
}

/**
 * Attach (or replace) a usage part on a message's parts. Keeps parts order
 * stable: replaces the existing usage part in place when present.
 */
export function addUsageToParts(
  parts: Array<{ type: string }>,
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
): Array<{ type: string }> {
  const usagePart = createUsagePart(usage);
  const existingIndex = parts.findIndex(
    (p) => p.type === USAGE_PART_TYPE,
  );
  if (existingIndex >= 0) {
    return parts.map((part, index) =>
      index === existingIndex ? { ...part, ...usagePart } : part,
    );
  }
  return [...parts, usagePart];
}

/** Compact token count: "3.4k" for thousands, raw number otherwise. */
export function formatTokenCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}
