"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronsLeft, ChevronsRight, Download, Menu, PanelRightOpen, Plus, Search, X } from "lucide-react";
import { clsx } from "clsx";
import { OperatorSwitcher } from "@/components/auth/operator-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { RookBirdIcon, RookMark } from "@/components/brand";
import { NetworkEventStream } from "@/components/shell/network-event-stream";
import { FeedContentBoundary, FeedShellBoundary, MobileNavigationBoundary } from "@/components/signals/signal-error-boundary";
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
  const safeEvents = Array.isArray(events) ? events : [];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rightRailOpen, setRightRailOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel("rook-profile-identity-updates")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
          router.refresh();
        })
        .subscribe();
    } catch (error) {
      console.warn("[app-shell] realtime identity channel disabled", error);
    }

    return () => {
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pwa] service worker registration failed", error);
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function routeBySwipe(deltaX: number) {
    if (Math.abs(deltaX) < 86) return;
    const flow = ["/feed", "/pulse", "/apps", "/graph"];
    const index = flow.indexOf(pathname ?? "");
    if (index === -1) return;
    const next = deltaX < 0 ? flow[Math.min(flow.length - 1, index + 1)] : flow[Math.max(0, index - 1)];
    if (next !== pathname) router.push(next);
  }

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    if (drawerOpen || rightRailOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [drawerOpen, rightRailOpen]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined" || typeof document === "undefined") return;

    function markOverflowingElements() {
      const width = document.documentElement.clientWidth;
      document.querySelectorAll<HTMLElement>("[data-rook-overflow-debug]").forEach((element) => {
        element.style.outline = "";
        element.removeAttribute("data-rook-overflow-debug");
      });
      document.querySelectorAll<HTMLElement>("body *").forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.left < -1 || rect.right > width + 1) {
          element.style.outline = "2px solid red";
          element.style.outlineOffset = "-2px";
          element.setAttribute("data-rook-overflow-debug", "true");
        }
      });
    }

    markOverflowingElements();
    window.addEventListener("resize", markOverflowingElements);
    window.addEventListener("scroll", markOverflowingElements, { passive: true });
    return () => {
      window.removeEventListener("resize", markOverflowingElements);
      window.removeEventListener("scroll", markOverflowingElements);
    };
  }, []);

  return (
    <FeedShellBoundary>
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-rook-void/75 text-rook-text">
      <div className="pointer-events-none fixed inset-0 z-0 hidden opacity-60 lg:block">
        <span className="ambient-scanline absolute left-0 top-1/3 h-px w-full bg-rook-cyan/20" />
      </div>
      <div className="md:hidden">
        <MobileHeader events={safeEvents} setDrawerOpen={setDrawerOpen} />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-full min-w-0 overflow-x-hidden xl:max-w-[104rem]">
        <DesktopSidebar
          pathname={pathname}
          profile={profile}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />

        <main
          className="mobile-safe-main min-w-0 flex-1 overflow-x-hidden lg:pb-0"
          onTouchStart={(event) => setTouchStart({ x: event.touches[0]?.clientX ?? 0, y: event.touches[0]?.clientY ?? 0 })}
          onTouchEnd={(event) => {
            if (!touchStart || drawerOpen || rightRailOpen) return;
            const touch = event.changedTouches[0];
            const deltaX = (touch?.clientX ?? 0) - touchStart.x;
            const deltaY = (touch?.clientY ?? 0) - touchStart.y;
            if (Math.abs(deltaX) > Math.abs(deltaY) * 1.8) routeBySwipe(deltaX);
            setTouchStart(null);
          }}
        >
          <TabletHeader setRightRailOpen={setRightRailOpen} />
          <FeedContentBoundary>{children}</FeedContentBoundary>
        </main>

        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-white/10 px-3 py-4 opacity-95 xl:block">
          <RightRail events={safeEvents} />
        </aside>

        <RightRailDrawer events={safeEvents} rightRailOpen={rightRailOpen} setRightRailOpen={setRightRailOpen} />
      </div>

      {installPrompt && (
        <button
          type="button"
          onClick={async () => {
            const prompt = installPrompt as Event & { prompt?: () => Promise<void> };
            await prompt.prompt?.();
            setInstallPrompt(null);
          }}
          className="focus-ring fixed bottom-[calc(4.9rem+env(safe-area-inset-bottom))] right-4 z-50 inline-flex min-h-10 items-center gap-2 rounded-full border border-rook-cyan/25 bg-rook-void/92 px-3 text-xs font-black uppercase tracking-[0.12em] text-rook-cyan shadow-panel backdrop-blur-xl md:hidden"
        >
          <Download className="h-4 w-4" />
          Install
        </button>
      )}

      <MobileNavigationBoundary>
        <nav className="rook-mobile-bottom-nav mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-rook-void/90 pl-[calc(0.45rem+env(safe-area-inset-left))] pr-[calc(0.45rem+env(safe-area-inset-right))] pt-1 backdrop-blur-2xl md:hidden">
          <div className="mx-auto grid h-11 max-w-md grid-cols-5 gap-1">
            {safeNavItems(mobileNavItems).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const classes = clsx(
                "focus-ring flex min-h-10 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[9px] font-bold transition duration-200 active:scale-95 xs:text-[9.5px]",
                active
                  ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_0_18px_rgba(53,216,255,0.08)]"
                  : "text-rook-muted hover:bg-white/[0.06] hover:text-white",
                item.href === "/feed#compose" && "text-rook-cyan",
              );
              if (item.href === "/feed#compose") {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      if (pathname === "/feed" && typeof window !== "undefined") window.dispatchEvent(new Event("rook:open-compose"));
                      else router.push("/feed#compose");
                    }}
                    className={classes}
                  >
                    <Icon className="h-[15px] w-[15px]" />
                    {item.label}
                  </button>
                );
              }
              return (
                <Link key={item.href} href={item.href} className={classes}>
                  <Icon className="h-[15px] w-[15px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </MobileNavigationBoundary>

      <div className="md:hidden">
        <MobileOperatorDrawer
          drawerOpen={drawerOpen}
          profile={profile}
          pathname={pathname}
          setDrawerOpen={setDrawerOpen}
        />
      </div>
    </div>
    </FeedShellBoundary>
  );
}

function MobileHeader({
  events,
  setDrawerOpen,
}: {
  events: NetworkEvent[];
  setDrawerOpen: (open: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-40 max-w-full overflow-hidden border-b border-white/10 bg-rook-void/82 px-[calc(0.65rem+env(safe-area-inset-left))] py-1.5 pr-[calc(0.65rem+env(safe-area-inset-right))] pt-[calc(0.35rem+env(safe-area-inset-top))] backdrop-blur-2xl">
      <div className="flex h-11 items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Open operator menu"
          onClick={() => setDrawerOpen(true)}
          className="focus-ring relative z-[80] grid h-10 w-10 touch-manipulation place-items-center rounded-full border border-white/10 bg-white/[0.07] text-rook-muted transition active:scale-95"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
        <Link href="/feed" aria-label="Rook feed" className="focus-ring relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-white/10 bg-rook-graphite shadow-glow">
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(53,216,255,0.55),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(138,92,255,0.5),transparent_38%)]" />
          <RookBirdIcon className="relative h-7 w-7 animate-rook-pulse" />
        </Link>
        <div className="flex items-center gap-1.5">
          <Link href="/search" aria-label="Search" className="focus-ring grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-rook-muted">
            <Search className="h-4 w-4" />
          </Link>
          <Link href="/alerts" aria-label="Alerts" className="focus-ring relative grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-rook-muted">
            <Bell className="h-4 w-4" />
            {events.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rook-cyan shadow-glow" />}
          </Link>
        </div>
      </div>
      <div className="mt-1 flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-2.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-rook-cyan" />
        <Link href="/search" className="min-w-0 flex-1 truncate text-xs font-semibold text-rook-muted">
          Search Signals, operators, narratives
        </Link>
      </div>
      {events.length > 0 && (
        <Link href="/alerts" className="mt-1.5 flex min-w-0 items-center gap-2 rounded-lg border border-rook-cyan/15 bg-rook-cyan/[0.055] px-2.5 py-1.5">
          <span className="network-pulse h-2 w-2 shrink-0 rounded-full bg-rook-cyan" />
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-rook-muted">{events[0]?.label ?? "Network notification"}</span>
          <span className="shrink-0 rounded-full bg-rook-cyan/15 px-2 py-0.5 text-[10px] font-black text-rook-cyan">{events.length}</span>
        </Link>
      )}
    </header>
  );
}

function TabletHeader({ setRightRailOpen }: { setRightRailOpen: (open: boolean) => void }) {
  return (
    <header className="sticky top-0 z-30 hidden border-b border-white/10 bg-rook-void/82 px-4 py-2.5 backdrop-blur-2xl md:block xl:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href="/feed" className="focus-ring rounded-lg">
          <RookMark compact />
        </Link>
        <button
          type="button"
          onClick={() => setRightRailOpen(true)}
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-black uppercase tracking-[0.12em] text-rook-muted"
        >
          <PanelRightOpen className="h-4 w-4 text-rook-cyan" />
          Intelligence
        </button>
      </div>
    </header>
  );
}

function DesktopSidebar({
  pathname,
  profile,
  sidebarCollapsed,
  setSidebarCollapsed,
}: {
  pathname: string | null;
  profile: Profile | null;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <aside
      className={clsx(
        "sticky top-0 hidden h-screen shrink-0 overflow-y-auto border-r border-white/10 px-2 py-3 transition-[width] duration-300 md:block",
        sidebarCollapsed ? "w-16" : "w-16 xl:w-44",
      )}
    >
      <div className="flex items-center justify-center gap-2 xl:justify-between">
        <span className={clsx(sidebarCollapsed ? "" : "xl:hidden")}><RookMark compact /></span>
        <span className={clsx("hidden", !sidebarCollapsed && "xl:block")}><RookMark /></span>
        <button
          type="button"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setSidebarCollapsed((value) => !value)}
          className="focus-ring hidden h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-rook-muted transition hover:text-white xl:grid"
        >
          {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="mt-5 space-y-3">
        {safeDesktopGroups(desktopNavGroups).map((group, groupIndex) => (
          <details key={group.label} open={groupIndex < 2} className="group">
            <summary className={clsx(
              "flex min-h-8 cursor-pointer list-none items-center justify-center rounded-lg px-2 text-[10px] font-black uppercase tracking-[0.16em] text-rook-muted transition hover:bg-white/[0.04] hover:text-white",
              !sidebarCollapsed && "xl:justify-between",
            )}>
              <span className={clsx("hidden", !sidebarCollapsed && "xl:inline")}>{group.label}</span>
              <span className={clsx("h-1.5 w-1.5 rounded-full bg-rook-cyan/60", !sidebarCollapsed && "xl:hidden")} />
              <span className={clsx("hidden text-rook-cyan transition group-open:rotate-90", !sidebarCollapsed && "xl:inline")}>›</span>
            </summary>
            <div className="mt-1 grid gap-1">
              {safeNavItems(group.items).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={clsx(
                      "focus-ring flex min-h-11 items-center justify-center gap-3 rounded-lg px-2 text-sm font-semibold transition",
                      !sidebarCollapsed && "xl:justify-start xl:px-3",
                      active
                        ? "accent-border text-white shadow-glow"
                        : "text-rook-muted hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className={clsx("hidden truncate", !sidebarCollapsed && "xl:inline")}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        ))}
      </nav>
      <Link
        href="/feed"
        title="Create Signal"
        className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white text-sm font-black text-rook-void transition hover:bg-rook-cyan"
      >
        <Plus className="h-4 w-4" />
        <span className={clsx("hidden", !sidebarCollapsed && "xl:inline")}>Create Signal</span>
      </Link>
      <div className={clsx("surface-card mt-4 hidden rounded-xl p-3", !sidebarCollapsed && "xl:block")}>
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
  );
}

function RightRailDrawer({
  events,
  rightRailOpen,
  setRightRailOpen,
}: {
  events: NetworkEvent[];
  rightRailOpen: boolean;
  setRightRailOpen: (open: boolean) => void;
}) {
  return (
    <div className={clsx("fixed inset-0 z-50 hidden max-w-full overflow-hidden md:block xl:hidden", rightRailOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <button
          type="button"
          aria-label="Close intelligence rail"
          onClick={() => setRightRailOpen(false)}
          className={clsx(
            "absolute inset-0 bg-rook-void/70 backdrop-blur-sm transition-opacity duration-300 ease-out",
            rightRailOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={clsx(
            "mobile-safe-bottom absolute bottom-0 right-0 top-0 flex w-[min(86%,340px)] max-w-[calc(100%-0.75rem)] flex-col overflow-y-auto overflow-x-hidden border-l border-white/10 bg-rook-ink/96 px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-panel transition-[clip-path,opacity] duration-300 ease-out",
            rightRailOpen ? "opacity-100 [clip-path:inset(0_0_0_0)]" : "opacity-0 [clip-path:inset(0_0_0_100%)]",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-rook-cyan">Intelligence</p>
            <button
              type="button"
              aria-label="Close intelligence rail"
              onClick={() => setRightRailOpen(false)}
              className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-rook-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <RightRail events={events} />
        </aside>
      </div>
  );
}

function MobileOperatorDrawer({
  drawerOpen,
  profile,
  pathname,
  setDrawerOpen,
}: {
  drawerOpen: boolean;
  profile: Profile | null;
  pathname: string | null;
  setDrawerOpen: (open: boolean) => void;
}) {
  const [startX, setStartX] = useState<number | null>(null);
  const menuItems = getMobileDrawerItems(profile);

  return (
    <div
      aria-hidden={!drawerOpen}
      className={clsx("fixed inset-0 z-[60] max-w-full overflow-hidden md:hidden", drawerOpen ? "pointer-events-auto" : "pointer-events-none")}
    >
        <button
          type="button"
          aria-label="Close operator menu"
          onClick={() => setDrawerOpen(false)}
          className={clsx(
            "absolute inset-0 z-[60] bg-rook-void/70 backdrop-blur-sm transition-opacity duration-300 ease-out",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          onTouchStart={(event) => setStartX(event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => {
            if (startX === null) return;
            const delta = (event.changedTouches[0]?.clientX ?? 0) - startX;
            if (delta < -72) setDrawerOpen(false);
            setStartX(null);
          }}
          className={clsx(
            "mobile-safe-bottom absolute bottom-0 left-0 top-0 z-[70] flex w-[80vw] max-w-[320px] touch-pan-y flex-col overflow-hidden border-r border-white/10 bg-rook-ink/96 px-2.5 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-panel transition-transform duration-300 ease-out will-change-transform",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0 overflow-hidden">
              <RookMark />
            </div>
            <button
              type="button"
              aria-label="Close operator menu"
              onClick={() => setDrawerOpen(false)}
              className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-rook-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 min-w-0 rounded-lg border border-rook-cyan/20 bg-rook-cyan/[0.055] p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rook-cyan">Operator</p>
            <p className="mt-2 break-words text-sm leading-5 text-rook-muted">
              {profile
                ? `${profile.display_name} is operating as @${profile.username}.`
                : "Complete onboarding to activate your operator profile."}
            </p>
          </div>
          <nav className="mt-3 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overflow-x-hidden pb-3">
            {safeNavItems(menuItems).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={clsx(
                    "focus-ring flex min-h-11 min-w-0 touch-manipulation items-center gap-2.5 rounded-xl px-2.5 text-sm font-bold transition active:scale-[0.99]",
                    active
                      ? "border border-rook-cyan/25 bg-rook-cyan/[0.12] text-white shadow-[0_0_22px_rgba(53,216,255,0.1)]"
                      : "border border-transparent text-rook-muted hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 break-words">{item.href === "/alerts" ? "Notifications" : item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto min-w-0 border-t border-white/10 pt-3">
            <OperatorSwitcher profile={profile} />
            <div className="mt-3">
              <SignOutButton className="w-full" />
            </div>
          </div>
        </aside>
      </div>
  );
}

function getMobileDrawerItems(profile: Profile | null): NavItem[] {
  const desired = ["/feed", "/pulse", "/flocks", "/briefs", "/alerts", "/profile", "/settings"];
  const items = appNavItems.filter((item) => desired.includes(item.href));
  const profileFlags = profile as (Profile & { role?: string | null; is_admin?: boolean | null }) | null;
  const isAdmin = Boolean(
    profileFlags?.is_admin ||
    profileFlags?.role === "admin" ||
    profileFlags?.role === "owner" ||
    profileFlags?.username === "admin",
  );

  if (isAdmin) {
    const ops = appNavItems.find((item) => item.href === "/ops");
    if (ops) return [...items, ops];
  }

  return items;
}

function RightRail({ events }: { events: NetworkEvent[] }) {
  const safeEvents = Array.isArray(events) ? events : [];
  return (
    <div className="min-w-0">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rook-muted" />
        <input
          disabled
          placeholder="Search Signals"
          className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-10 pr-3 text-sm text-rook-muted outline-none"
        />
      </div>
      <NetworkEventStream initialEvents={safeEvents} />
      <div className="surface-card mt-4 rounded-xl border-white/[0.07] bg-white/[0.032] p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-white">Autonomous Sync</p>
          <span className="network-pulse h-2 w-2 rounded-full bg-rook-cyan" />
        </div>
        <div className="mt-4 space-y-3">
          {["Operators aligned", "Pulse drift sampled", "Narratives indexed"].map((item, index) => (
            <div key={item}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold text-rook-muted">{item}</span>
                <span className="font-black text-white">{92 - index * 11}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="pulse-shimmer h-full rounded-full bg-gradient-to-r from-rook-blue via-rook-cyan to-rook-green" style={{ width: `${92 - index * 11}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface-card mt-4 rounded-xl border-white/[0.07] bg-white/[0.032] p-3">
        <p className="text-sm font-black text-white">Network Readiness</p>
        <div className="mt-4 space-y-4">
          {["Identity", "Signals", "Flocks", "AI Briefs"].map((item, index) => (
            <div key={item}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-semibold text-rook-muted">{item}</span>
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
    </div>
  );
}

const desktopNavGroups = [
  {
    label: "Signal",
    items: appNavItems.filter((item) => ["/feed", "/graph", "/pulse", "/narratives", "/briefs"].includes(item.href)),
  },
  {
    label: "Network",
    items: appNavItems.filter((item) => ["/agents", "/operators", "/flocks", "/rooms", "/alerts"].includes(item.href)),
  },
  {
    label: "Operator",
    items: appNavItems.filter((item) => ["/search", "/ingest", "/workspaces", "/ops", "/admin", "/profile", "/settings"].includes(item.href)),
  },
];

type NavItem = (typeof appNavItems)[number];

function safeNavItems(items: unknown): NavItem[] {
  return Array.isArray(items)
    ? items.filter((item): item is NavItem => Boolean(item?.href && item?.label && item?.icon))
    : [];
}

function safeDesktopGroups(groups: unknown): Array<{ label: string; items: NavItem[] }> {
  return Array.isArray(groups)
    ? groups
      .filter((group): group is { label: string; items: NavItem[] } => typeof group?.label === "string")
      .map((group) => ({ label: group.label, items: safeNavItems(group.items) }))
    : [];
}
