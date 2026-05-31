"use client";

import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { Bot, FileText, Hash, ImageIcon, Link2, ListChecks, Radio, Sparkles, Trash2, Upload, Video, WandSparkles } from "lucide-react";
import { clsx } from "clsx";
import { createSignalAction } from "@/app/actions/signals";
import { SubmitButton } from "@/components/form/submit-button";
import { detectMediaUrl, validateMediaFile } from "@/lib/media";
import type { ActionState } from "@/app/actions/auth";
import type { Flock } from "@/lib/supabase/types";

const initialState: ActionState = { ok: false, message: "" };
const draftKey = "rook.signalComposerDraft.v2";
const signalCategories = ["Launch", "Research", "Benchmark", "Infrastructure", "Funding", "Agent", "Security", "Governance"];

export function SignalComposer({ flocks, compact = false, autoFocus = false }: { flocks: Pick<Flock, "id" | "name">[]; compact?: boolean; autoFocus?: boolean }) {
  const [state, action] = useActionState(createSignalAction, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [tags, setTags] = useState("");
  const [appName, setAppName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [appStackTags, setAppStackTags] = useState("");
  const [signalCategory, setSignalCategory] = useState(signalCategories[0]);
  const [fileLabel, setFileLabel] = useState("");
  const [fileError, setFileError] = useState("");
  const [mediaWarning, setMediaWarning] = useState("");
  const [previews, setPreviews] = useState<Array<{ url: string; type: string; name: string }>>([]);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [markdownEnabled, setMarkdownEnabled] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const detected = useMemo(() => detectMediaUrl(mediaUrl, aiGenerated), [mediaUrl, aiGenerated]);
  const remaining = 2000 - body.length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (!saved) return;
      const draft = JSON.parse(saved) as Partial<Record<"title" | "body" | "mediaUrl" | "tags" | "appName" | "appUrl" | "appStackTags" | "signalCategory", string>>;
      setTitle(draft.title ?? "");
      setBody(draft.body ?? "");
      setMediaUrl(draft.mediaUrl ?? "");
      setTags(draft.tags ?? "");
      setAppName(draft.appName ?? "");
      setAppUrl(draft.appUrl ?? "");
      setAppStackTags(draft.appStackTags ?? "");
      setSignalCategory(draft.signalCategory && signalCategories.includes(draft.signalCategory) ? draft.signalCategory : signalCategories[0]);
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, []);

  useEffect(() => {
    if (!autoFocus || typeof window === "undefined") return;
    const timeout = window.setTimeout(() => bodyRef.current?.focus({ preventScroll: true }), 180);
    return () => window.clearTimeout(timeout);
  }, [autoFocus]);

  useEffect(() => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 320)}px`;
  }, [body]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ title, body, mediaUrl, tags, appName, appUrl, appStackTags, signalCategory }));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [appName, appStackTags, appUrl, body, mediaUrl, signalCategory, tags, title]);

  useEffect(() => {
    if (!state.ok) return;
    if (typeof window !== "undefined") window.localStorage.removeItem(draftKey);
    setTitle("");
    setBody("");
    setMediaUrl("");
    setTags("");
    setAppName("");
    setAppUrl("");
    setAppStackTags("");
    setFileLabel("");
    setFileError("");
    setMediaWarning("");
    setPreviews([]);
    setAiGenerated(false);
  }, [state.ok]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function queueFiles(files: File[]) {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    const invalid = files.map(validateMediaFile).find((result) => !result.ok);
    if (invalid && !invalid.ok) {
      setFileError(invalid.message);
      setFileLabel("");
      setMediaWarning("");
      setPreviews([]);
      return;
    }
    setFileError("");
    setMediaWarning("");
    setFileLabel(files.length > 1 ? `${files.length} files queued` : files[0]?.name ?? "");
    const queued = files.slice(0, 4);
    setPreviews(queued.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name,
    })));
    queued.filter((file) => file.type.startsWith("video/")).forEach((file) => {
      void getVideoDuration(file).then((duration) => {
        if (duration && duration > 60) {
          setMediaWarning("This video is longer than 60 seconds. It can be published, but short clips perform better in the feed.");
        }
      });
    });
  }

  function clearQueuedMedia() {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setPreviews([]);
    setFileLabel("");
    setFileError("");
    setMediaWarning("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function draftWithAi() {
    const category = signalCategory.toLowerCase();
    const lead = title || appName || "New operator signal";
    const suggested = `What changed: ${lead} is showing meaningful movement across the ${category} surface.\n\nWhy it matters: Operators should track adoption signals, infrastructure dependencies, and second-order narrative effects before the broader market reacts.\n\nEvidence: Add links, screenshots, benchmarks, or source notes before publishing.`;
    setBody((current) => current.trim() ? `${current.trim()}\n\n${suggested}`.slice(0, 2000) : suggested);
  }

  return (
    <form action={action} className={clsx("surface-card rook-live-card max-w-full overflow-hidden rounded-xl p-3 md:p-5", compact && "border-white/[0.07] bg-white/[0.025] shadow-none")}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-blue/15 text-rook-cyan">
          <Radio className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white">What&apos;s happening?</h2>
          <p className="text-sm text-rook-muted">Compose the Signal first. Add evidence and routing only when needed.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <input
          required
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          minLength={4}
          maxLength={180}
          placeholder="Add a concise Signal headline"
          className="h-12 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-white outline-none transition focus:border-rook-blue"
        />
        <textarea
          ref={bodyRef}
          required
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What changed?"
          className="min-h-36 resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-base leading-7 text-white outline-none transition focus:border-rook-blue"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
          <label className="inline-flex touch-manipulation items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-rook-muted">
            <input name="markdownEnabled" type="checkbox" checked={markdownEnabled} onChange={(event) => setMarkdownEnabled(event.target.checked)} className="accent-rook-cyan" />
            Markdown
          </label>
          <button type="button" onClick={draftWithAi} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-rook-violet/25 bg-rook-violet/10 px-3 text-xs font-black uppercase tracking-[0.12em] text-rook-violet">
            <WandSparkles className="h-3.5 w-3.5" />
            AI draft
          </button>
          <span className={`ml-auto text-xs font-black ${remaining < 120 ? "text-rook-amber" : "text-rook-muted"}`}>{remaining}</span>
        </div>
        <details className="group rounded-xl border border-white/10 bg-white/[0.025]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-black text-white">
            Advanced fields
            <span className="text-rook-cyan transition group-open:rotate-90">›</span>
          </summary>
          <div className="grid gap-3 border-t border-white/10 p-3">
        <div className="grid gap-2 md:grid-cols-[0.8fr_1fr]">
          <label className="relative">
            <ListChecks className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
            <select
              name="signalCategory"
              value={signalCategory}
              onChange={(event) => setSignalCategory(event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-rook-graphite pl-10 pr-3 text-sm font-bold text-white outline-none transition focus:border-rook-blue"
            >
              {signalCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
            <input
              name="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="tags: launch, evals, agents"
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-white outline-none transition focus:border-rook-blue"
            />
          </label>
        </div>
        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-3 md:grid-cols-3">
          <input name="appName" value={appName} onChange={(event) => setAppName(event.target.value)} placeholder="AI app/project name" className="h-11 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue" />
          <input name="appUrl" value={appUrl} onChange={(event) => setAppUrl(event.target.value)} type="url" placeholder="Demo or launch URL" className="h-11 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue" />
          <input name="appStackTags" value={appStackTags} onChange={(event) => setAppStackTags(event.target.value)} placeholder="stack: LangGraph, vLLM" className="h-11 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition focus:border-rook-blue" />
          <label className="group relative min-h-11 cursor-pointer overflow-hidden rounded-lg border border-dashed border-white/15 bg-rook-void/35 px-3 text-sm font-bold text-rook-muted transition hover:border-rook-cyan/45 md:col-span-3">
              <input name="appLogoFile" type="file" accept="image/jpeg,image/png,image/webp" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            <span className="pointer-events-none flex h-11 items-center gap-2">
              <ImageIcon className="h-4 w-4 text-rook-cyan" />
              Optional AI app logo
            </span>
          </label>
        </div>
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
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const files = [...event.dataTransfer.files];
                if (files.length > 0) queueFiles(files);
              }}
              className={`group relative grid min-h-11 touch-manipulation cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed px-3 text-sm font-bold transition hover:text-white active:scale-[0.99] ${dragActive ? "border-rook-cyan/70 bg-rook-cyan/10 text-white" : "border-white/15 bg-rook-void/35 text-rook-muted hover:border-rook-cyan/45"}`}
            >
              <input
                ref={fileInputRef}
                name="mediaFile"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf"
                capture={undefined}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  queueFiles(files);
                }}
              />
              <span className="pointer-events-none inline-flex min-w-0 items-center gap-2">
                <Upload className="h-4 w-4 text-rook-cyan" />
                <span className="truncate">{fileLabel || "Upload image, video, or PDF"}</span>
              </span>
            </label>
          </div>
          {fileError && (
            <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
              {fileError}
            </p>
          )}
          {mediaWarning && (
            <p className="mt-3 rounded-lg border border-rook-amber/30 bg-rook-amber/10 px-3 py-2 text-xs font-bold text-rook-amber">
              {mediaWarning}
            </p>
          )}
          {previews.length > 0 && (
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rook-muted">Preview before publish</p>
                <button type="button" onClick={clearQueuedMedia} className="focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-[0.12em] text-rook-muted transition hover:text-white">
                  <Trash2 className="h-3.5 w-3.5 text-rook-amber" />
                  Remove
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {previews.map((preview) => (
                  <div key={preview.url} className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-rook-void">
                    {preview.type.startsWith("image/") ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${preview.url})` }}
                        aria-label={preview.name}
                      />
                    ) : preview.type.startsWith("video/") ? (
                      <video src={preview.url} muted playsInline preload="metadata" controls className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center bg-white/[0.035]">
                        <FileText className="h-8 w-8 text-rook-cyan" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-rook-void/90 to-transparent p-2">
                      <p className="truncate text-xs font-black text-white">{preview.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(detected.mediaType || fileLabel) && (
            <div className="mt-3 flex flex-wrap gap-2">
              <MediaChip icon={detected.mediaType === "video" ? Video : detected.mediaType === "pdf" ? FileText : detected.mediaType === "ai_generated" ? Bot : ImageIcon} label={fileLabel ? "upload queued" : detected.mediaType ?? "media"} />
              {detected.thumbnailUrl && <MediaChip icon={ImageIcon} label="thumbnail detected" />}
              {detected.embedUrl && <MediaChip icon={Link2} label="safe embed ready" />}
            </div>
          )}
        </div>
          </div>
        </details>
        <div className="sticky bottom-0 z-10 mx-0 flex flex-col gap-3 border-t border-white/10 bg-rook-void/92 px-3 py-2 backdrop-blur-xl md:static md:flex-row md:items-center md:justify-between md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
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

function getVideoDuration(file: File) {
  if (typeof document === "undefined") return Promise.resolve<number | null>(null);
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      cleanup();
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
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
