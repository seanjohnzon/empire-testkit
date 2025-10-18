# Post-Migration Verification Guide
## Migration 002: Cleanup Legacy Soldier/GPU Data

**Migration File:** `002_cleanup_legacy_soldiersgpu.sql`  
**Date:** October 18, 2025  
**Project:** Empire (Supabase: miflbztkdctpibawermj)

---

## 📋 Pre-Migration Checklist

Before running the migration:

1. ✅ **Backup Confirmation**
   - Migration creates `_archive` schema automatically
   - All legacy tables/rows will be snapshotted before deletion
   - Tables are renamed to `*_old` (not dropped) for rollback safety

2. ✅ **Active Season Check**
   ```sql
   SELECT * FROM seasons WHERE is_active = true;
   ```
   Ensure you have an active season for ledger entries.

3. ✅ **Current State Audit**
   ```sql
   -- Count existing legacy units
   SELECT
     COUNT(*) FILTER (WHERE name ~* '(infantry|cavalry|archer|tank|sniper)') AS soldier_count,
     COUNT(*) FILTER (WHERE name ~* '(rtx|gtx|bitmain|antminer|miner|asic|s19|4090|3060|1050)') AS gpu_count,
     COUNT(*) FILTER (WHERE tier_key IN ('beater','street','sport','supercar','hypercar','prototype','godspeed')) AS car_count,
     COUNT(*) AS total_units
   FROM player_units;
   ```

---

## 🚀 Running the Migration

**Step 1: Open Supabase SQL Editor**
- Navigate to: https://supabase.com/dashboard/project/miflbztkdctpibawermj/sql
- Or: Project → SQL Editor

**Step 2: Execute Migration**
```sql
-- Copy entire contents of 002_cleanup_legacy_soldiersgpu.sql
-- Paste into SQL Editor
-- Click "Run" or press Cmd/Ctrl + Enter
```

**Step 3: Review Execution Results**
- Check for any errors in the output
- Migration is wrapped in `BEGIN`/`COMMIT` transaction (atomic)
- If errors occur, transaction will rollback automatically

---

## ✅ Post-Migration Healthchecks

### 1. Verify No Legacy Units Remain

```sql
SELECT
  (SELECT COUNT(*) FROM player_units WHERE name ~* '(infantry|cavalry|archer|tank|sniper)') AS soldier_like,
  (SELECT COUNT(*) FROM player_units WHERE name ~* '(rtx|gtx|bitmain|antminer|miner|asic|s19|4090|3060|1050)') AS gpu_like;
```

**Expected Result:**
```
soldier_like | gpu_like
-------------|----------
     0       |    0
```

---

### 2. Verify Pack Odds Are Cars-Only

```sql
SELECT pack_type, tier_key::text, odds_pct
FROM pack_odds
ORDER BY odds_pct DESC
LIMIT 20;
```

**Expected Result:**
```
pack_type | tier_key  | odds_pct
----------|-----------|----------
booster   | beater    | 40.00
booster   | street    | 25.00
booster   | sport     | 15.00
booster   | supercar  | 10.00
booster   | hypercar  | 6.00
booster   | prototype | 3.00
booster   | godspeed  | 1.00
```

Total: Exactly 7 rows (Cars tiers only)

---

### 3. Sample Recent Player Units

```sql
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
```

**Expected Results:**
- `tier_key` values: Only `beater`, `street`, `sport`, `supercar`, `hypercar`, `prototype`, `godspeed`
- `level` values: Only 1, 2, or 3
- `name` field: May be NULL (cars don't have individual names yet)
- `hp_base`, `grip_pct`, `fuel`: Match car_tiers values

---

### 4. Verify Legacy Tables Were Archived

```sql
-- Check archive schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = '_archive';

-- List archived tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = '_archive' 
ORDER BY table_name;
```

**Expected Tables:**
- `pack_odds_snapshot`
- `player_units_legacy_rows` (only legacy units)
- `player_units_snapshot` (all units pre-migration)
- Plus any of: `soldier_tiers_snapshot`, `gpu_tiers_snapshot`, `data_center_levels_snapshot`, etc.

---

### 5. Verify Legacy Tables Were Renamed

```sql
-- Check renamed legacy tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%_old'
ORDER BY table_name;
```

**Expected Tables (if they existed):**
- `data_center_levels_old`
- `gpu_catalog_old`
- `gpu_tiers_old`
- `pack_types_old`
- `rarity_old`
- `soldier_catalog_old`
- `soldier_tiers_old`

---

### 6. Verify Profiles Schema

```sql
-- Check profiles columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('garage_level', 'data_center_level')
ORDER BY column_name;
```

**Expected Result:**
- `garage_level` exists (SMALLINT, default 1)
- `data_center_level` does NOT exist (removed)

---

### 7. Verify Economy Ledger Normalization

```sql
-- Check for legacy reason strings
SELECT DISTINCT reason
FROM economy_ledger
WHERE reason IN ('open-crate', 'upgrade-base', 'recycle-soldier')
ORDER BY reason;
```

**Expected Result:**
- Zero rows (all legacy reasons normalized to: `open-pack`, `train`, `recycle`)

---

### 8. Check Car Tiers Integrity

```sql
SELECT tier_key, display, hp_base, fuel, grip_pct
FROM car_tiers
ORDER BY hp_base;
```

**Expected Result:**
```
tier_key  | display   | hp_base | fuel | grip_pct
----------|-----------|---------|------|----------
beater    | Beater    | 4       | 2    | 2.0
street    | Street    | 12      | 4    | 3.0
sport     | Sport     | 36      | 8    | 4.5
supercar  | Supercar  | 108     | 16   | 6.75
hypercar  | Hypercar  | 324     | 32   | 10.125
prototype | Prototype | 972     | 64   | 15.1875
godspeed  | Godspeed  | 2916    | 128  | 22.78125
```

---

### 9. Test Edge Functions

Run these tests from your testkit or manually:

```bash
# From empire-testkit directory
npm test -- open-pack.spec.ts
npm test -- train-unit.spec.ts
npm test -- recycle-unit.spec.ts
npm test -- claim-rewards.spec.ts
```

**Expected Results:**
- All tests pass
- Units created have `tier_key` from Cars tiers
- No soldier/gpu names or tiers appear in responses

---

## 🔍 Edge Functions Review

### ✅ Functions That Should Exist (Cars-themed)

All these functions are already updated to use Cars data:

| Function | Status | Purpose |
|----------|--------|---------|
| `open-pack` | ✅ Active | Grants cars with tier_key, level=1, car stats |
| `train-unit` | ✅ Active | Upgrades level only (1→3), never changes tier |
| `recycle-unit` | ✅ Active | 20% promote to next tier, 80% burn |
| `claim-rewards` | ✅ Active | MP from car stats (hp × [1 + grip%]) |
| `list-units` | ✅ Active | Lists player's cars |
| `list-seasons` | ✅ Active | Lists available seasons |
| `toggle-season` | ✅ Active | Admin: activate/deactivate seasons |
| `economy-stats` | ✅ Active | Aggregate economy metrics |
| `referral-capture` | ✅ Active | Track referral links |
| `sign-claim` | ✅ Active | Sign claim transactions |

### ❌ Legacy Functions to Remove (if they exist)

Check your Supabase Edge Functions dashboard. Delete these if present:

- `open-crate` (renamed to `open-pack`)
- `train-soldier` (renamed to `train-unit`)
- `recycle-soldier` (renamed to `recycle-unit`)
- `upgrade-data-center` (no longer used)
- `list-gpus` (no longer used)
- `sign-fuel` (no longer used)
- `*-miner-*` (any mining-related functions)

**How to Check:**
1. Go to: https://supabase.com/dashboard/project/miflbztkdctpibawermj/functions
2. Look for any legacy function names
3. Delete them if they exist

---

## 🎯 Pass Conditions

Migration is successful when ALL of these are true:

✅ **Database State:**
- `soldier_like = 0` (no soldier units)
- `gpu_like = 0` (no GPU units)
- Exactly 7 pack_odds rows (Cars tiers only)
- All player_units have valid `tier_key` from Cars tiers
- `profiles.garage_level` exists, `data_center_level` removed
- No legacy `reason` strings in `economy_ledger`

✅ **Archive State:**
- `_archive` schema exists
- Legacy data safely snapshotted
- Legacy tables renamed to `*_old` (not dropped)

✅ **Edge Functions:**
- All Cars-themed functions work correctly
- No legacy function names remain deployed
- Test suite passes (empire-testkit)

✅ **UI/Frontend:**
- Garage shows only cars (no soldiers/GPUs)
- Pack opening creates only cars
- Training upgrades level only
- Recycle promotes to next tier or burns

---

## 🔄 Rollback Procedures

If something goes wrong, you can rollback:

### Option 1: Restore Specific Legacy Units

```sql
-- Restore legacy units from archive (if needed)
INSERT INTO player_units 
SELECT * FROM _archive.player_units_legacy_rows
ON CONFLICT (id) DO NOTHING;
```

### Option 2: Restore Pack Odds

```sql
-- Restore old pack odds
DELETE FROM pack_odds;
INSERT INTO pack_odds SELECT * FROM _archive.pack_odds_snapshot
ON CONFLICT DO NOTHING;
```

### Option 3: Restore Legacy Tables

```sql
-- Rename *_old tables back to original names
ALTER TABLE soldier_tiers_old RENAME TO soldier_tiers;
ALTER TABLE gpu_tiers_old RENAME TO gpu_tiers;
-- etc. for other tables
```

### Option 4: Full Rollback (Nuclear)

If you need to completely undo the migration:

```sql
BEGIN;

-- Drop new car constraints if needed
-- Restore all tables from _archive
-- Re-run 001_cars_theme.sql if needed

COMMIT;
```

**Note:** Contact the project maintainer before attempting a full rollback.

---

## 📞 Support

If you encounter issues:

1. **Check Supabase logs**: Dashboard → Logs → Edge Functions
2. **Review testkit results**: `empire-testkit/reports/index.html`
3. **Inspect _archive schema**: All old data is preserved there
4. **Run healthchecks above**: Identify what's not matching expectations

---

## 📝 Migration Completion Checklist

After running migration and all healthchecks pass:

- [ ] Migration SQL executed successfully
- [ ] All 9 healthchecks passed
- [ ] Edge functions tested (testkit passes)
- [ ] No legacy functions remain in Supabase dashboard
- [ ] Frontend tested (Garage shows only cars)
- [ ] Document any issues or anomalies found
- [ ] Mark TASK.md item as complete
- [ ] Archive this verification document for records

---

**Migration completed successfully when all healthchecks pass and acceptance criteria are met.** 🚗💨

