-- 002_cleanup_legacy_soldiersgpu.sql
-- Purpose: Hard cutover from Soldier/GPU themes to Cars-only.
-- Strategy: snapshot -> purge legacy rows -> rename legacy tables -> re-seed car odds.
-- Idempotent & safe to re-run.

BEGIN;

-- 0) Safety: archive schema
CREATE SCHEMA IF NOT EXISTS _archive;

-- 1) Snapshots (create once, keep forever)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN (
        'soldier_tiers','soldier_catalog','gpu_tiers','gpu_catalog',
        'data_center_levels','pack_types','rarity','pack_odds','player_units'
      )
  LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS _archive.%I AS TABLE public.%I WITH DATA;',
      t || '_snapshot', t
    );
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='player_units') THEN
    CREATE TABLE IF NOT EXISTS _archive.player_units_legacy_rows AS
    SELECT *
    FROM player_units
    WHERE name ~* '(infantry|cavalry|archer|tank|sniper|rtx|gtx|bitmain|antminer|miner|asic|s19|4090|3060|1050)'
       OR tier_key::text ~* '(soldier|gpu|mining|legendary|epic|ultra_?rare|rare|uncommon|common)';
  END IF;
END $$;

-- 2) Normalize economy_ledger reasons (do NOT delete history)
UPDATE economy_ledger
SET reason = CASE
  WHEN reason ILIKE 'open-crate' THEN 'open-pack'
  WHEN reason ILIKE 'upgrade-base' THEN 'train'
  WHEN reason ILIKE 'recycle-soldier' THEN 'recycle'
  ELSE reason
END
WHERE reason ILIKE 'open-crate'
   OR reason ILIKE 'upgrade-base'
   OR reason ILIKE 'recycle-soldier';

-- 3) Profiles: ensure garage_level exists; drop legacy data_center_level if present
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS garage_level SMALLINT NOT NULL DEFAULT 1;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='data_center_level'
  ) THEN
    ALTER TABLE profiles DROP COLUMN data_center_level;
  END IF;
END $$;

-- 4) Purge legacy rows from shared tables
-- player_units: remove Soldiers/GPUs entirely
DELETE FROM player_units
WHERE name ~* '(infantry|cavalry|archer|tank|sniper|rtx|gtx|bitmain|antminer|miner|asic|s19|4090|3060|1050)'
   OR tier_key::text ~* '(soldier|gpu|mining|legendary|epic|ultra_?rare|rare|uncommon|common)';

-- pack_odds: remove everything except Cars booster odds (we will re-seed below)
DELETE FROM pack_odds
WHERE pack_type <> 'booster'
   OR tier_key::text ~* '(soldier|gpu|mining|legendary|epic|ultra_?rare|rare|uncommon|common)';

-- 5) Rename legacy tables (kept for rollback; no longer referenced by code)
DO $$ BEGIN
  IF to_regclass('public.soldier_tiers') IS NOT NULL THEN
    ALTER TABLE soldier_tiers RENAME TO soldier_tiers_old;
  END IF;
  IF to_regclass('public.soldier_catalog') IS NOT NULL THEN
    ALTER TABLE soldier_catalog RENAME TO soldier_catalog_old;
  END IF;
  IF to_regclass('public.gpu_tiers') IS NOT NULL THEN
    ALTER TABLE gpu_tiers RENAME TO gpu_tiers_old;
  END IF;
  IF to_regclass('public.gpu_catalog') IS NOT NULL THEN
    ALTER TABLE gpu_catalog RENAME TO gpu_catalog_old;
  END IF;
  IF to_regclass('public.data_center_levels') IS NOT NULL THEN
    ALTER TABLE data_center_levels RENAME TO data_center_levels_old;
  END IF;
  IF to_regclass('public.pack_types') IS NOT NULL THEN
    ALTER TABLE pack_types RENAME TO pack_types_old;
  END IF;
  IF to_regclass('public.rarity') IS NOT NULL THEN
    ALTER TABLE rarity RENAME TO rarity_old;
  END IF;
END $$;

-- 6) Cars-only baseline odds (re-seed)
-- NOTE: tier_key values must match car_tiers table keys used by the backend.
-- Use lowercase snake_case keys that already exist in 001_cars migration: 
-- beater, street, sport, supercar, hypercar, prototype, godspeed
DELETE FROM pack_odds WHERE pack_type='booster';

INSERT INTO pack_odds (pack_type, tier_key, odds_pct)
VALUES
  ('booster','beater',    40.00),
  ('booster','street',    25.00),
  ('booster','sport',     15.00),
  ('booster','supercar',  10.00),
  ('booster','hypercar',   6.00),
  ('booster','prototype',  3.00),
  ('booster','godspeed',   1.00)
ON CONFLICT DO NOTHING;

-- 7) Index sanity
CREATE INDEX IF NOT EXISTS ix_player_units_wallet ON player_units(wallet);

COMMIT;

-- 8) Healthchecks (informational; harmless if run)
-- SELECT COUNT(*) AS soldier_like FROM player_units WHERE name ~* '(infantry|cavalry|archer|tank|sniper)';
-- SELECT COUNT(*) AS gpu_like     FROM player_units WHERE name ~* '(rtx|gtx|bitmain|antminer|miner|asic|s19|4090|3060|1050)';
-- SELECT pack_type, tier_key::text, odds_pct FROM pack_odds ORDER BY odds_pct DESC;

