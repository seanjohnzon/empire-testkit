# 🚀 Quick Reference: Migration 002

**File:** `002_cleanup_legacy_soldiersgpu.sql`  
**Purpose:** Remove all Soldier/GPU legacy data, ensure Cars-only content  
**Status:** Ready to execute

---

## ⚡ TL;DR - Execute Now

### 1️⃣ Run Migration (2 minutes)

```
1. Open: https://supabase.com/dashboard/project/miflbztkdctpibawermj/sql
2. Copy: empire-forge-auth/migrations/002_cleanup_legacy_soldiersgpu.sql
3. Paste & Run (Cmd/Ctrl + Enter)
4. Wait for "Success" message
```

### 2️⃣ Quick Healthcheck (1 minute)

```sql
-- Should return: soldier_like = 0, gpu_like = 0
SELECT
  (SELECT COUNT(*) FROM player_units WHERE name ~* '(infantry|cavalry|archer|tank|sniper)') AS soldier_like,
  (SELECT COUNT(*) FROM player_units WHERE name ~* '(rtx|gtx|bitmain|antminer|miner|asic|s19|4090|3060|1050)') AS gpu_like;

-- Should return exactly 7 rows (Cars tiers)
SELECT COUNT(*) FROM pack_odds;
```

### 3️⃣ Done! ✅

If both checks pass, you're good to go. Migration complete!

---

## 📋 Full Checklist

### Before Migration:
- [ ] Read migration file (optional)
- [ ] Ensure active season exists
- [ ] Note current player_units count

### Run Migration:
- [ ] Execute `002_cleanup_legacy_soldiersgpu.sql` in Supabase SQL Editor
- [ ] Verify "Success" / no errors

### After Migration:
- [ ] Run healthchecks from `HEALTHCHECKS.sql`
- [ ] Verify: soldier_like = 0, gpu_like = 0
- [ ] Verify: pack_odds has exactly 7 rows
- [ ] Check: `_archive` schema exists
- [ ] Check: legacy tables renamed to `*_old`
- [ ] Test: Open a pack (should grant Cars only)

### Cleanup (Optional):
- [ ] Delete legacy edge functions (if any): open-crate, train-soldier, etc.
- [ ] Run testkit: `npm test` in empire-testkit
- [ ] Test frontend Garage (should show Cars only)

---

## 🎯 Pass Conditions

✅ **Migration Successful When:**

```
soldier_like = 0            (no soldier units)
gpu_like = 0                (no GPU units)
pack_odds COUNT = 7         (Cars tiers only)
_archive schema exists      (legacy data backed up)
garage_level exists         (profiles updated)
data_center_level removed   (old column gone)
```

---

## 🔄 Rollback (If Needed)

```sql
-- Restore legacy units
INSERT INTO player_units 
SELECT * FROM _archive.player_units_legacy_rows;

-- Restore pack odds
DELETE FROM pack_odds;
INSERT INTO pack_odds SELECT * FROM _archive.pack_odds_snapshot;
```

---

## 📚 Full Documentation

- **POST_MIGRATION_VERIFICATION.md** - Complete verification guide
- **HEALTHCHECKS.sql** - All diagnostic queries
- **README.md** - Migration history & best practices
- **LEGACY_CLEANUP_COMPLETE.md** - Full project summary

---

## ⏱️ Time Estimates

- **Migration execution:** 10-30 seconds
- **Healthchecks:** 1-2 minutes
- **Full verification:** 5-10 minutes
- **Total time:** ~10 minutes

---

## 🆘 If Something Goes Wrong

1. **Error during migration?** → Transaction auto-rolls back, nothing changed
2. **Wrong results after?** → Run rollback queries (see above)
3. **Functions broken?** → Check Supabase logs, verify edge functions
4. **Need help?** → See POST_MIGRATION_VERIFICATION.md troubleshooting section

---

## 💡 Pro Tips

- ✅ Migration is **idempotent** - safe to re-run
- ✅ Migration is **atomic** - all-or-nothing transaction
- ✅ Migration **preserves data** - everything archived before deletion
- ✅ Migration **renames tables** - doesn't drop (easy rollback)

---

**You got this!** 🚗💨

Copy file → Paste in Supabase → Run → Verify → Done!

