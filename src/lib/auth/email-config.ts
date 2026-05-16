import { getAuthEnvironmentReport } from "@/lib/auth/env";

export type ResendSmtpConfig = {
  host: "smtp.resend.com";
  port: 465;
  username: "resend";
  passwordEnv: "RESEND_API_KEY";
  fromName: "ROOK SIGNAL NETWORK";
};

export function getResendSmtpConfig(): ResendSmtpConfig {
  return {
    host: "smtp.resend.com",
    port: 465,
    username: "resend",
    passwordEnv: "RESEND_API_KEY",
    fromName: "ROOK SIGNAL NETWORK",
  };
}

export function getEmailInfrastructureStatus() {
  const env = getAuthEnvironmentReport();
  const smtp = getResendSmtpConfig();

  return {
    smtp,
    configured: env.resendSmtpConfigured && env.supabaseConfigured,
    resendKeyExists: env.resendApiKeyExists,
    supabaseConfigured: env.supabaseConfigured,
    siteUrl: env.siteUrl,
    missing: env.missing,
  };
}
