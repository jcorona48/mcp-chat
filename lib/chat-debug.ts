type TraceExtra = Record<string, unknown>;

const CHAT_DEBUG_ENABLED = process.env.CHAT_DEBUG === '1';

export function createTraceLogger(scope: string, traceId: string) {
  const startedAt = Date.now();

  return (stage: string, extra?: TraceExtra) => {
    if (!CHAT_DEBUG_ENABLED) {
      return;
    }

    const elapsedMs = Date.now() - startedAt;

    console.log(
      JSON.stringify({
        scope,
        requestId: traceId,
        stage,
        elapsedMs,
        ...extra,
      })
    );
  };
}

export function isChatDebugEnabled() {
  return CHAT_DEBUG_ENABLED;
}
