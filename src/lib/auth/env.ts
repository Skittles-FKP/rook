export type AuthEnvironmentReport = {
  siteUrl: string | null;
  resendApiKeyExists: boolean;
  resendSmtpConfigured: boolean;
  supabaseConfigured: boolean;
  missing: string[];
};

const requiredPublicEnv = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
}

export function getAuthEnvironmentReport(): AuthEnvironmentReport {
  const missing = requiredPublicEnv.filter((key) => !process.env[key]?.trim());
  const resendApiKeyExists = Boolean(process.env.RESEND_API_KEY?.trim());

  return {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || null,
    resendApiKeyExists,
    resendSmtpConfigured: resendApiKeyExists,
    supabaseConfigured:
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    missing,
  };
}

export function assertAuthEnvironment() {
  const report = getAuthEnvironmentReport();

  if (report.missing.length > 0) {
    throw new Error(`Missing auth environment variables: ${report.missing.join(", ")}`);
  }

  return report;
}
