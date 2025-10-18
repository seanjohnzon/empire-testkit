/**
 * Edge Function Caller
 * Uses environment variables for Supabase configuration
 */

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!base || !anon) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const METHOD_MAP: Record<string, "GET" | "POST"> = {
  'economy-stats': 'GET',
  'list-seasons': 'GET',
  'claim-rewards': 'POST',
  'sign-claim': 'POST',
  'referral-capture': 'POST',
  'train-unit': 'POST',
  'recycle-unit': 'POST',
  'open-pack': 'POST',
  'toggle-season': 'POST',
};

export interface EdgeResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  message?: string;
}

export async function callEdge<T = any>(
  functionName: string,
  options: {
    body?: any;
    method?: 'GET' | 'POST';
  } = {}
): Promise<EdgeResponse<T>> {
  const method = options.method || METHOD_MAP[functionName] || 'POST';
  const url = `${base}/functions/v1/${functionName}`;

  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${anon}`,
    };

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: method === 'POST' && options.body ? JSON.stringify(options.body) : undefined,
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // No JSON response
    }

    if (res.ok) {
      return {
        ok: true,
        status: res.status,
        data,
      };
    } else {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: data?.error || `HTTP ${res.status}`,
        message: data?.message || res.statusText,
      };
    }
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Network error',
      message: error?.message || String(error),
    };
  }
}


