export const runtime = "edge";
export const preferredRegion = "auto";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getViewer } from "@/lib/data/signals";
import { getNetworkEvents } from "@/lib/data/pulse";
import { bootstrapAutonomousOperatorProfilesInBackground } from "@/lib/seeded-ai-activity";

export const dynamic = "force-dynamic";

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  bootstrapAutonomousOperatorProfilesInBackground({ source: "application-layout" });

  const { user, profile } = await getViewer();

  if (!user) {
    redirect("/login");
  }

  const events = await getNetworkEvents().catch((error) => {
    console.warn("[application-layout] getNetworkEvents failed; rendering shell without live rail", error);
    return [];
  });

  return (
    <AppShell profile={profile ?? null} events={Array.isArray(events) ? events : []}>
      {children}
    </AppShell>
  );
}
