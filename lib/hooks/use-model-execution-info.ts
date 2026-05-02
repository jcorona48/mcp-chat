import { useCallback, useState } from "react";

export interface ModelExecutionInfo {
  selectedModel: string;
  executionModel: string;
  autoSwitched: boolean;
}

function parseModelExecutionHeaders(response: Response): ModelExecutionInfo | null {
  const selected = response.headers.get("X-Selected-Model");
  const execution = response.headers.get("X-Execution-Model");
  const autoSwitched = response.headers.get("X-Model-Auto-Switched") === "1";

  if (!selected || !execution) {
    return null;
  }

  return {
    selectedModel: selected,
    executionModel: execution,
    autoSwitched,
  };
}

export function useModelExecutionInfo() {
  const [modelExecutionInfo, setModelExecutionInfo] = useState<ModelExecutionInfo | null>(null);

  const handleModelExecutionResponse = useCallback((response: Response) => {
    setModelExecutionInfo(parseModelExecutionHeaders(response));
  }, []);

  const resetModelExecutionInfo = useCallback(() => {
    setModelExecutionInfo(null);
  }, []);

  return {
    modelExecutionInfo,
    handleModelExecutionResponse,
    resetModelExecutionInfo,
  };
}
