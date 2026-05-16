export const runtime = "edge";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { RookMark } from "@/components/brand";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,176,32,0.14),transparent_24rem),radial-gradient(circle_at_80%_30%,rgba(53,216,255,0.12),transparent_26rem)]" />
      <div className="surface-card relative w-full max-w-md rounded-2xl p-6">
        <RookMark />
        <div className="mt-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-rook-amber/25 bg-rook-amber/10 text-rook-amber">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-white">Verification needs attention</h1>
        <p className="mt-3 text-sm leading-6 text-rook-muted">
          {message ?? "The confirmation link could not be exchanged for a session. Request a fresh verification email or check the Supabase Auth redirect settings."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/signup" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-rook-void transition hover:bg-rook-cyan">
            Back to signup
          </Link>
          <Link href="/login" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white transition hover:border-rook-cyan/40">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
