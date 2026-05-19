"use client";

import { useActionState, useEffect, useState } from "react";
import { Github, ImageUp, Link2, Rocket, Upload } from "lucide-react";
import { submitAiAppAction } from "@/app/actions/apps";
import { SubmitButton } from "@/components/form/submit-button";
import { AI_APP_CATEGORIES } from "@/lib/ai-app-categories";
import type { ActionState } from "@/app/actions/auth";

const initialState: ActionState = { ok: false, message: "" };

export function AiAppSubmitForm() {
  const [state, action] = useActionState(submitAiAppAction, initialState);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview)), [previews]);

  return (
    <form action={action} className="surface-card max-w-full overflow-hidden rounded-xl p-3 sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-rook-cyan/10 text-rook-cyan">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-white">Submit AI app</h2>
          <p className="text-sm text-rook-muted">Launch intelligence for operators, startups, and agent infrastructure.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <input name="name" required minLength={2} maxLength={80} placeholder="App or startup name" className="h-11 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-white outline-none focus:border-rook-blue" />
        <input name="tagline" required minLength={4} maxLength={150} placeholder="One-line launch signal" className="h-11 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:border-rook-blue" />
        <textarea name="description" rows={3} maxLength={900} placeholder="What it does, who it serves, and why operators should care." className="resize-none rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-sm leading-6 text-white outline-none focus:border-rook-blue" />
        <select name="category" className="h-11 rounded-lg border border-white/10 bg-rook-graphite px-3 text-sm font-bold text-white outline-none focus:border-rook-blue">
          {AI_APP_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
            <input name="demoUrl" type="url" placeholder="Demo URL" className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-white outline-none focus:border-rook-blue" />
          </label>
          <label className="relative">
            <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
            <input name="githubUrl" type="url" placeholder="GitHub URL" className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-white outline-none focus:border-rook-blue" />
          </label>
          <label className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
            <input name="websiteUrl" type="url" placeholder="Website URL" className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-white outline-none focus:border-rook-blue" />
          </label>
        </div>
        <input name="stackTags" placeholder="Stack tags: agents, evals, inference, vector db" className="h-11 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none focus:border-rook-blue" />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="relative grid min-h-11 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-white/15 bg-rook-void/35 px-3 text-sm font-bold text-rook-muted transition hover:border-rook-cyan/45 hover:text-white">
            <input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            <span className="pointer-events-none inline-flex items-center gap-2"><ImageUp className="h-4 w-4 text-rook-cyan" />Logo</span>
          </label>
          <label className="relative grid min-h-11 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-white/15 bg-rook-void/35 px-3 text-sm font-bold text-rook-muted transition hover:border-rook-cyan/45 hover:text-white">
            <input
              name="screenshots"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(event) => {
                previews.forEach((preview) => URL.revokeObjectURL(preview));
                setPreviews([...(event.target.files ?? [])].slice(0, 4).map((file) => URL.createObjectURL(file)));
              }}
            />
            <span className="pointer-events-none inline-flex items-center gap-2"><Upload className="h-4 w-4 text-rook-cyan" />Screenshots</span>
          </label>
        </div>
        {previews.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {previews.map((preview) => <div key={preview} className="aspect-video rounded-lg border border-white/10 bg-cover bg-center" style={{ backgroundImage: `url(${preview})` }} />)}
          </div>
        )}
        <SubmitButton pendingLabel="Submitting...">Submit launch</SubmitButton>
      </div>
      {state.message && <p className={`mt-3 text-sm font-bold ${state.ok ? "text-rook-green" : "text-rook-amber"}`}>{state.message}</p>}
    </form>
  );
}
