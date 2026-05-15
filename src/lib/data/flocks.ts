import { getViewer } from "@/lib/data/signals";
import { logSupabaseQueryError, logSupabaseQueryException } from "@/lib/supabase/errors";
import type { Flock } from "@/lib/supabase/types";

export type FlockSummary = Flock & {
  members_count: number;
  viewer_is_member: boolean;
};

export async function getFlocks(): Promise<FlockSummary[]> {
  const { supabase, user } = await getViewer();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase.from("flocks").select("*").order("created_at", { ascending: false });

    if (error) {
      logSupabaseQueryError("getFlocks", "flocks.select(*).order(created_at desc)", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const ids = data.map((flock) => flock.id);
    const [{ data: memberships, error: membershipsError }, { data: viewerMemberships, error: viewerMembershipsError }] = await Promise.all([
      supabase.from("flock_members").select("flock_id").in("flock_id", ids),
      user
        ? supabase.from("flock_members").select("flock_id").eq("user_id", user.id).in("flock_id", ids)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (membershipsError) {
      logSupabaseQueryError("getFlocks.memberships", "flock_members.select(flock_id).in(flock_id)", membershipsError);
    }

    if (viewerMembershipsError) {
      logSupabaseQueryError("getFlocks.viewerMemberships", "flock_members.select(flock_id).eq(user_id).in(flock_id)", viewerMembershipsError);
    }

    const counts = new Map<string, number>();
    for (const membership of memberships ?? []) {
      counts.set(membership.flock_id, (counts.get(membership.flock_id) ?? 0) + 1);
    }

    const joined = new Set((viewerMemberships ?? []).map((item) => item.flock_id));

    return data.map((flock) => ({
      ...flock,
      members_count: counts.get(flock.id) ?? 0,
      viewer_is_member: joined.has(flock.id),
    }));
  } catch (error) {
    logSupabaseQueryException("getFlocks", "flocks + flock_members feed support queries", error);
    return [];
  }
}
