export const runtime = "edge";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bot, ExternalLink, Github, Rocket, Search, Sparkles, TrendingUp } from "lucide-react";
import { AiAppSubmitForm } from "@/components/apps/ai-app-submit-form";
import { PageHeader } from "@/components/shell/page-header";
import { AI_APP_CATEGORIES, getAiApps } from "@/lib/data/ai-apps";

export default async function AppsPage() {
  const apps = await getAiApps();
  const featured = apps.filter((app) => app.featured).slice(0, 3);
  const trending = apps.slice(0, 12);

  return (
    <>
      <PageHeader
        eyebrow="AI App Discovery"
        title="Launch network"
        description="A mobile-first discovery layer for agentic products, AI infrastructure, research tools, and autonomous systems moving through the operator graph."
      />
      <section className="grid min-w-0 gap-4 overflow-hidden px-3 py-4 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_0.72fr]">
          <div className="grid gap-4">
            <div className="accent-border overflow-hidden rounded-xl bg-rook-graphite p-4 sm:p-5">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-rook-cyan/10 text-rook-cyan">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Featured launches</p>
                      <h2 className="mt-1 text-2xl font-black text-white">AI products operators are tracking</h2>
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-rook-muted">
                    Launch cards are designed to become Signals: logos, screenshots, demo links, GitHub links, stack tags, and operator context.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-rook-green/25 bg-rook-green/10 px-3 py-1 text-xs font-black text-rook-green">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Live ranking
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {(featured.length > 0 ? featured : trending.slice(0, 3)).map((app) => <AppCard key={app.id} app={app} featured />)}
              </div>
            </div>

            <div className="surface-card rounded-xl p-3 sm:p-4">
              <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-rook-cyan" />
                <span className="min-w-0 truncate text-sm font-semibold text-rook-muted">Filter launches by category, stack, operators, and narrative motion</span>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {AI_APP_CATEGORIES.map((category) => (
                  <span key={category} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-rook-muted">
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {trending.map((app) => <AppCard key={app.id} app={app} />)}
            </div>
          </div>

          <div className="grid content-start gap-4">
            <AiAppSubmitForm />
            <div className="surface-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5 text-rook-violet" />
                <h2 className="text-lg font-black text-white">Launch intelligence rules</h2>
              </div>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-rook-muted">
                <p>Submit real product context: demo, GitHub, screenshots, stack, and operator ownership.</p>
                <p>Apps can be tied to Launch Signals so the feed, profile, and discovery layers reinforce each other.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function AppCard({ app, featured = false }: { app: Awaited<ReturnType<typeof getAiApps>>[number]; featured?: boolean }) {
  return (
    <article className="surface-card min-w-0 overflow-hidden rounded-xl p-3 transition hover:border-rook-cyan/35 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-rook-cyan/10">
          {app.logo_url ? <Image src={app.logo_url} alt="" fill sizes="48px" className="object-cover" unoptimized /> : <Sparkles className="h-5 w-5 text-rook-cyan" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-black text-white">{app.name}</h3>
            {featured && <span className="shrink-0 rounded-full bg-rook-green/10 px-2 py-0.5 text-[9px] font-black uppercase text-rook-green">Featured</span>}
          </div>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-rook-cyan">{app.category}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-rook-muted">{app.tagline ?? app.description ?? "AI app launch signal"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {app.stack_tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-rook-muted">{tag}</span>)}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1 text-xs font-black text-rook-green"><ArrowUpRight className="h-3.5 w-3.5" />{app.trend_score}</span>
        <div className="flex items-center gap-2">
          {app.github_url && <Link href={app.github_url} target="_blank" rel="noreferrer" className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-white/10 text-rook-muted"><Github className="h-4 w-4" /></Link>}
          {(app.demo_url || app.website_url) && <Link href={app.demo_url ?? app.website_url ?? "#"} target="_blank" rel="noreferrer" className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-white/10 text-rook-muted"><ExternalLink className="h-4 w-4" /></Link>}
        </div>
      </div>
    </article>
  );
}
