export type KnownProviderKey =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "xai"
  | "openrouter"
  | "llm7";

export type ApiKeyMap = Record<string, string | undefined>;

export interface CustomModelDef {
  id: string;
  provider: string;
  providerModelId: string;
  label: string;
  baseURL?: string;
}

export const AI_API_KEYS_KEY = "ai-api-keys";
export const AI_CUSTOM_MODELS_KEY = "ai-custom-models";
export const AI_SYSTEM_PROMPT_KEY = "ai-system-prompt";
export const AI_PROMPT_PRESETS_KEY = "ai-prompt-presets";

export const LEGACY_API_KEYS: Record<KnownProviderKey, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  groq: "GROQ_API_KEY",
  xai: "XAI_API_KEY",
  openrouter: "OPENROUTE_API_KEY",
  llm7: "LLM7_API_KEY",
};

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  groq: "Groq",
  xai: "xAI",
  openrouter: "OpenRouter",
  llm7: "LLM7",
};

export const KNOWN_PROVIDERS: KnownProviderKey[] = [
  "openai",
  "anthropic",
  "google",
  "groq",
  "xai",
  "openrouter",
  "llm7",
];

export const KEYLESS_PROVIDERS: KnownProviderKey[] = ["llm7"];

export function isKeylessProvider(provider: string): boolean {
  return KEYLESS_PROVIDERS.includes(provider as KnownProviderKey);
}

export function providerDisplayName(provider: string): string {
  return PROVIDER_DISPLAY_NAMES[provider] ?? provider;
}

export function isCustomModelId(id: string): boolean {
  return id.startsWith("custom:");
}

export function customModelId(
  provider: string,
  providerModelId: string
): string {
  return `custom:${provider}:${providerModelId}`;
}

export function parseCustomModelId(
  id: string
): { provider: string; providerModelId: string } | null {
  const match = /^custom:([^:]+):(.*)$/.exec(id);
  if (!match) return null;
  return { provider: match[1], providerModelId: match[2] };
}
