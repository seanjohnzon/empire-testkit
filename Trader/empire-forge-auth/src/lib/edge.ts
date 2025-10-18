// Supabase Edge Function helper with robust error handling
const BASE = "https://miflbztkdctpibawermj.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZmxienRrZGN0cGliYXdlcm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTU3MTcsImV4cCI6MjA3NjAzMTcxN30.KE-lWqIEZR0T17Bd2HceLNM8HyTald0l_emlmHl7Va4";

export function edgeEnvOk() {
  return {
    hasBase: !!BASE,
    hasAnon: !!ANON,
    base: BASE,
  };
}

interface EdgeCallOptions {
  json?: any;
  method?: string;
  headers?: HeadersInit;
}

export async function callEdge<T = any>(
  name: string,
  init: EdgeCallOptions = {}
): Promise<T> {
  if (!BASE) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL - check Lovable App Secrets");
  }

  const url = `${BASE.replace(/\/$/, "")}/functions/v1/${name}`;
  const headers = new Headers(init.headers || {});

  // Ensure JSON and authorization headers
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (ANON && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${ANON}`);
  }

  const body = init.json !== undefined ? JSON.stringify(init.json) : undefined;

  console.log(`[edge] Calling ${name}`, { url, method: init.method || 'POST', hasBody: !!body });

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method || 'POST',
      body,
      headers,
      mode: "cors",
    });
  } catch (e: any) {
    const hint = `Network error calling ${url}. Check NEXT_PUBLIC_SUPABASE_URL and browser console.`;
    const error = new Error(`${hint} ${e?.message || ""}`.trim());
    console.error(`[edge] Network error:`, error);
    throw error;
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch (_) {
    // ignore JSON parse errors
  }

  console.log(`[edge] Response from ${name}`, {
    status: res.status,
    ok: res.ok,
    data: json
  });

  if (!res.ok) {
    const errorMsg = json?.error || `HTTP ${res.status} calling ${name}`;
    console.error(`[edge] Error response:`, { url, status: res.status, error: errorMsg });
    throw new Error(errorMsg);
  }

  return json as T;
}
