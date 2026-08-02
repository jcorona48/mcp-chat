import { NextResponse } from "next/server";
import {
  LEGACY_API_KEYS,
  isKeylessProvider,
  type KnownProviderKey,
} from "@/lib/ai/types";

const KNOWN: Record<KnownProviderKey, { baseUrl: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1" },
  anthropic: { baseUrl: "https://api.anthropic.com/v1" },
  google: { baseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  groq: { baseUrl: "https://api.groq.com/openai/v1" },
  xai: { baseUrl: "https://api.x.ai/v1" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1" },
  llm7: { baseUrl: "https://api.llm7.io/v1" },
};

const LLM7_TOOL_MODELS = new Set(["gpt-oss:20b", "codestral-latest"]);

interface DiscoveredModel {
  id: string;
  name?: string;
  tools?: boolean;
  vision?: boolean;
}

function supportsTools(id: string): boolean {
  const lower = id.toLowerCase();
  return !/(embedding|moderation|whisper|tts|dall-e|dall_e|image|audio|speech|rerank|transcri)/i.test(
    lower
  );
}

function supportsVision(id: string): boolean {
  const lower = id.toLowerCase();
  if (/(embedding|moderation|whisper|tts|dall-e|dall_e|image|audio|speech|rerank|transcri|codex)/i.test(lower)) {
    return false;
  }
  return /(vision|vl[0-9]|omni|multimodal|llava|gemini|gpt-4o|gpt-4\.1|gpt-4\.5|gpt-5|chatgpt-4o|claude-3|claude-4|phi-3-vision|qwen2-vl|qwen2\.5-vl|qwen3-vl|glm-4v|glm-4\.1v|pixtral|internvl|llama-3\.2|llama-4|minicpm|nougat|paligemma)/i.test(lower);
}

async function openAICompatible(
  baseURL: string,
  apiKey?: string
): Promise<DiscoveredModel[]> {
  const url = baseURL.replace(/\/+$/, "") + "/models";
  const response = await fetch(url, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    signal: AbortSignal.timeout(15000),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      json?.error?.message ?? `Failed to load models (HTTP ${response.status})`
    );
  }
  const data = json?.data ?? [];
  if (!Array.isArray(data)) {
    throw new Error("Unexpected response format from provider.");
  }
  return data.map((m: any) => ({
    id: m.id,
    name: m.name ?? m.display_name ?? m.id,
    tools: supportsTools(m.id),
    vision: supportsVision(m.id),
  }));
}

const LLM7_ANONYMOUS_MODELS: Record<string, string> = {
  "gpt-oss:20b": "GPT-OSS 20B",
  "codestral-latest": "Codestral (latest)",
};

async function discoverModels(opts: {
  provider: string;
  apiKey?: string;
  baseURL?: string;
}): Promise<DiscoveredModel[]> {
  const { provider, apiKey, baseURL } = opts;

  if (provider === "anthropic") {
    const response = await fetch(`${KNOWN.anthropic.baseUrl}/models?limit=100`, {
      headers: {
        "x-api-key": apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(15000),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        json?.error?.message ?? `Failed to load models (HTTP ${response.status})`
      );
    }
    return (json?.data ?? []).map((m: any) => ({
      id: m.id,
      name: m.display_name ?? m.id,
      tools: supportsTools(m.id),
      vision: supportsVision(m.id),
    }));
  }

  if (provider === "google") {
    const response = await fetch(
      `${KNOWN.google.baseUrl}/models?pageSize=200`,
      {
        headers: { "x-goog-api-key": apiKey ?? "" },
        signal: AbortSignal.timeout(15000),
      }
    );
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        json?.error?.message ?? `Failed to load models (HTTP ${response.status})`
      );
    }
    return (json?.models ?? [])
      .filter((m: any) => {
        if (!Array.isArray(m.supportedActions)) return true;
        return m.supportedActions.includes("generateContent");
      })
      .map((m: any) => ({
        id: (m.name ?? "").replace(/^models\//, "") || m.name,
        name: m.displayName ?? m.name,
        tools: supportsTools((m.name ?? "").replace(/^models\//, "")),
        vision: supportsVision((m.name ?? "").replace(/^models\//, "")),
      }));
  }

  if (provider === "llm7") {
    if (!apiKey) {
      return Object.entries(LLM7_ANONYMOUS_MODELS).map(([id, name]) => ({
        id,
        name,
        tools: LLM7_TOOL_MODELS.has(id),
        vision: supportsVision(id),
      }));
    }
    return openAICompatible(KNOWN.llm7.baseUrl, apiKey);
  }

  if (provider in KNOWN) {
    return openAICompatible(KNOWN[provider as KnownProviderKey].baseUrl, apiKey);
  }

  if (!baseURL) {
    throw new Error("A base URL is required for custom providers.");
  }
  return openAICompatible(baseURL, apiKey);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, baseURL, apiKey } = body as {
      provider?: string;
      baseURL?: string;
      apiKey?: string;
    };

    if (!provider) {
      return NextResponse.json(
        { ok: false, error: "provider is required" },
        { status: 400 }
      );
    }

    const trimmedKey = apiKey?.trim();
    const envKey =
      !trimmedKey && provider in LEGACY_API_KEYS
        ? process.env[LEGACY_API_KEYS[provider as KnownProviderKey]]
        : undefined;
    const resolvedKey = trimmedKey || envKey;

    if (!resolvedKey && !isKeylessProvider(provider)) {
      return NextResponse.json(
        { ok: false, error: "An API key is required for this provider." },
        { status: 400 }
      );
    }

    const models = await discoverModels({
      provider,
      apiKey: resolvedKey,
      baseURL,
    });

    return NextResponse.json({ ok: true, models });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message });
  }
}
