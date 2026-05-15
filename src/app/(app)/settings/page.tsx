export const runtime = "edge";

import { Bell, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PageHeader } from "@/components/shell/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Control centre"
        description="Settings are structured now so auth, notification, privacy, and AI controls can be connected without redesign."
        action={<SignOutButton />}
      />
      <section className="grid gap-4 px-4 py-5 sm:px-6 lg:px-8">
        {[
          {
            icon: ShieldCheck,
            title: "Account security",
            detail: "Supabase session, email, and sign-out controls arrive in Phase 2.",
          },
          {
            icon: Bell,
            title: "Pings",
            detail: "Notification routing will connect once Signals, follows, and Flocks are live.",
          },
          {
            icon: SlidersHorizontal,
            title: "AI Brief preferences",
            detail: "Summary style and source controls are planned for the Phase 7 AI integration.",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="surface-card rounded-xl p-5">
              <div className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rook-blue/15 text-rook-cyan">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-rook-muted">{item.detail}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
