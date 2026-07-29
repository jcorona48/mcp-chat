import { createGroq } from "@ai-sdk/groq";
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
  if (typeof window !== 'undefined' && window.localStorage.getItem(key)) {
    return window.localStorage.getItem(key) || undefined;
  }
  
  if (process.env[key]) {
    return process.env[key] || undefined;
  }

  return undefined;
};

const groqClient = createGroq({
  apiKey: getApiKey('GROQ_API_KEY'),
});

const openRouterClient = createOpenRouter({
  apiKey: getApiKey('OPENROUTE_API_KEY'),
});

const languageModels = {
  "qwen3-32b": wrapLanguageModel(
    {
      model: groqClient('qwen/qwen3-32b'),
      middleware
    }
  ),
  "tencent/hy3": openRouterClient('tencent/hy3', {
    usage: {
      include: true
    },
  }),
  "tencent/hy3-preview": openRouterClient('tencent/hy3-preview', {
    usage: {
      include: true
    },
  }),
  "inclusionai/ling-2.6-1t": openRouterClient('inclusionai/ling-2.6-1t', {
    usage: {
      include: true
    },
  }),
  "inclusionai/ling-2.6-flash": openRouterClient('inclusionai/ling-2.6-flash', {
    usage: {
      include: true
    },
  }),
  "inclusionai/ling-3.0-flash:free": openRouterClient('inclusionai/ling-3.0-flash:free', {
    usage: {
      include: true
    },
  }),
  "google/gemma-4-26b-a4b-it:free": openRouterClient('google/gemma-4-26b-a4b-it:free', {
    usage: {
      include: true
    },
  }),
  "nvidia/nemotron-3-super-120b-a12b:free": openRouterClient('nvidia/nemotron-3-super-120b-a12b:free', {
    usage: {
      include: true
     },
   }),
};

export const modelDetails: Record<keyof typeof languageModels, ModelInfo> = {
  "tencent/hy3": {
    provider: "OpenRouter",
    name: "Tencent HY3",
    description: "Tencent's latest HY3 model with strong reasoning and coding capabilities.",
    apiVersion: "tencent/hy3",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "inclusionai/ling-2.6-1t": {
    provider: "OpenRouter",
    name: "Inclusion AI Ling 2.6 1T",
    description: "Inclusion AI's Ling 2.6 1T model with strong reasoning and coding capabilities.",
    apiVersion: "inclusionai/ling-2.6-1t",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "tencent/hy3-preview": {
    provider: "OpenRouter",
    name: "Tencent HY3 Preview",
    description: "Preview version of Tencent's HY3 model with strong reasoning and coding capabilities.",
    apiVersion: "tencent/hy3-preview",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "inclusionai/ling-2.6-flash": {
    provider: "OpenRouter",
    name: "Inclusion AI Ling 2.6 Flash",
    description: "Inclusion AI's Ling 2.6 Flash model with strong reasoning and coding capabilities.",
    apiVersion: "inclusionai/ling-2.6-flash",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "google/gemma-4-26b-a4b-it:free": {
    provider: "OpenRouter",
    name: "Google Gemma 4",
    description: "Google's latest Gemma 4 model with strong reasoning and coding capabilities.",
    apiVersion: "google/gemma-4-26b-a4b-it:free",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "qwen3-32b": {
    provider: "Groq",
    name: "Qwen 3 32B",
    description: "Latest version of Alibaba's Qwen 32B with strong reasoning and coding capabilities.",
    apiVersion: "qwen3-32b",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
  "inclusionai/ling-3.0-flash:free": {
    provider: "OpenRouter",
    name: "Ling 3.0 Flash",
    description: "Preview version of Inclusion AI's Ling 3.0 Flash with good balance of capabilities.",
    apiVersion: "inclusionai/ling-3.0-flash:free",
    capabilities: ["Balanced", "Efficient", "Agentic"]
  },
  "nvidia/nemotron-3-super-120b-a12b:free": {
    provider: "OpenRouter",
    name: "NVIDIA NeMoTron 3",
    description: "NVIDIA's latest NeMoTron 3 Super model with strong reasoning and coding capabilities.",
    apiVersion: "nvidia/nemotron-3-super-120b-a12b:free",
    capabilities: ["Reasoning", "Efficient", "Agentic"]
  },
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

export const defaultModel: modelID = "inclusionai/ling-3.0-flash:free";
