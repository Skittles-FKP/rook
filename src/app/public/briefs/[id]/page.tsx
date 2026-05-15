import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { RookMark } from "@/components/brand";
import { demoBriefs } from "@/lib/demo-data";

export default async function PublicBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brief = demoBriefs.find((item) => item.id === id) ?? demoBriefs[0];

  return (
    <main className="min-h-screen bg-radial-command px-4 py-6 text-rook-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <RookMark />
          <Link href="/demo" className="focus-ring rounded-lg bg-white px-4 py-2 text-sm font-black text-rook-void">
            Open Demo
          </Link>
        </header>
        <article className="accent-border mt-8 rounded-2xl bg-rook-graphite p-6">
          <BrainCircuit className="h-8 w-8 text-rook-violet" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-rook-cyan">Public Brief</p>
          <h1 className="mt-3 text-4xl font-black text-white">{brief.title}</h1>
          <p className="mt-5 text-sm leading-7 text-rook-muted">{brief.summary}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <List title="Narratives" items={brief.narratives} />
            <List title="Contradictions" items={brief.contradictions} />
            <List title="Consensus" items={brief.consensus_shifts} />
          </div>
        </article>
      </div>
    </main>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <p className="font-black text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-rook-muted">{item}</p>
        ))}
      </div>
    </div>
  );
}
