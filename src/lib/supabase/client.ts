"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { diagnosticFetch, logSupabaseEnvDiagnostics } from "@/lib/supabase/diagnostics";
import type { Database } from "@/lib/supabase/types";

export function createClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  logSupabaseEnvDiagnostics("browser-client");

  return createBrowserClient<Database>(env.url, env.anonKey, {
    global: {
      fetch: diagnosticFetch,
    },
  });
}
