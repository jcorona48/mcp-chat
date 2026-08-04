import type { ApiKeyMap, CustomModelDef } from "@/lib/ai/types";
import {
  AI_API_KEYS_KEY,
  AI_CUSTOM_MODELS_KEY,
  AI_SYSTEM_PROMPT_KEY,
  AI_PROMPT_PRESETS_KEY,
} from "@/lib/ai/types";
import type { MCPServer } from "@/lib/context/mcp-context";

export const CONFIG_BACKUP_VERSION = 1;

export interface ConfigBackup {
  version: number;
  exportedAt: string;
  apiKeys?: ApiKeyMap;
  customModels?: CustomModelDef[];
  systemPrompt?: string;
  mcpServers?: MCPServer[];
  selectedMcpServers?: string[];
  promptPresets?: string[];
  favoriteModels?: string[];
  recentModels?: string[];
  accentHue?: number;
  selectedModel?: string;
}

const STORAGE_KEYS = {
  apiKeys: AI_API_KEYS_KEY,
  customModels: AI_CUSTOM_MODELS_KEY,
  systemPrompt: AI_SYSTEM_PROMPT_KEY,
  promptPresets: AI_PROMPT_PRESETS_KEY,
  mcpServers: "mcp-servers",
  selectedMcpServers: "selected-mcp-servers",
  accentHue: "accent-hue",
  favoriteModels: "favorite-models",
  recentModels: "recent-models",
  selectedModel: "selectedModel",
} as const;

type BackupField = keyof typeof STORAGE_KEYS;

const FIELDS = Object.keys(STORAGE_KEYS) as BackupField[];

function readStoredValue<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function buildConfigBackup(includeApiKeys: boolean): ConfigBackup {
  const backup: ConfigBackup = {
    version: CONFIG_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
  };

  for (const field of FIELDS) {
    if (field === "apiKeys" && !includeApiKeys) continue;
    const value = readStoredValue<unknown>(STORAGE_KEYS[field]);
    if (value !== undefined) {
      backup[field] = value as never;
    }
  }

  return backup;
}

export function parseConfigBackup(raw: string): ConfigBackup | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!data || typeof data !== "object") return null;
  const candidate = data as ConfigBackup;
  if (typeof candidate.version !== "number") return null;

  const hasAnyField = FIELDS.some(
    (field) => candidate[field] !== undefined,
  );
  if (!hasAnyField) return null;

  return candidate;
}

export function applyConfigBackup(backup: ConfigBackup): void {
  if (typeof window === "undefined") return;
  for (const field of FIELDS) {
    const value = backup[field];
    if (value !== undefined) {
      window.localStorage.setItem(STORAGE_KEYS[field], JSON.stringify(value));
    }
  }
}
