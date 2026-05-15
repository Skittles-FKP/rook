import { getViewer } from "@/lib/data/signals";
import type { OperatorAlert } from "@/lib/supabase/types";

export async function getOperatorNotifications(): Promise<OperatorAlert[]> {
  const { supabase, user } = await getViewer();

  if (!supabase || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("operator_alerts")
    .select("*")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data) {
    return [];
  }

  return data as OperatorAlert[];
}
