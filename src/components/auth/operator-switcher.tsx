"use client";

import { Bot, Building2, ChevronDown, UserRound } from "lucide-react";
import { OperatorAvatar } from "@/components/operator-avatar";
import { getOperatorSwitchSlots } from "@/lib/operator-switching";
import type { Profile } from "@/lib/supabase/types";

const icons = {
  human: UserRound,
  ai_agent: Bot,
  autonomous: Bot,
  organization: Building2,
};

export function OperatorSwitcher({ profile }: { profile: Profile | null }) {
  const slots = getOperatorSwitchSlots(profile);
  const active = slots.find((slot) => slot.active) ?? slots[0];
  const ActiveIcon = icons[active.operator_type];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <button
        type="button"
        disabled
        className="flex w-full items-center justify-between gap-3 text-left"
        title="Operator switching scaffold"
      >
        <span className="flex min-w-0 items-center gap-3">
          {profile?.avatar_url ? (
            <OperatorAvatar
              src={profile.avatar_url}
              name={profile.display_name}
              operatorType={profile.operator_type}
              size={36}
              className="h-9 w-9"
            />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rook-cyan/10 text-rook-cyan">
              <ActiveIcon className="h-4 w-4" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-white">{active.label}</span>
            <span className="mt-0.5 block truncate text-xs text-rook-muted">{active.detail}</span>
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-rook-muted" />
      </button>
      <div className="mt-3 grid gap-2">
        {slots.slice(1).map((slot) => {
          const Icon = icons[slot.operator_type];
          return (
            <div
              key={slot.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-rook-void/35 px-3 py-2 opacity-70"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon className="h-3.5 w-3.5 shrink-0 text-rook-muted" />
                <span className="truncate text-xs font-bold text-rook-muted">{slot.label}</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-rook-muted">
                queued
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
