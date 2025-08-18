import { createGroq } from "@ai-sdk/groq";
import { createXai } from "@ai-sdk/xai";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';


import {
  customProvider,
  wrapLanguageModel,
  extractReasoningMiddleware
} from "ai";

export interface ModelInfo {
  provider: string;
  name: string;
  description: string;
  apiVersion: string;
  capabilities: string[];
}

const middleware = extractReasoningMiddleware({
  tagName: 'think',
});

// Helper to get API keys from environment variables first, then localStorage
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

const groqClient = createGroq({
  apiKey: getApiKey('GROQ_API_KEY'),
});

const xaiClient = createXai({
  apiKey: getApiKey('XAI_API_KEY'),
});

const openRouteClient = createOpenRouter({
  apiKey: getApiKey('OPENROUTE_API_KEY'),
})

const languageModels = {
  "qwen3-32b": wrapLanguageModel(
    {
      model: groqClient('qwen/qwen3-32b'),
      middleware
    }
  ),
  "kimi-k2": groqClient('moonshotai/kimi-k2-instruct'),
  "llama4": groqClient('meta-llama/llama-4-scout-17b-16e-instruct'),
  "gpt-oss-20b": openRouteClient("openai/gpt-oss-20b:free"),
  "glm-4.5-air": openRouteClient("z-ai/glm-4.5-air:free")
};

export const modelDetails: Record<keyof typeof languageModels, ModelInfo> = {
  "kimi-k2": {
    provider: "Groq",
    name: "Kimi K2",
    description: "Latest version of Moonshot AI's Kimi K2 with good balance of capabilities.",
    apiVersion: "kimi-k2-instruct",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  "qwen3-32b": {
    provider: "Groq",
    name: "Qwen 3 32B",
    description: "Latest version of Alibaba's Qwen 32B with strong reasoning and coding capabilities.",
    apiVersion: "qwen3-32b",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "llama4": {
    provider: "Groq",
    name: "Llama 4",
    description: "Latest version of Meta's Llama 4 with good balance of capabilities.",
    apiVersion: "llama-4-scout-17b-16e-instruct",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  'gpt-oss-20b': {
    provider: "OpenAI",
    name: "GPT-OSS 20B",
    description: "Latest version of OpenAI's GPT-OSS 20B with strong reasoning and coding capabilities.",
    apiVersion: "openai/gpt-oss-20b:free",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  'glm-4.5-air': {
    provider: "Z-AI",
    name: "GLM 4.5 Air",
    description: "Latest version of Z-AI's GLM 4.5 Air with strong reasoning and coding capabilities.",
    apiVersion: "z-ai/glm-4.5-air:free",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  }
};

// Update API keys when localStorage changes (for runtime updates)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // Reload the page if any API key changed to refresh the providers
    if (event.key?.includes('API_KEY')) {
      window.location.reload();
    }
  });
}

export const model = customProvider({
  languageModels,
});

export type modelID = keyof typeof languageModels;

export const MODELS = Object.keys(languageModels);

export const defaultModel: modelID = "glm-4.5-air";
