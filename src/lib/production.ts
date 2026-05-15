export function analyticsEvent(name: string, properties: Record<string, string | number | boolean> = {}) {
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== "true") {
    return;
  }

  console.info("[rook-analytics]", name, properties);
}

export function captureOperationalError(error: unknown, context: Record<string, string> = {}) {
  if (process.env.NEXT_PUBLIC_ENABLE_ERROR_MONITORING !== "true") {
    return;
  }

  console.error("[rook-error]", error, context);
}

export function getProductionReadiness() {
  const requiredEnv = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ];
  const optionalEnv = [
    "OPENAI_API_KEY",
    "SENTRY_DSN",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missingRequired = requiredEnv.filter((key) => !process.env[key]);
  const missingOptional = optionalEnv.filter((key) => !process.env[key]);
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";

  return {
    environment,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    analyticsEnabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    errorMonitoringEnabled: process.env.NEXT_PUBLIC_ENABLE_ERROR_MONITORING === "true",
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    staging: environment === "preview" || process.env.ROOK_ENV === "staging",
    production: environment === "production",
    missingRequired,
    missingOptional,
    healthy: missingRequired.length === 0,
  };
}

export function getDeploymentChecklist() {
  const readiness = getProductionReadiness();

  return [
    { label: "Supabase public URL", ready: !readiness.missingRequired.includes("NEXT_PUBLIC_SUPABASE_URL") },
    { label: "Supabase anon key", ready: !readiness.missingRequired.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") },
    { label: "Public site URL", ready: !readiness.missingRequired.includes("NEXT_PUBLIC_SITE_URL") },
    { label: "OpenAI provider", ready: readiness.aiConfigured },
    { label: "Sentry DSN", ready: !readiness.missingOptional.includes("SENTRY_DSN") },
    { label: "Service role for workers", ready: !readiness.missingOptional.includes("SUPABASE_SERVICE_ROLE_KEY") },
  ];
}
