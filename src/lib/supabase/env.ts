export type SupabaseEnv = {
  url: string;
  anonKey: string;
};

type SupabaseEnvDiagnostics = {
  configured: boolean;
  url?: string;
  hostname?: string;
  projectRef?: string;
  projectRefLength?: number;
  urlTrimmed: boolean;
  keyName?: string;
  keyPrefix?: string;
  keyLength?: number;
  keyTrimmed: boolean;
  serviceRoleKeyPrefix?: string;
  serviceRoleKeyLength?: number;
  serviceRoleKeyTrimmed?: boolean;
};

export function getSupabaseEnv(): SupabaseEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const url = rawUrl?.trim();
  const anonKey = rawAnonKey?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return getSupabaseEnv() !== null;
}

export function getSupabaseEnvDiagnostics(): SupabaseEnvDiagnostics {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyName = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : undefined;
  const rawKey = keyName ? process.env[keyName] : undefined;
  const url = rawUrl?.trim();
  const key = rawKey?.trim();
  const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKey = rawServiceRoleKey?.trim();

  let hostname: string | undefined;
  let projectRef: string | undefined;

  if (url) {
    try {
      hostname = new URL(url).hostname;
      projectRef = hostname.endsWith(".supabase.co") ? hostname.split(".")[0] : undefined;
    } catch {
      hostname = "invalid-url";
    }
  }

  return {
    configured: Boolean(url && key),
    url,
    hostname,
    projectRef,
    projectRefLength: projectRef?.length,
    urlTrimmed: rawUrl !== url,
    keyName,
    keyPrefix: key?.slice(0, 14),
    keyLength: key?.length,
    keyTrimmed: rawKey !== key,
    serviceRoleKeyPrefix: serviceRoleKey?.slice(0, 14),
    serviceRoleKeyLength: serviceRoleKey?.length,
    serviceRoleKeyTrimmed: rawServiceRoleKey !== serviceRoleKey,
  };
}
