export const runtime = "edge";

import { RookMark } from "@/components/brand";
import { WaitlistForm } from "@/components/growth/waitlist-form";

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-radial-command px-4 py-10 text-rook-text">
      <div className="w-full max-w-5xl">
        <div className="mb-6">
          <RookMark />
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-rook-cyan">
              Controlled launch
            </p>
            <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
              Join the operator network before it opens publicly.
            </h1>
            <p className="mt-5 text-sm leading-7 text-rook-muted">
              Invite codes prioritize operators who publish high-quality Signals, contribute Briefs, and bring trusted domain communities into Rook.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {["Invite codes", "Referral links", "Cohort access"].map((item) => (
                <div key={item} className="surface-card rounded-xl p-3 text-center text-xs font-black text-rook-muted">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <WaitlistForm referralCode={ref ?? ""} />
        </div>
      </div>
    </main>
  );
}
