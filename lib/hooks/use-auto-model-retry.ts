import { useCallback, useRef } from "react";
import type { modelID } from "@/ai/providers";
import { getModelFallbackOrder, shouldAutoRetryWithAnotherModel } from "@/lib/chat/model-fallback-order";

type ReloadFn = () => void | Promise<unknown>;

type RetryState = {
  active: boolean;
  baseModel: modelID | null;
  chain: modelID[];
  attempted: Set<modelID>;
};

export function useAutoModelRetry(options: {
  setSelectedModel: (model: modelID) => void;
  reload: ReloadFn;
}) {
  const { setSelectedModel, reload } = options;

  const retryStateRef = useRef<RetryState>({
    active: false,
    baseModel: null,
    chain: [],
    attempted: new Set<modelID>(),
  });

  const beginRetryCycle = useCallback((baseModel: modelID) => {
    retryStateRef.current = {
      active: true,
      baseModel,
      chain: getModelFallbackOrder(baseModel),
      attempted: new Set<modelID>([baseModel]),
    };
  }, []);

  const resetRetryCycle = useCallback(() => {
    retryStateRef.current = {
      active: false,
      baseModel: null,
      chain: [],
      attempted: new Set<modelID>(),
    };
  }, []);

  const tryAutoRetry = useCallback(async (errorMessage: string) => {
    const state = retryStateRef.current;

    if (!state.active || !shouldAutoRetryWithAnotherModel(errorMessage)) {
      return { handled: false as const, exhausted: false as const, nextModel: null as modelID | null };
    }

    const nextModel = state.chain.find((candidate) => !state.attempted.has(candidate)) ?? null;

    if (!nextModel) {
      return { handled: false as const, exhausted: true as const, nextModel: null as modelID | null };
    }

    state.attempted.add(nextModel);
    setSelectedModel(nextModel);

    // Wait one tick so useChat picks up updated body selectedModel before reload.
    await new Promise((resolve) => setTimeout(resolve, 60));
    await reload();

    return { handled: true as const, exhausted: false as const, nextModel };
  }, [reload, setSelectedModel]);

  return {
    beginRetryCycle,
    resetRetryCycle,
    tryAutoRetry,
  };
}
