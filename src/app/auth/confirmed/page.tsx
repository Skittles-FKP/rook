export const runtime = "edge";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { RookMark } from "@/components/brand";

export default function AuthConfirmedPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(53,216,255,0.14),transparent_24rem),radial-gradient(circle_at_80%_30%,rgba(46,232,159,0.12),transparent_26rem)]" />
      <div className="surface-card relative w-full max-w-md rounded-2xl p-6">
        <RookMark />
        <div className="mt-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-rook-green/25 bg-rook-green/10 text-rook-green">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-white">Email confirmed</h1>
        <p className="mt-3 text-sm leading-6 text-rook-muted">
          Your Rook session is active. Continue onboarding to complete your operator identity.
        </p>
        <Link href="/onboarding" className="focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-black text-rook-void transition hover:bg-rook-cyan">
          Continue onboarding
        </Link>
      </div>
    </main>
  );
}
