export const runtime = "edge";

import Link from "next/link";
import type { ComponentType } from "react";
import { Clock3, Search, Server, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { getEmbeddingReadiness, semanticSearch } from "@/lib/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [results, readiness] = await Promise.all([semanticSearch(q), Promise.resolve(getEmbeddingReadiness())]);

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title="Semantic intelligence retrieval"
        description="Search Signals, narratives, Briefs, and operators through the retrieval layer. Vector infrastructure is used when configured; lexical fallback keeps the interface operational."
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <form className="surface-card rounded-2xl p-3 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rook-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search compute markets, policy drift, operator alignment..."
              className="h-12 w-full rounded-full border border-white/10 bg-rook-graphite pl-12 pr-4 text-base text-white outline-none placeholder:text-rook-muted focus:border-rook-cyan/40"
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SuggestionGroup icon={Clock3} title="Recent searches" items={["AI capex pressure", "regulatory drift", "operator alignment"]} />
            <SuggestionGroup icon={TrendingUp} title="Trending signals" items={["compute supply", "model pricing", "security incident"]} />
            <SuggestionGroup icon={Search} title="Operators" items={["from:@operator", "tag:policy", "confidence:>80"]} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-rook-muted">
            <Server className="h-4 w-4 text-rook-cyan" />
            Retrieval mode: {readiness.mode}
          </div>
        </form>
        <div className="grid gap-3 xl:grid-cols-2">
          {results.map((result) => (
            <Link key={`${result.kind}-${result.id}`} href={result.href} className="surface-card focus-ring rounded-xl p-5 transition hover:border-rook-cyan/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-rook-cyan/25 bg-rook-cyan/10 px-3 py-1 text-xs font-black uppercase text-rook-cyan">
                  {result.kind}
                </span>
                <span className="text-xs font-black text-rook-muted">score {result.score.toFixed(1)}</span>
              </div>
              <h2 className="mt-4 text-xl font-black text-white">{result.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-rook-muted">{result.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-rook-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function SuggestionGroup({
  icon: Icon,
  title,
  items,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-rook-graphite p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-rook-cyan" />
        <p className="text-xs font-black uppercase tracking-[0.12em] text-rook-muted">{title}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <button key={item} type="submit" name="q" value={item} className="focus-ring rounded-full bg-rook-ink px-3 py-1.5 text-xs font-bold text-rook-muted transition hover:text-rook-text">
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
