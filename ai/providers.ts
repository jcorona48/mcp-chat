import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import {
  customProvider,
  type LanguageModel,
} from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import {
  LEGACY_API_KEYS,
  isCustomModelId,
  isKeylessProvider,
  parseCustomModelId,
  type ApiKeyMap,
  type CustomModelDef,
  type KnownProviderKey,
} from "@/lib/ai/types";

export interface ModelInfo {
  provider: string;
  providerKey: string;
  name: string;
  description: string;
  apiVersion: string;
  providerModelId: string;
  capabilities: string[];
}

const LLM7_BASE_URL = "https://api.llm7.io/v1";
const ANON_API_KEY = "unused";

const OPENZEN_BASE_URL = "https://opencode.ai/zen/v1";

const llm7Client = createOpenAI({
  apiKey: ANON_API_KEY,
  baseURL: LLM7_BASE_URL,
});

const languageModels = {
  "gpt-oss:20b": llm7Client("gpt-oss:20b"),
  "codestral-latest": llm7Client("codestral-latest"),
};

export const modelDetails: Record<keyof typeof languageModels, ModelInfo> = {
  "gpt-oss:20b": {
    provider: "LLM7",
    providerKey: "llm7",
    name: "GPT-OSS 20B",
    description: "OpenAI's open-weight GPT-OSS 20B, served anonymously by LLM7. Free, no API key required.",
    apiVersion: "gpt-oss:20b",
    providerModelId: "gpt-oss:20b",
    capabilities: ["Reasoning", "Agentic"]
  },
  "codestral-latest": {
    provider: "LLM7",
    providerKey: "llm7",
    name: "Codestral (latest)",
    description: "Mistral's latest Codestral, served anonymously by LLM7. Free, no API key required.",
    apiVersion: "codestral-latest",
    providerModelId: "codestral-latest",
    capabilities: ["Code", "Efficient", "Agentic"]
  },
};

export const model = customProvider({
  languageModels,
});

export type PresetModelID = keyof typeof languageModels;
export type modelID = PresetModelID | (string & {});

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "gpt-oss:20b";

const VISION_MODEL_PATTERN =
  /(vision|vl[0-9]|omni|multimodal|llava|gemini|gpt-4o|gpt-4\.1|gpt-4\.5|gpt-5|chatgpt-4o|claude-3|claude-4|phi-3-vision|qwen2-vl|qwen2\.5-vl|qwen3-vl|glm-4v|glm-4\.1v|pixtral|internvl|llama-3\.2|llama-4|minicpm|nougat|paligemma)/i;

export function modelSupportsVision(
  modelId: string,
  customModels: CustomModelDef[] = []
): boolean {
  const parsed = parseCustomModelId(modelId);
  if (parsed) {
    return VISION_MODEL_PATTERN.test(
      `${parsed.provider}/${parsed.providerModelId}`
    );
  }
  const preset = modelDetails[modelId as PresetModelID];
  if (preset) {
    return preset.capabilities.some((c) => c.toLowerCase() === "vision");
  }
  return false;
}

export function findVisionModel(
  customModels: CustomModelDef[] = []
): modelID | null {
  return (
    customModels.find((m) => modelSupportsVision(m.id, customModels))?.id ??
    null
  );
}

function getEnvApiKey(providerKey: string): string | undefined {
  const envVar = LEGACY_API_KEYS[providerKey as KnownProviderKey];
  if (envVar && process.env[envVar]) {
    return process.env[envVar];
  }
  return undefined;
}

function buildProviderModel(
  providerKey: string,
  apiKey: string,
  baseURL: string | undefined,
  providerModelId: string
): LanguageModelV3 {
  const common = {
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  };

  switch (providerKey) {
    case "openai":
      return createOpenAI(common)(providerModelId);
    case "anthropic":
      return createAnthropic(common)(providerModelId);
    case "google":
      return createGoogleGenerativeAI(common)(providerModelId);
    case "groq":
      return createGroq(common)(providerModelId);
    case "xai":
      return createOpenAI({
        apiKey,
        baseURL: "https://api.x.ai/v1",
      })(providerModelId);
    case "openrouter":
      return createOpenRouter(common)(providerModelId, {
        usage: { include: true },
      });
    case "llm7":
      return createOpenAI({
        apiKey: apiKey || ANON_API_KEY,
        baseURL: baseURL || LLM7_BASE_URL,
      })(providerModelId);
    case "openzen":
      return createOpenAI({
        apiKey,
        baseURL: baseURL || OPENZEN_BASE_URL,
      })(providerModelId);
    default:
      if (!baseURL) {
        throw new Error(
          `Custom provider "${providerKey}" requires a base URL to be configured.`
        );
      }
      return createOpenAI({ apiKey, baseURL })(providerModelId);
  }
}

function buildPresetModel(
  presetId: PresetModelID,
  info: ModelInfo,
  apiKeys: ApiKeyMap
): LanguageModel {
  const userKey = apiKeys[info.providerKey];

  if (isKeylessProvider(info.providerKey)) {
    if (!userKey) {
      return model.languageModel(presetId);
    }
    return buildProviderModel(
      info.providerKey,
      userKey,
      undefined,
      info.providerModelId
    );
  }

  const key = userKey ?? getEnvApiKey(info.providerKey);
  if (!key) {
    return model.languageModel(presetId);
  }

  return buildProviderModel(
    info.providerKey,
    key,
    undefined,
    info.providerModelId
  );
}

function buildCustomModel(
  def: CustomModelDef,
  apiKeys: ApiKeyMap
): LanguageModel {
  const keyless = isKeylessProvider(def.provider);
  const apiKey = keyless
    ? apiKeys[def.provider] || ANON_API_KEY
    : apiKeys[def.provider];
  if (!apiKey) {
    throw new Error(
      `No API key configured for provider "${def.provider}". Add one in the AI settings.`
    );
  }

  return buildProviderModel(def.provider, apiKey, def.baseURL, def.providerModelId);
}

export interface ResolveModelOptions {
  apiKeys?: ApiKeyMap;
  customModels?: CustomModelDef[];
}

export function resolveModel(
  modelId: string,
  options: ResolveModelOptions = {}
): LanguageModel {
  const { apiKeys = {}, customModels = [] } = options;

  if (isCustomModelId(modelId)) {
    const def = customModels.find((m) => m.id === modelId);
    if (def) {
      return buildCustomModel(def, apiKeys);
    }

    const parsed = parseCustomModelId(modelId);
    throw new Error(
      parsed
        ? `Model "${modelId}" is not enabled. Enable it in the AI settings.`
        : `Unknown model: ${modelId}`
    );
  }

  const presetId = modelId as PresetModelID;
  const preset = modelDetails[presetId];
  if (preset) {
    return buildPresetModel(presetId, preset, apiKeys);
  }

  throw new Error(`Unknown model: ${modelId}`);
}
