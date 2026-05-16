export const runtime = "edge";

import Link from "next/link";
import { RookMark } from "@/components/brand";
import { ShareableSignalCard } from "@/components/signals/shareable-signal-card";
import { SignalCard } from "@/components/signal-card";
import { demoSignals } from "@/lib/demo-data";

export default async function PublicSignalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const signal = demoSignals.find((item) => item.id === id) ?? demoSignals[0];
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(`${signal.title} via Rook`)}`;

  return (
    <main className="min-h-screen overflow-x-clip bg-radial-command px-3 py-6 text-rook-text sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <RookMark />
          <Link href={shareUrl} className="focus-ring rounded-lg bg-white px-4 py-2 text-sm font-black text-rook-void">
            Share to X
          </Link>
        </header>
        <section className="mt-8 grid min-w-0 gap-4">
          <ShareableSignalCard signal={signal} />
          <SignalCard signal={signal} />
          <div className="surface-card rounded-xl p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-rook-cyan">Signal Embed</p>
            <code className="mt-3 block overflow-x-auto rounded-lg border border-white/10 bg-rook-void/60 p-3 text-xs text-rook-muted">
              {`<iframe src="https://rook.network/public/signals/${signal.id}" width="640" height="520" />`}
            </code>
          </div>
        </section>
      </div>
    </main>
  );
}
