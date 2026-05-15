import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { diagnosticFetch, logSupabaseEnvDiagnostics } from "@/lib/supabase/diagnostics";
import type { Database } from "@/lib/supabase/types";

const protectedPrefixes = [
  "/feed",
  "/pulse",
  "/flocks",
  "/briefs",
  "/profile",
  "/settings",
  "/onboarding",
  "/signals",
  "/graph",
  "/narratives",
  "/agents",
  "/alerts",
  "/search",
  "/ingest",
  "/workspaces",
  "/ops",
  "/rooms",
  "/admin",
];
const authPrefixes = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  let response = NextResponse.next({ request });

  if (!env) {
    return response;
  }

  logSupabaseEnvDiagnostics("middleware-client");

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    global: {
      fetch: diagnosticFetch,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = authPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  response.headers.set("x-rook-runtime", process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");

  return response;
}
