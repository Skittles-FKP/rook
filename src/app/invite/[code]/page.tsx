import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { RookMark } from "@/components/brand";
import { WaitlistForm } from "@/components/growth/waitlist-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="grid min-h-screen place-items-center bg-radial-command px-4 py-10 text-rook-text">
      <div className="w-full max-w-5xl">
        <div className="mb-6">
          <RookMark />
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="surface-card rounded-2xl p-6">
            <KeyRound className="h-8 w-8 text-rook-cyan" />
            <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-rook-cyan">
              Invite detected
            </p>
            <h1 className="mt-3 text-4xl font-black text-white">Operator access code</h1>
            <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3 font-mono text-sm text-rook-green">
              {code}
            </p>
            <p className="mt-4 text-sm leading-7 text-rook-muted">
              This code will be attached to your access request for invite tracking and referral attribution.
            </p>
            <Link href={`/signup?invite=${encodeURIComponent(code)}`} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-rook-void transition hover:bg-rook-cyan">
              <ShieldCheck className="h-4 w-4" />
              Create account
            </Link>
          </div>
          <WaitlistForm referralCode={code} />
        </div>
      </div>
    </main>
  );
}
