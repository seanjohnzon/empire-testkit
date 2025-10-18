import fs from 'node:fs';
import path from 'node:path';
import { FnMap } from './fnMap';

const base = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
if (!base || !anon) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');

const METHOD_MAP: Record<string, "GET"|"POST"> = {
  'economy-stats': 'GET',
  'claim-rewards': 'POST',
  'sign-claim': 'POST',
  'referral-capture': 'POST',
  'train-unit': 'POST',
  'recycle-unit': 'POST',
  'open-pack': 'POST',
  'list-seasons': 'GET',
  'toggle-season': 'POST',
  // New functions
  'init-player': 'POST',
  'me': 'GET',
  'update-garage-slots': 'POST',
  'upgrade-garage': 'POST',
  'leaderboard': 'GET',
};

export function resolveFn(nameFromEnv: string | undefined, fallback: keyof typeof FnMap.CANON) {
  return FnMap.normalize(nameFromEnv, fallback);
}

// ---- scenario log buffer (written by vitest globalTeardown)
type ScenarioEntry = {
  ts: string;
  name: string;          // function name (canonical)
  url: string;
  method: string;
  request?: any;
  status: number;
  response?: any;
  durationMs: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __SCENARIOS__: ScenarioEntry[] | undefined;
}
if (!globalThis.__SCENARIOS__) {
  globalThis.__SCENARIOS__ = [];
}

export async function callEdge(
  name: keyof typeof FnMap.CANON | string,
  init: RequestInit & {
    body?: any;
    tolerateStatuses?: number[];
    label?: string; // optional extra label from tests (not required)
  } = {}
) {
  // Use name directly if it's one of our new functions, otherwise normalize through FnMap
  const canon = METHOD_MAP[String(name)] ? String(name) : FnMap.normalize(String(name), 'claim-rewards');
  const method = METHOD_MAP[canon] || (init.method as any) || 'POST';
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${anon}`,
    ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as any || {}),
  };
  const url = `${base}/functions/v1/${canon}`;

  const started = Date.now();
  let res: Response | any;
  let json: any = null;

  try {
    res = await fetch(url, {
      method,
      headers,
      body: method === 'POST' && init.body ? JSON.stringify(init.body) : undefined,
    });
    try { json = await (res as Response).json(); } catch {}
  } catch (e: any) {
    res = { status: 0, _netErr: e?.message || String(e) };
  }
  const durationMs = Date.now() - started;

  // push scenario entry
  globalThis.__SCENARIOS__!.push({
    ts: new Date().toISOString(),
    name: canon,
    url,
    method,
    request: init.body ?? null,
    status: (res as any)?.status ?? 0,
    response: json ?? null,
    durationMs,
  });

  const tolerate = init.tolerateStatuses || [];
  return {
    url,
    method,
    status: (res as any)?.status ?? 0,
    ok: tolerate.includes((res as any)?.status) || ((res as any)?.status >= 200 && (res as any)?.status < 300),
    json,
  };
}
