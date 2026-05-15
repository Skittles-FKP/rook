import Image from "next/image";
import Link from "next/link";
import { BarChart3, FileSearch, ImageIcon, Link2, PanelTop, ShieldCheck } from "lucide-react";
import { buildSignalEvidencePacket } from "@/lib/signal-evidence";
import type { SignalWithAuthor } from "@/lib/supabase/types";

export function SignalMedia({ signal }: { signal: SignalWithAuthor }) {
  const tacticalEmbed = getTacticalEmbed(signal.embed_url);
  const evidence = buildSignalEvidencePacket(signal);
  const externalEvidence = evidence.items.filter((item) => item.type !== "graph");
  const items = [
    { label: "Reference", href: signal.reference_url, icon: Link2 },
    { label: "Chart", href: signal.chart_url, icon: BarChart3 },
    { label: tacticalEmbed ? "Video source" : "Embed", href: signal.embed_url, icon: PanelTop },
  ].filter((item) => item.href);

  if (!signal.image_url && items.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {externalEvidence.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(53,216,255,0.08),rgba(255,255,255,0.025))] p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-rook-cyan" />
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rook-cyan">Source Preview</p>
              </div>
              <p className="mt-2 truncate text-sm font-black text-white">{evidence.sourceTitle}</p>
              <p className="mt-1 text-xs text-rook-muted">{evidence.sourceDomain} · {evidence.evidenceType}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-rook-green/20 bg-rook-green/10 px-2 py-1 text-[10px] font-black text-rook-green">
              <ShieldCheck className="h-3.5 w-3.5" />
              {evidence.credibility}% credible
            </span>
          </div>
        </div>
      )}
      {signal.image_url && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
          <Image src={signal.image_url} alt="" fill sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-rook-void/75 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
            <ImageIcon className="h-3.5 w-3.5 text-rook-cyan" />
            Visual evidence
          </div>
        </div>
      )}
      {items.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="focus-ring flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-bold text-rook-muted transition hover:border-rook-cyan/40 hover:text-white"
              >
                <Icon className="h-4 w-4 text-rook-cyan" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
      {tacticalEmbed && (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <PanelTop className="h-4 w-4 text-rook-cyan" />
            <p className="text-xs font-black uppercase tracking-[0.16em] text-rook-cyan">Tactical Video Evidence</p>
          </div>
          <iframe
            src={tacticalEmbed}
            title="Signal video evidence"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video w-full border-0"
          />
        </div>
      )}
    </div>
  );
}

function getTacticalEmbed(url: string | null | undefined) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (parsed.hostname.endsWith("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}
