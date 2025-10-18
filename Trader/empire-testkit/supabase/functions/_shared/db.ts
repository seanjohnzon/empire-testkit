import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
export function svc() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}
export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};
export function json(data: unknown, status=200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type":"application/json", ...CORS }});
}
export function method(req: Request, m: "GET"|"POST") {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== m) return new Response("Method Not Allowed", { status: 405, headers: CORS });
  return null;
}
export async function getActiveSeason(s: any) {
  const { data, error } = await s.from("seasons").select().eq("is_active", true).order("start_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("season query failed: "+error.message);
  if (!data) throw new Error("no active season");
  return data;
}
