const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
];

const hasAnon =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

const missing = required.filter((key) => !process.env[key]);

if (!hasAnon) {
  missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

if (missing.length > 0) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  environment: process.env.VERCEL_ENV ?? process.env.ROOK_ENV ?? "development",
  aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  sentryConfigured: Boolean(process.env.SENTRY_DSN),
}, null, 2));
