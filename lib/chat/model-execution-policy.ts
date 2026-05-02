import type { modelID } from "@/ai/providers";

interface PolicyContext {
  userId: string;
  chatId?: string;
  selectedModel: modelID;
  hasTools: boolean;
}

interface ModelFailureState {
  consecutiveToolFailures: number;
  updatedAt: number;
}

interface ModelDecision {
  executionModel: modelID;
  autoSwitched: boolean;
}

const TOOL_UNSTABLE_MODEL: modelID = "llama4";
const TOOL_STABLE_FALLBACK_MODEL: modelID = "qwen3-32b";
const FAILURE_THRESHOLD_FOR_SWITCH = 2;
const FAILURE_WINDOW_MS = 1000 * 60 * 30;

const modelFailureByKey = new Map<string, ModelFailureState>();

function getPolicyKey(context: PolicyContext): string {
  return `${context.userId}:${context.chatId ?? "new-chat"}:${context.selectedModel}`;
}

function getCurrentState(key: string): ModelFailureState {
  const now = Date.now();
  const current = modelFailureByKey.get(key);

  if (!current) {
    return {
      consecutiveToolFailures: 0,
      updatedAt: now,
    };
  }

  // Expire stale state so old failures don't force future switches.
  if (now - current.updatedAt > FAILURE_WINDOW_MS) {
    return {
      consecutiveToolFailures: 0,
      updatedAt: now,
    };
  }

  return current;
}

export function decideExecutionModel(context: PolicyContext): ModelDecision {
  if (!context.hasTools || context.selectedModel !== TOOL_UNSTABLE_MODEL) {
    return {
      executionModel: context.selectedModel,
      autoSwitched: false,
    };
  }

  const key = getPolicyKey(context);
  const state = getCurrentState(key);

  if (state.consecutiveToolFailures >= FAILURE_THRESHOLD_FOR_SWITCH) {
    // Do one safe turn with fallback and then re-probe original model next turn.
    modelFailureByKey.set(key, {
      consecutiveToolFailures: FAILURE_THRESHOLD_FOR_SWITCH - 1,
      updatedAt: Date.now(),
    });

    return {
      executionModel: TOOL_STABLE_FALLBACK_MODEL,
      autoSwitched: true,
    };
  }

  return {
    executionModel: context.selectedModel,
    autoSwitched: false,
  };
}

export function registerToolCallingFailure(context: PolicyContext) {
  if (!context.hasTools || context.selectedModel !== TOOL_UNSTABLE_MODEL) {
    return;
  }

  const key = getPolicyKey(context);
  const state = getCurrentState(key);

  modelFailureByKey.set(key, {
    consecutiveToolFailures: state.consecutiveToolFailures + 1,
    updatedAt: Date.now(),
  });
}

export function registerSuccessfulTurn(context: PolicyContext) {
  if (!context.hasTools || context.selectedModel !== TOOL_UNSTABLE_MODEL) {
    return;
  }

  const key = getPolicyKey(context);

  modelFailureByKey.set(key, {
    consecutiveToolFailures: 0,
    updatedAt: Date.now(),
  });
}
