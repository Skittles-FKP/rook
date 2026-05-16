import Link from "next/link";
import { BarChart3, ChevronDown, FileSearch, ImageIcon, Link2, PanelTop, ShieldCheck } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { buildSignalEvidencePacket, type SignalEvidenceType } from "@/lib/signal-evidence";
import type { SignalWithAuthor } from "@/lib/supabase/types";

const evidenceIcons: Record<SignalEvidenceType, React.ComponentType<{ className?: string }>> = {
  source: Link2,
  image: ImageIcon,
  media: PanelTop,
  chart: BarChart3,
  video: PanelTop,
  graph: FileSearch,
};

export function SignalEvidenceSection({ signal }: { signal: SignalWithAuthor }) {
  const packet = buildSignalEvidencePacket(signal);
  const items = Array.isArray(packet.items) ? packet.items : [];

  return (
    <details className="group mt-4 overflow-hidden rounded-lg border border-white/10 bg-rook-void/35">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rook-cyan">Evidence Packet</p>
          <p className="mt-1 text-xs font-bold leading-5 text-white [overflow-wrap:anywhere]">
            {packet.sourceTitle} · {packet.sourceDomain}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full border border-rook-green/20 bg-rook-green/10 px-2 py-1 text-[10px] font-black text-rook-green sm:inline-flex">
            {packet.credibility}% credibility
          </span>
          <ChevronDown className="h-4 w-4 text-rook-muted transition group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-white/10 p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <EvidenceStat label="Source domain" value={packet.sourceDomain} />
          <EvidenceStat label="Evidence type" value={packet.evidenceType} />
          <EvidenceStat label="Credibility" value={`${packet.credibility}%`} />
          <EvidenceStat label="Timestamp" value={formatRelativeTime(packet.timestamp)} />
        </div>
        <div className="mt-3 grid gap-2">
          {items.map((item) => {
            const Icon = evidenceIcons[item.type];
            if (!Icon || !item.href) return null;
            return (
              <Link
                key={`${item.type}-${item.href}`}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                className="focus-ring grid min-w-0 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:border-rook-cyan/35 sm:grid-cols-[auto_1fr_auto]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-rook-cyan/10 text-rook-cyan">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black leading-5 text-white [overflow-wrap:anywhere]">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-rook-muted [overflow-wrap:anywhere]">{item.summary}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-rook-muted sm:justify-end">
                  <ShieldCheck className="h-3.5 w-3.5 text-rook-green" />
                  {item.credibility}%
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function EvidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rook-muted">{label}</p>
      <p className="mt-1 text-xs font-black leading-5 text-white [overflow-wrap:anywhere]">{value}</p>
    </div>
  );
}
