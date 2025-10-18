const CANON = {
  'claim-rewards': 'claim-rewards',
  'economy-stats': 'economy-stats',
  'open-pack': 'open-pack',
  'train-unit': 'train-unit',
  'recycle-unit': 'recycle-unit',
  'referral-capture': 'referral-capture',
  'sign-claim': 'sign-claim',
  // admin (optional; may not exist)
  'list-seasons': 'list-seasons',
  'toggle-season': 'toggle-season',
} as const;

const ALIASES: Record<string, keyof typeof CANON> = {
  'claim': 'claim-rewards',
  'claim_rewards': 'claim-rewards',
  'economy': 'economy-stats',
  'stats': 'economy-stats',
  'open': 'open-pack',
  'pack': 'open-pack',
  'train': 'train-unit',
  'recycle': 'recycle-unit',
  'referral': 'referral-capture',
  'ref': 'referral-capture',
  'sign': 'sign-claim',
  'sign_claim': 'sign-claim',
  'list': 'list-seasons',
  'toggle': 'toggle-season',
};

const VALID = new Set(Object.keys(CANON));

function normalize(value?: string, fallback: keyof typeof CANON): keyof typeof CANON {
  if (!value || typeof value !== 'string') return fallback;
  let v = value.trim().toLowerCase();

  // strip unsafe chars
  v = v.replace(/[^a-z0-9\-]/g, '');

  // short-circuit nonsense like "200", "n"
  if (v.length < 3) return fallback;
  if (/^\d+$/.test(v)) return fallback;

  if (VALID.has(v)) return v as keyof typeof CANON;
  if (v in ALIASES) return ALIASES[v];

  return fallback;
}

export const FnMap = {
  CANON,
  normalize,
};

