import { MODELS, modelDetails, type modelID } from "@/ai/providers";

function getProvider(modelId: modelID): string {
  return modelDetails[modelId]?.provider ?? "unknown";
}

export function getModelFallbackOrder(baseModel: modelID): modelID[] {
  const allModels = MODELS as modelID[];
  const rest = allModels.filter((candidate) => candidate !== baseModel);
  const baseProvider = getProvider(baseModel);

  const differentProvider = rest.filter((candidate) => getProvider(candidate) !== baseProvider);
  const sameProvider = rest.filter((candidate) => getProvider(candidate) === baseProvider);

  return [baseModel, ...differentProvider, ...sameProvider];
}

export function shouldAutoRetryWithAnotherModel(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();

  return (
    normalized.includes("rate limit") ||
    normalized.includes("rate_limit") ||
    normalized.includes("failed to call a function") ||
    normalized.includes("tool call validation failed") ||
    normalized.includes("invalid_request_error")
  );
}
