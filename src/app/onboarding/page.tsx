export const runtime = "edge";

import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { RookMark } from "@/components/brand";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getViewer } from "@/lib/data/signals";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  const { user, profile } = await getViewer();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  if (profile?.onboarding_completed) {
    redirect("/feed");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <RookMark />
        </div>
        <OnboardingForm profile={profile} />
      </div>
    </main>
  );
}
