export const runtime = "edge";

import { RookMark } from "@/components/brand";

export default function SetupPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="surface-card w-full max-w-2xl rounded-2xl p-6">
        <RookMark />
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-rook-cyan">
          Supabase required
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Connect Rook to Supabase</h1>
        <p className="mt-3 text-sm leading-6 text-rook-muted">
          Phase 2 uses real Supabase auth and Postgres. Create `.env.local`, add
          your project URL and anon key, then apply the migration in
          `supabase/migrations/0001_rook_phase2_schema.sql`.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-rook-void p-4 text-xs leading-6 text-rook-cyan">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
      </section>
    </main>
  );
}
