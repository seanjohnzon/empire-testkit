import 'dotenv/config';

const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const anon = process.env.SUPABASE_ANON_KEY;

if (!base || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');

export async function callEdge(name: string, init: RequestInit & { body?: any } = {}) {
  const url = `${base}/functions/v1/${name}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: anon!,
    Authorization: `Bearer ${anon!}`,
    ...(init.headers || {})
  };
  let body = (init as any).body;
  if (body && typeof body !== 'string') body = JSON.stringify(body);
  const res = await fetch(url, { method: 'POST', ...init, headers, body });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}
