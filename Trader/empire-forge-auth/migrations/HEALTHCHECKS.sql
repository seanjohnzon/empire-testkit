-- ========================================
-- POST-MIGRATION HEALTHCHECKS
-- Migration: 002_cleanup_legacy_soldiersgpu.sql
-- Run these queries AFTER migration to verify success
-- ========================================

-- 1) VERIFY NO LEGACY UNITS REMAIN
-- Expected: soldier_like = 0, gpu_like = 0
SELECT
  (SELECT COUNT(*) FROM player_units WHERE name ~* '(infantry|cavalry|archer|tank|sniper)') AS soldier_like,
  (SELECT COUNT(*) FROM player_units WHERE name ~* '(rtx|gtx|bitmain|antminer|miner|asic|s19|4090|3060|1050)') AS gpu_like;

-- 2) VERIFY PACK ODDS ARE CARS-ONLY
-- Expected: Exactly 7 rows with Cars tier_key values
SELECT pack_type, tier_key::text, odds_pct
FROM pack_odds
ORDER BY odds_pct DESC
LIMIT 20;

-- 3) SAMPLE RECENT PLAYER UNITS
-- Expected: Only Cars tier_key values, levels 1-3
SELECT 
  id, 
  wallet, 
  tier_key::text, 
  level, 
  name, 
  hp_base, 
  grip_pct,
  fuel,
  acquired_at
FROM player_units
ORDER BY acquired_at DESC
LIMIT 25;

-- 4) VERIFY LEGACY TABLES WERE ARCHIVED
-- Expected: Multiple *_snapshot tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = '_archive' 
ORDER BY table_name;

-- 5) VERIFY LEGACY TABLES WERE RENAMED
-- Expected: Tables ending in _old (if they existed pre-migration)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%_old'
ORDER BY table_name;

-- 6) VERIFY PROFILES SCHEMA
-- Expected: garage_level exists, data_center_level removed
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('garage_level', 'data_center_level')
ORDER BY column_name;

-- 7) VERIFY ECONOMY LEDGER NORMALIZATION
-- Expected: Zero rows (all legacy reasons normalized)
SELECT DISTINCT reason
FROM economy_ledger
WHERE reason IN ('open-crate', 'upgrade-base', 'recycle-soldier')
ORDER BY reason;

-- 8) CHECK CAR TIERS INTEGRITY
-- Expected: Exactly 7 tiers with correct stats
SELECT tier_key, display, hp_base, fuel, grip_pct
FROM car_tiers
ORDER BY hp_base;

-- 9) COMPREHENSIVE STATS
-- Expected: All units are Cars with valid stats
SELECT 
  tier_key::text,
  COUNT(*) AS unit_count,
  COUNT(DISTINCT level) AS distinct_levels,
  MIN(level) AS min_level,
  MAX(level) AS max_level
FROM player_units
GROUP BY tier_key
ORDER BY MIN(hp_base);

-- ========================================
-- PASS CONDITIONS:
-- 1) soldier_like = 0, gpu_like = 0
-- 2) Exactly 7 pack_odds rows (Cars tiers)
-- 3) All player_units have Cars tier_key
-- 4) Archive tables exist in _archive schema
-- 5) Legacy tables renamed to *_old
-- 6) profiles has garage_level, not data_center_level
-- 7) No legacy reason strings in economy_ledger
-- 8) car_tiers has exactly 7 rows
-- ========================================

