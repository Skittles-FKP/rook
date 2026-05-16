"use client";

import { useMemo, useState, useActionState } from "react";
import { Bot, FileText, ImageIcon, Link2, Radio, Sparkles, Upload, Video } from "lucide-react";
import { createSignalAction } from "@/app/actions/signals";
import { SubmitButton } from "@/components/form/submit-button";
import { detectMediaUrl } from "@/lib/media";
import type { ActionState } from "@/app/actions/auth";
import type { Flock } from "@/lib/supabase/types";

const initialState: ActionState = { ok: false, message: "" };

export function SignalComposer({ flocks }: { flocks: Pick<Flock, "id" | "name">[] }) {
  const [state, action] = useActionState(createSignalAction, initialState);
  const [mediaUrl, setMediaUrl] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const detected = useMemo(() => detectMediaUrl(mediaUrl, aiGenerated), [mediaUrl, aiGenerated]);

  return (
    <form action={action} className="surface-card rook-live-card rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-blue/15 text-rook-cyan">
          <Radio className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white">Publish a Signal</h2>
          <p className="text-sm text-rook-muted">Share high-context intelligence with the network.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <input
          required
          name="title"
          minLength={4}
          maxLength={180}
          placeholder="Signal title"
          className="h-12 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-white outline-none transition focus:border-rook-blue"
        />
        <textarea
          required
          name="body"
          rows={4}
          maxLength={2000}
          placeholder="What changed, why it matters, and what evidence supports it?"
          className="resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-rook-blue"
        />
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rook-cyan">Media payload</p>
              <p className="mt-1 text-xs text-rook-muted">Drop a file or paste a URL. YouTube, X posts, PDFs, images, video, and links are auto-classified.</p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full border border-rook-cyan/20 bg-rook-cyan/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-rook-cyan">
              <Sparkles className="h-3.5 w-3.5" />
              <input
                name="aiGenerated"
                type="checkbox"
                checked={aiGenerated}
                onChange={(event) => setAiGenerated(event.target.checked)}
                className="h-3.5 w-3.5 accent-rook-cyan"
              />
              AI generated
            </label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.9fr]">
            <label className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
              <input
                name="mediaUrl"
                type="url"
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="Paste media, YouTube, X, PDF, or article URL"
                className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-white outline-none transition focus:border-rook-blue"
              />
            </label>
            <label className="group grid min-h-11 cursor-pointer place-items-center rounded-lg border border-dashed border-white/15 bg-rook-void/35 px-3 text-sm font-bold text-rook-muted transition hover:border-rook-cyan/45 hover:text-white">
              <input
                name="mediaFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf"
                className="sr-only"
                onChange={(event) => setFileLabel(event.target.files?.[0]?.name ?? "")}
              />
              <span className="inline-flex min-w-0 items-center gap-2">
                <Upload className="h-4 w-4 text-rook-cyan" />
                <span className="truncate">{fileLabel || "Upload image, video, or PDF"}</span>
              </span>
            </label>
          </div>
          {(detected.mediaType || fileLabel) && (
            <div className="mt-3 flex flex-wrap gap-2">
              <MediaChip icon={detected.mediaType === "video" ? Video : detected.mediaType === "pdf" ? FileText : detected.mediaType === "ai_generated" ? Bot : ImageIcon} label={fileLabel ? "upload queued" : detected.mediaType ?? "media"} />
              {detected.thumbnailUrl && <MediaChip icon={ImageIcon} label="thumbnail detected" />}
              {detected.embedUrl && <MediaChip icon={Link2} label="safe embed ready" />}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <select
            name="flockId"
            className="h-11 rounded-lg border border-white/10 bg-rook-graphite px-3 text-sm font-bold text-rook-muted outline-none transition focus:border-rook-blue"
          >
            <option value="">No Flock</option>
            {flocks.map((flock) => (
              <option key={flock.id} value={flock.id}>
                {flock.name}
              </option>
            ))}
          </select>
          <SubmitButton pendingLabel="Publishing...">Publish Signal</SubmitButton>
        </div>
      </div>
      {state.message && (
        <p
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            state.ok
              ? "border-rook-green/30 bg-rook-green/10 text-rook-green"
              : "border-red-400/30 bg-red-500/10 text-red-200"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

function MediaChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-rook-muted">
      <Icon className="h-3.5 w-3.5 text-rook-cyan" />
      {label}
    </span>
  );
}
