"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Plus, Search } from "lucide-react";
import { clsx } from "clsx";
import { OperatorSwitcher } from "@/components/auth/operator-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { RookMark } from "@/components/brand";
import { NetworkEventStream } from "@/components/shell/network-event-stream";
import { createClient } from "@/lib/supabase/client";
import { appNavItems, mobileNavItems } from "@/lib/navigation";
import type { NetworkEvent } from "@/lib/data/pulse";
import type { Profile } from "@/lib/supabase/types";

export function AppShell({
  children,
  profile,
  events,
}: {
  children: React.ReactNode;
  profile: Profile | null;
  events: NetworkEvent[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("rook-profile-identity-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="min-h-screen overflow-x-clip bg-rook-void/75 text-rook-text">
      <div className="pointer-events-none fixed inset-0 z-0 hidden opacity-60 lg:block">
        <span className="ambient-scanline absolute left-0 top-1/3 h-px w-full bg-rook-cyan/20" />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-[96rem]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-white/10 px-4 py-6 lg:block">
          <RookMark />
          <nav className="mt-10 space-y-2">
            {appNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "focus-ring flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition",
                    active
                      ? "accent-border text-white shadow-glow"
                      : "text-rook-muted hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/feed"
            className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white text-sm font-black text-rook-void transition hover:bg-rook-cyan"
          >
            <Plus className="h-4 w-4" />
            Create Signal
          </Link>
          <div className="surface-card mt-8 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-rook-cyan">
              Signed in
            </p>
            <p className="mt-3 text-sm leading-6 text-rook-muted">
              {profile
                ? `${profile.display_name} is operating as @${profile.username}.`
                : "Complete onboarding to activate your operator profile."}
            </p>
            <div className="mt-4">
              <OperatorSwitcher profile={profile} />
            </div>
            <div className="mt-4 flex">
              <SignOutButton className="w-full" />
            </div>
          </div>
        </aside>

        <main className="mobile-safe-main min-w-0 flex-1 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-rook-void/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <RookMark compact />
              <div className="flex items-center gap-2">
                <Link href="/search" className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-rook-muted">
                  <Search className="h-4 w-4" />
                </Link>
                <Link href="/alerts" className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-rook-muted">
                  <Bell className="h-4 w-4" />
                </Link>
                <SignOutButton compact className="grid h-10 w-10 place-items-center px-0" />
              </div>
            </div>
          </header>
          {children}
        </main>

        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-l border-white/10 px-4 py-6 2xl:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
            <input
              disabled
              placeholder="Search Signals"
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-rook-muted outline-none"
            />
          </div>
          <NetworkEventStream initialEvents={events} />
          <div className="surface-card mt-5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-white">Autonomous Sync</p>
              <span className="network-pulse h-2 w-2 rounded-full bg-rook-cyan" />
            </div>
            <div className="mt-4 space-y-3">
              {["Operators aligned", "Pulse drift sampled", "Narratives indexed"].map((item, index) => (
                <div key={item}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-rook-muted">{item}</span>
                    <span className="font-black text-white">{92 - index * 11}%</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="pulse-shimmer h-full rounded-full bg-gradient-to-r from-rook-blue via-rook-cyan to-rook-green" style={{ width: `${92 - index * 11}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="surface-card mt-5 rounded-xl p-4">
            <p className="text-sm font-black text-white">Network Readiness</p>
            <div className="mt-4 space-y-4">
              {["Identity", "Signals", "Flocks", "AI Briefs"].map((item, index) => (
                <div key={item}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-rook-muted">{item}</span>
                    <span className="text-white">{index === 0 ? "Next" : "Queued"}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rook-blue to-rook-violet"
                      style={{ width: `${72 - index * 14}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-rook-void/90 px-2 pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "focus-ring flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold transition sm:text-[11px]",
                  active
                    ? "bg-white text-rook-void"
                    : "text-rook-muted hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
