export type LogLevel = "debug" | "info" | "warn" | "error";

export type OperationalLog = {
  level: LogLevel;
  event: string;
  message: string;
  context: Record<string, string | number | boolean>;
  created_at: string;
};

export function writeOperationalLog(
  level: LogLevel,
  event: string,
  message: string,
  context: Record<string, string | number | boolean> = {},
) {
  const payload: OperationalLog = {
    level,
    event,
    message,
    context,
    created_at: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return payload;
  }

  if (level === "warn") {
    console.warn(line);
    return payload;
  }

  console.info(line);
  return payload;
}

export function captureException(error: unknown, context: Record<string, string | number | boolean> = {}) {
  const message = error instanceof Error ? error.message : "Unknown operational error";
  const sentryConfigured = Boolean(process.env.SENTRY_DSN);

  return writeOperationalLog("error", "exception", message, {
    ...context,
    sentryConfigured,
  });
}

export function traceAiExecution<T>(
  name: string,
  operation: () => Promise<T>,
  context: Record<string, string | number | boolean> = {},
) {
  const startedAt = Date.now();
  writeOperationalLog("info", "ai.trace.start", `${name} started`, context);

  return operation()
    .then((result) => {
      writeOperationalLog("info", "ai.trace.complete", `${name} completed`, {
        ...context,
        durationMs: Date.now() - startedAt,
      });
      return result;
    })
    .catch((error: unknown) => {
      captureException(error, {
        ...context,
        trace: name,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    });
}

export function getObservabilityStatus() {
  return {
    sentryReady: Boolean(process.env.SENTRY_DSN),
    analyticsReady: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    errorMonitoringReady: process.env.NEXT_PUBLIC_ENABLE_ERROR_MONITORING === "true",
    logFormat: "json",
    realtimeDiagnostics: true,
    aiTracing: true,
  };
}
