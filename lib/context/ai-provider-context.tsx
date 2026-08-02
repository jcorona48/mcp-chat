"use client";

import { createContext, useContext, useEffect } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import {
  AI_API_KEYS_KEY,
  AI_CUSTOM_MODELS_KEY,
  LEGACY_API_KEYS,
  type ApiKeyMap,
  type CustomModelDef,
  type KnownProviderKey,
} from "@/lib/ai/types";

interface AiProviderContextType {
  apiKeys: ApiKeyMap;
  setApiKeys: (keys: ApiKeyMap) => void;
  customModels: CustomModelDef[];
  setCustomModels: (models: CustomModelDef[]) => void;
  addCustomModel: (model: CustomModelDef) => void;
  removeCustomModel: (id: string) => void;
  toggleCustomModel: (model: CustomModelDef, enabled: boolean) => void;
  hasCustomModel: (id: string) => boolean;
}

const AiProviderContext = createContext<AiProviderContextType | undefined>(
  undefined
);

export function AiProviderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [apiKeys, setApiKeys] = useLocalStorage<ApiKeyMap>(AI_API_KEYS_KEY, {});
  const [customModels, setCustomModels] = useLocalStorage<CustomModelDef[]>(
    AI_CUSTOM_MODELS_KEY,
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    setApiKeys((prev) => {
      let changed = false;
      const next: ApiKeyMap = { ...prev };
      for (const provider of Object.keys(LEGACY_API_KEYS) as KnownProviderKey[]) {
        if (!next[provider]) {
          const legacy = window.localStorage.getItem(LEGACY_API_KEYS[provider]);
          if (legacy) {
            next[provider] = legacy;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [setApiKeys]);

  const addCustomModel = (model: CustomModelDef) => {
    setCustomModels((prev) =>
      prev.some((m) => m.id === model.id) ? prev : [...prev, model]
    );
  };

  const removeCustomModel = (id: string) => {
    setCustomModels((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleCustomModel = (model: CustomModelDef, enabled: boolean) => {
    if (enabled) {
      addCustomModel(model);
    } else {
      removeCustomModel(model.id);
    }
  };

  const hasCustomModel = (id: string) =>
    customModels.some((m) => m.id === id);

  return (
    <AiProviderContext.Provider
      value={{
        apiKeys,
        setApiKeys,
        customModels,
        setCustomModels,
        addCustomModel,
        removeCustomModel,
        toggleCustomModel,
        hasCustomModel,
      }}
    >
      {children}
    </AiProviderContext.Provider>
  );
}

export function useAiProvider() {
  const context = useContext(AiProviderContext);
  if (context === undefined) {
    throw new Error(
      "useAiProvider must be used within an AiProviderProvider"
    );
  }
  return context;
}
