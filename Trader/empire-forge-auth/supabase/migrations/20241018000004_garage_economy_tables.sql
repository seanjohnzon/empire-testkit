-- 20241018000004_garage_economy_tables.sql
-- Purpose: Add garage slots, claims, upgrades, and economy audit tables
-- Idempotent and additive - does not modify existing car_catalog or car_tiers

BEGIN;

-- ===== GARAGE SLOTS (Active slots) =====
CREATE TABLE IF NOT EXISTS garage_slots (
  id BIGSERIAL PRIMARY KEY,
  owner UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  unit_id BIGINT NOT NULL REFERENCES player_units(id) ON DELETE CASCADE,
  slot_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner, slot_position),
  UNIQUE(unit_id)
);

CREATE INDEX IF NOT EXISTS idx_garage_slots_owner ON garage_slots(owner);
CREATE INDEX IF NOT EXISTS idx_garage_slots_unit ON garage_slots(unit_id);

-- ===== CLAIM HISTORY (Earnings tracking) =====
CREATE TABLE IF NOT EXISTS claim_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount_claimed NUMERIC NOT NULL,
  motor_power_at_claim NUMERIC NOT NULL,
  network_share_pct NUMERIC NOT NULL,
  hours_since_last_claim NUMERIC NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_history_user ON claim_history(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_history_claimed_at ON claim_history(claimed_at DESC);

-- ===== GARAGE UPGRADES (Audit trail) =====
CREATE TABLE IF NOT EXISTS garage_upgrades (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  cost_oil NUMERIC NOT NULL,
  upgraded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garage_upgrades_user ON garage_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_garage_upgrades_upgraded_at ON garage_upgrades(upgraded_at DESC);

-- ===== PACK OPENINGS (Audit trail) =====
CREATE TABLE IF NOT EXISTS pack_openings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  pack_type TEXT NOT NULL,
  cost_bonds NUMERIC NOT NULL DEFAULT 0,
  reward_unit_id BIGINT REFERENCES player_units(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pack_openings_user ON pack_openings(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_openings_opened_at ON pack_openings(opened_at DESC);

-- ===== REFERRAL EARNINGS (Commission tracking) =====
CREATE TABLE IF NOT EXISTS referral_earnings (
  id BIGSERIAL PRIMARY KEY,
  referrer_wallet TEXT NOT NULL,
  referred_wallet TEXT NOT NULL,
  generation INTEGER NOT NULL CHECK (generation IN (1,2)),
  percentage NUMERIC NOT NULL,
  amount_earned NUMERIC NOT NULL,
  from_claim_id BIGINT REFERENCES claim_history(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON referral_earnings(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred ON referral_earnings(referred_wallet);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_claim ON referral_earnings(from_claim_id);

-- ===== GARAGE LEVELS CONFIG =====
CREATE TABLE IF NOT EXISTS garage_levels (
  level INTEGER PRIMARY KEY,
  capacity INTEGER NOT NULL,
  daily_pack_limit INTEGER NOT NULL,
  upgrade_cost_oil NUMERIC NOT NULL
);

-- Seed deterministic L1–L10 (UPSERT for idempotency)
INSERT INTO garage_levels (level, capacity, daily_pack_limit, upgrade_cost_oil) VALUES
  (1,  4,  10,    1000),
  (2,  6,  20,    2000),
  (3,  8,  30,    4500),
  (4,  10, 40,    9000),
  (5,  12, 50,   20000),
  (6,  14, 60,   50000),
  (7,  16, 70,  100000),
  (8,  18, 80,  200000),
  (9,  20, 90,  450000),
  (10, 22, 100, 900000)
ON CONFLICT (level) DO UPDATE
SET capacity = EXCLUDED.capacity,
    daily_pack_limit = EXCLUDED.daily_pack_limit,
    upgrade_cost_oil = EXCLUDED.upgrade_cost_oil;

-- ===== NETWORK MOTOR POWER VIEW =====
-- Sum of all motor power from slotted cars
-- Formula: HP × Level Multiplier × (1 + Grip%)
CREATE OR REPLACE VIEW v_network_motor_power AS
SELECT
  COALESCE(
    SUM(
      pu.hp_base * COALESCE(lm.mult, 1.0) * (1 + pu.grip_pct/100.0)
    ), 0
  )::NUMERIC AS network_mp
FROM garage_slots gs
JOIN player_units pu ON pu.id = gs.unit_id
LEFT JOIN car_level_multipliers lm ON lm.level = pu.level;

-- ===== ADD COLUMNS TO EXISTING TABLES (IF NEEDED) =====
-- Ensure player_units has all needed columns for Cars system
ALTER TABLE player_units
  ADD COLUMN IF NOT EXISTS tier_key TEXT,
  ADD COLUMN IF NOT EXISTS level SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hp_base NUMERIC,
  ADD COLUMN IF NOT EXISTS grip_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel INTEGER;

-- Ensure profiles has garage_level (should exist from base schema)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS garage_level SMALLINT NOT NULL DEFAULT 1;

-- Ensure inventory_currency exists for $OIL balance
CREATE TABLE IF NOT EXISTS inventory_currency (
  owner UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  war_bonds NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

-- Verification queries:
-- SELECT * FROM garage_levels ORDER BY level;
-- SELECT COUNT(*) FROM garage_slots;
-- SELECT network_mp FROM v_network_motor_power;

