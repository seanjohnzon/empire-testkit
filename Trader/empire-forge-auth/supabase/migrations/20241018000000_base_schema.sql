-- 000_base_schema.sql
-- Base schema for Cars-themed Empire game
-- Creates core tables from scratch for brand new database

BEGIN;

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  referrer_wallet TEXT,
  garage_level SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles(wallet_address);

-- ===== SEASONS =====
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  emission_per_hour NUMERIC NOT NULL DEFAULT 100,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default Season 1
INSERT INTO seasons (name, is_active, emission_per_hour)
VALUES ('Season 1', TRUE, 100)
ON CONFLICT DO NOTHING;

-- ===== PLAYER UNITS (Cars) =====
CREATE TABLE IF NOT EXISTS player_units (
  id BIGSERIAL PRIMARY KEY,
  owner UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  wallet TEXT,
  name TEXT,
  unit_type TEXT,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_units_owner ON player_units(owner);
CREATE INDEX IF NOT EXISTS idx_player_units_wallet ON player_units(wallet);

-- ===== INVENTORY CURRENCY =====
CREATE TABLE IF NOT EXISTS inventory_currency (
  owner UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  war_bonds NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== ECONOMY LEDGER =====
CREATE TABLE IF NOT EXISTS economy_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_economy_ledger_user ON economy_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_economy_ledger_reason ON economy_ledger(reason);

-- ===== BOND LEDGER =====
CREATE TABLE IF NOT EXISTS bond_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bond_ledger_user ON bond_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_bond_ledger_season ON bond_ledger(season_id);
CREATE INDEX IF NOT EXISTS idx_bond_ledger_kind ON bond_ledger(kind);

-- ===== PACK ODDS =====
CREATE TABLE IF NOT EXISTS pack_odds (
  id SERIAL PRIMARY KEY,
  pack_type TEXT NOT NULL,
  tier_key TEXT NOT NULL,
  odds_pct NUMERIC NOT NULL,
  UNIQUE(pack_type, tier_key)
);

-- ===== PACK TYPES =====
CREATE TABLE IF NOT EXISTS pack_types (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  price_bonds NUMERIC NOT NULL DEFAULT 0,
  drops JSONB
);

-- Insert default booster pack
INSERT INTO pack_types (slug, display_name, price_bonds, drops)
VALUES ('booster', 'Booster Pack', 50, '[{"tier": "beater"}]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ===== REFERRALS =====
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_wallet TEXT NOT NULL,
  referred_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_wallet, referred_wallet)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);

COMMIT;

