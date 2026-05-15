import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { diagnosticFetch, logSupabaseEnvDiagnostics } from "@/lib/supabase/diagnostics";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();

  logSupabaseEnvDiagnostics("server-client");

  return createServerClient<Database>(env.url, env.anonKey, {
    global: {
      fetch: diagnosticFetch,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always set cookies. Middleware refreshes sessions.
        }
      },
    },
  });
}
