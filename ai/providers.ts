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
