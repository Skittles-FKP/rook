export const runtime = "edge";
export const preferredRegion = "auto";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getViewer } from "@/lib/data/signals";
import { getNetworkEvents } from "@/lib/data/pulse";
import { ensureAutonomousOperatorProfiles } from "@/lib/seeded-ai-activity";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  await ensureAutonomousOperatorProfiles({ source: "application-layout" }).catch((error) => {
    console.error("[autonomous-operators] startup bootstrap failed", error);
  });

  const { user, profile } = await getViewer();

  if (!user) {
    redirect("/login");
  }

  const events = await getNetworkEvents();

  return (
    <AppShell profile={profile} events={events}>
      {children}
    </AppShell>
  );
}
