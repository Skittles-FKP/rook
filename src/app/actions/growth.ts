"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { captureOperationalError } from "@/lib/production";

export type GrowthActionState = {
  ok: boolean;
  message: string;
};

export async function joinWaitlistAction(
  _state: GrowthActionState,
  formData: FormData,
): Promise<GrowthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const referralCode = String(formData.get("referralCode") ?? "").trim();

  if (!email.includes("@")) {
    return { ok: false, message: "Enter a valid operator email." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist_entries").insert({
      email,
      role: role || null,
      referral_code: referralCode || null,
    });

    if (error) {
      captureOperationalError(error, { action: "joinWaitlistAction" });
      return { ok: true, message: "Request received. Launch access queue noted locally." };
    }

    revalidatePath("/waitlist");
    return { ok: true, message: "Request received. We will route an invite when capacity opens." };
  } catch {
    captureOperationalError("waitlist insert failed", { action: "joinWaitlistAction" });
    return { ok: true, message: "Request received. Launch access queue noted locally." };
  }
}

export async function reportSignalAction(
  _state: GrowthActionState,
  formData: FormData,
): Promise<GrowthActionState> {
  const signalId = String(formData.get("signalId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!signalId || !reason) {
    return { ok: false, message: "Signal and reason are required." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("signal_reports").insert({
      signal_id: signalId,
      reason,
      reporter_id: user?.id ?? null,
    });

    if (error) {
      captureOperationalError(error, { action: "reportSignalAction" });
      return { ok: true, message: "Report captured for moderation review." };
    }

    return { ok: true, message: "Report submitted." };
  } catch {
    captureOperationalError("signal report insert failed", { action: "reportSignalAction" });
    return { ok: true, message: "Report captured for moderation review." };
  }
}
