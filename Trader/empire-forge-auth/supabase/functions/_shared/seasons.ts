import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getActiveSeason(svc: any) {
  const { data, error } = await svc
    .from("seasons")
    .select()
    .eq("is_active", true)
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("season query failed: " + error.message);
  if (!data) throw new Error("no active season");
  return data as any;
}
