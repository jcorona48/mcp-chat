import { routing } from "@/i18n/routing";

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getLocale(): "en" | "es" {
  return routing.defaultLocale;
}

const messages: Record<string, { en: string; es: string }> = {
  anErrorOccurred: {
    en: "An error occurred.",
    es: "Ocurrió un error.",
  },
  requestTimeout: {
    en: "The request took too long and was cancelled. Please try again.",
    es: "La solicitud tardó demasiado y fue cancelada. Inténtalo de nuevo.",
  },
};

export function getErrorMessageText(error: unknown): string | null {
  if (typeof error === 'string') {
    const parsed = tryParseJson(error);
    if (parsed) {
      return getErrorMessageText(parsed);
    }

    return error;
  }

  if (!error || typeof error !== 'object') {
    return null;
  }

  const maybeError = error as {
    message?: unknown;
    name?: unknown;
    type?: unknown;
    responseBody?: unknown;
    error?: unknown;
    data?: { error?: unknown };
  };

  if (typeof maybeError.message === 'string') {
    const parsed = tryParseJson(maybeError.message);
    if (parsed) {
      return getErrorMessageText(parsed);
    }

    return maybeError.message;
  }

  if (typeof maybeError.responseBody === 'string') {
    const parsed = tryParseJson(maybeError.responseBody);
    if (parsed) {
      return getErrorMessageText(parsed);
    }

    return maybeError.responseBody;
  }

  if (maybeError.responseBody) {
    const text = getErrorMessageText(maybeError.responseBody);
    if (text) {
      return text;
    }
  }

  if (maybeError.error) {
    const text = getErrorMessageText(maybeError.error);
    if (text) {
      return text;
    }
  }

  if (maybeError.data?.error) {
    const text = getErrorMessageText(maybeError.data.error);
    if (text) {
      return text;
    }
  }

  if (typeof maybeError.name === 'string') {
    return maybeError.name;
  }

  if (typeof maybeError.type === 'string') {
    return maybeError.type;
  }

  return null;
}

export function getDetailedErrorMessage(error: unknown): string {
  const locale = getLocale();
  const message = getErrorMessageText(error);
  if (!message) {
    return messages.anErrorOccurred[locale];
  }

  if (message.toLowerCase().includes('aborted') || message.toLowerCase().includes('timeout')) {
    return messages.requestTimeout[locale];
  }

  if (message.toLowerCase().includes('tool call validation failed') || message.toLowerCase().includes('invalid_request_error')) {
    const toolMatch =
      message.match(/parameters\s+for\s+tool\s+([a-zA-Z0-9-_]+)/i) ??
      message.match(/tool\s+([a-zA-Z0-9-_]+)/i);
    const schemaPathMatch = message.match(/\[`([^`]+)`:/);
    const expectedTypeMatch = message.match(/expected\s+([a-zA-Z]+)/i);
    const gotTypeMatch = message.match(/but got\s+([a-zA-Z]+)/i);

    const toolLabel = toolMatch ? ` "${toolMatch[1]}"` : '';
    const pathLabel = schemaPathMatch ? ` en ${schemaPathMatch[1]}` : '';
    const typeLabel = expectedTypeMatch && gotTypeMatch
      ? ` (se esperaba ${expectedTypeMatch[1]} y llegó ${gotTypeMatch[1]})`
      : '';

    if (locale === 'en') {
      const enPathLabel = schemaPathMatch ? ` at ${schemaPathMatch[1]}` : '';
      const enTypeLabel = expectedTypeMatch && gotTypeMatch
        ? ` (expected ${expectedTypeMatch[1]} but got ${gotTypeMatch[1]})`
        : '';
      return `The tool${toolLabel} received invalid parameters${enPathLabel}${enTypeLabel}. I tried to fix it automatically, but this turn could not be completed. Retry the message.`;
    }

    return `La herramienta${toolLabel} recibió parámetros inválidos${pathLabel}${typeLabel}. Intenté corregirlo automáticamente, pero no se pudo completar este turno. Reintenta el mensaje.`;
  }

  if (message.toLowerCase().includes('rate limit')) {
    const modelMatch = message.match(/model `([^`]+)`/i);
    const organizationMatch = message.match(/organization `([^`]+)`/i);
    const tierMatch = message.match(/service tier `([^`]+)`/i);
    const limitMatch = message.match(/Limit (\d+)/i);
    const usedMatch = message.match(/Used (\d+)/i);
    const requestedMatch = message.match(/Requested (\d+)/i);
    const retryMatch = message.match(/Please try again in ([^.]+\.?[^.]*)/i);

    const detailsLine = [
      modelMatch ? `model: ${modelMatch[1]}` : null,
      organizationMatch ? `organization: ${organizationMatch[1]}` : null,
      tierMatch ? `tier: ${tierMatch[1]}` : null,
      limitMatch && usedMatch && requestedMatch
        ? `tokens: ${usedMatch[1]}/${limitMatch[1]} used, ${requestedMatch[1]} requested`
        : null,
      retryMatch ? `retry in ${retryMatch[1]}` : null,
    ].filter(Boolean).join(' | ');

    if (locale === 'en') {
      return detailsLine
        ? `Model usage limit reached. ${detailsLine}.`
        : message;
    }

    const esDetailsLine = [
      modelMatch ? `modelo: ${modelMatch[1]}` : null,
      organizationMatch ? `organización: ${organizationMatch[1]}` : null,
      tierMatch ? `tier: ${tierMatch[1]}` : null,
      limitMatch && usedMatch && requestedMatch
        ? `tokens: ${usedMatch[1]}/${limitMatch[1]} usados, ${requestedMatch[1]} solicitados`
        : null,
      retryMatch ? `reintenta en ${retryMatch[1]}` : null,
    ].filter(Boolean).join(' | ');

    return esDetailsLine
      ? `Se alcanzó el límite de uso del modelo. ${esDetailsLine}.`
      : message;
  }

  if (
    message.toLowerCase().includes('token') && (
      message.toLowerCase().includes('limit') ||
      message.toLowerCase().includes('exceed') ||
      message.toLowerCase().includes('maximum') ||
      message.toLowerCase().includes('context length')
    ) ||
    message.toLowerCase().includes('context_length_exceeded') ||
    message.toLowerCase().includes('max_tokens')
  ) {
    if (locale === 'en') {
      return 'Model token limit exceeded. Will automatically try with another model.';
    }
    return 'Se excedió el límite de tokens del modelo. Se intentará automáticamente con otro modelo.';
  }

  return message;
}
