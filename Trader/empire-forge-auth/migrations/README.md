# Empire Supabase Migrations

This directory contains SQL migration files for the Empire project (Supabase project: `miflbztkdctpibawermj`).

## Migration History

### 001_cars_theme.sql
**Date:** 2025-10-18  
**Status:** ✅ Complete

**Purpose:** Migrate from Soldier/Rarity theme to Cars theme with 7 tiers × 3 levels system.

**Changes:**
- Created `car_tiers` table (7 tiers: beater → godspeed)
- Created `car_level_multipliers` table (3 levels with multipliers)
- Added Cars columns to `player_units`: `tier_key`, `level`, `hp_base`, `grip_pct`, `fuel`
- Backfilled existing units with Cars stats using rarity mapping

**Documentation:** See `CARS_MIGRATION_COMPLETE.md` in project root.

---

### 002_cleanup_legacy_soldiersgpu.sql
**Date:** 2025-10-18  
**Status:** 🔄 Ready to Run

**Purpose:** Hard cutover to Cars-only content. Remove all Soldier/GPU era artifacts (tables, rows, enums).

**Changes:**
- **Snapshots:** Archive all legacy data to `_archive` schema
- **Cleanup:** Delete legacy rows from `player_units` and `pack_odds`
- **Normalize:** Update `economy_ledger` reasons (`open-crate` → `open-pack`, etc.)
- **Schema:** Remove `data_center_level` from `profiles`, ensure `garage_level` exists
- **Tables:** Rename legacy tables to `*_old` (soldier_tiers, gpu_tiers, data_center_levels, etc.)
- **Baseline:** Re-seed `pack_odds` with Cars-only tier distribution

**Safety Features:**
- Idempotent (safe to re-run)
- Atomic transaction (BEGIN/COMMIT)
- Full archival before deletion (`_archive` schema)
- Tables renamed (not dropped) for rollback capability

**How to Run:**
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/miflbztkdctpibawermj/sql
2. Copy entire contents of `002_cleanup_legacy_soldiersgpu.sql`
3. Paste and execute (Cmd/Ctrl + Enter)
4. Run healthchecks from `HEALTHCHECKS.sql` to verify success
5. Review full verification guide: `POST_MIGRATION_VERIFICATION.md`

**Acceptance Criteria:**
- ✅ No soldier/gpu units remain in `player_units`
- ✅ Only 7 Cars tiers in `pack_odds` (beater, street, sport, supercar, hypercar, prototype, godspeed)
- ✅ All units have valid Cars `tier_key` and `level` (1-3)
- ✅ Legacy tables archived and renamed to `*_old`
- ✅ Economy ledger normalized (no legacy reason strings)
- ✅ Edge functions work correctly (testkit passes)

**Related Files:**
- `HEALTHCHECKS.sql` - Quick verification queries
- `POST_MIGRATION_VERIFICATION.md` - Comprehensive verification guide

---

## Migration Best Practices

### Before Running Any Migration:

1. **Backup:** Ensure Supabase automatic backups are enabled (they are by default)
2. **Read First:** Review entire migration file before executing
3. **Test Environment:** Run on staging/dev first if possible
4. **Archive Schema:** Migrations should create `_archive` schema for snapshots
5. **Idempotent:** Migrations should be safe to re-run (use `IF EXISTS`, `ON CONFLICT`, etc.)

### After Running Migration:

1. **Healthchecks:** Run all verification queries
2. **Edge Functions:** Test all affected functions
3. **Frontend:** Verify UI displays correct data
4. **Testkit:** Run full test suite (`empire-testkit`)
5. **Document:** Update project docs and TASK.md

### If Migration Fails:

1. **Transaction Rollback:** If wrapped in BEGIN/COMMIT, failure auto-rolls back
2. **Check Logs:** Supabase Dashboard → Logs
3. **Review Error:** Identify which statement failed
4. **Fix & Retry:** Correct issue and re-run (if idempotent)
5. **Rollback:** Use `_archive` schema to restore data if needed

---

## Edge Functions Integration

Migrations may affect edge functions. Always verify:

### Current Active Functions (Cars Theme):
- `open-pack` - Grants cars with tier_key, level=1
- `train-unit` - Upgrades level only (1→3)
- `recycle-unit` - 20% promote to next tier, 80% burn
- `claim-rewards` - MP from car stats (hp × [1 + grip%])
- `list-units` - Lists player's cars
- `list-seasons` - Lists available seasons
- `economy-stats` - Aggregate economy metrics
- `referral-capture` - Track referrals

### Legacy Functions to Remove:
- `open-crate` (renamed to `open-pack`)
- `train-soldier` (renamed to `train-unit`)
- `recycle-soldier` (renamed to `recycle-unit`)
- `upgrade-data-center` (removed)
- `list-gpus` (removed)
- Any mining/asic/GPU related functions

---

## Schema Evolution

### Current Schema (Cars Theme):

**Core Tables:**
- `profiles` - User profiles with `garage_level`
- `player_units` - Cars with `tier_key`, `level`, `hp_base`, `grip_pct`, `fuel`
- `car_tiers` - 7 tier definitions
- `car_level_multipliers` - 3 level multipliers
- `pack_odds` - Drop rates for Cars tiers
- `seasons` - Season management
- `economy_ledger` - Bond transaction history
- `referrals` - Referral tracking

**Legacy Tables (post-migration 002):**
- `*_old` tables - Archived legacy tables (soldier_tiers_old, gpu_tiers_old, etc.)
- `_archive.*` - Full snapshots of pre-migration state

---

## Support

For migration issues or questions:

1. Check `POST_MIGRATION_VERIFICATION.md` for troubleshooting
2. Review Supabase logs and error messages
3. Inspect `_archive` schema for original data
4. Run testkit to identify specific failures
5. Contact project maintainer with error details

---

**Last Updated:** October 18, 2025  
**Project:** Empire (miflbztkdctpibawermj)  
**Current Theme:** Cars (7 tiers × 3 levels)

