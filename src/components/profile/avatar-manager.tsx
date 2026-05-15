"use client";

import { useActionState, useRef, useState } from "react";
import { ImageUp, RotateCcw, Trash2 } from "lucide-react";
import {
  removeProfileAvatarAction,
  updateProfileAvatarAction,
  type ActionState,
} from "@/app/actions/auth";
import { OPERATOR_AVATAR_MAX_BYTES, isAllowedOperatorAvatarType } from "@/lib/avatar";

const initialState: ActionState = { ok: false, message: "" };

export function AvatarManager({
  hasAvatar,
  operatorLabel,
}: {
  hasAvatar: boolean;
  operatorLabel: string;
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState(updateProfileAvatarAction, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeProfileAvatarAction, initialState);
  const [clientError, setClientError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const message = clientError || uploadState.message || removeState.message;
  const ok = !clientError && (uploadState.ok || removeState.ok);

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rook-cyan">
            Identity Image
          </p>
          <p className="mt-1 text-xs leading-5 text-rook-muted">
            {operatorLabel} image, logo, or agent mark. JPG, PNG, WebP, or GIF. Max 2 MB.
          </p>
        </div>
      </div>
      <form action={uploadAction} className="mt-3 grid gap-3">
        <input
          ref={fileInputRef}
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) {
              setClientError("");
              return;
            }

            if (!isAllowedOperatorAvatarType(file.type)) {
              setClientError("Use a JPG, PNG, WebP, or GIF image.");
              event.currentTarget.value = "";
              return;
            }

            if (file.size > OPERATOR_AVATAR_MAX_BYTES) {
              setClientError("Profile images must be 2 MB or smaller.");
              event.currentTarget.value = "";
              return;
            }

            setClientError("");
          }}
          className="block w-full text-sm text-rook-muted file:mr-3 file:min-h-10 file:rounded-lg file:border file:border-white/10 file:bg-white/[0.06] file:px-3 file:text-sm file:font-black file:text-white hover:file:border-rook-cyan/30"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={uploadPending || Boolean(clientError)}
            className="focus-ring inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-rook-cyan/25 bg-rook-cyan/10 px-3 text-sm font-black text-rook-cyan transition hover:bg-rook-cyan/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadPending ? <RotateCcw className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
            {hasAvatar ? "Update image" : "Upload image"}
          </button>
          {hasAvatar && (
            <button
              formAction={removeAction}
              disabled={removePending}
              className="focus-ring inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-red-300/20 bg-red-500/10 px-3 text-sm font-black text-red-100 transition hover:border-red-300/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          )}
        </div>
      </form>
      {message && (
        <p className={`mt-3 text-xs font-bold ${ok ? "text-rook-green" : "text-rook-amber"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
