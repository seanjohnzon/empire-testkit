## Tasks (Phase 1: Integrations-first)

### Active
- Scaffold repo structure and docs (today)
- Implement core config loader with Pydantic BaseSettings
- Create FastAPI app with /health and /integrations endpoints
- Add messaging adapters stubs for Discord and Telegram with config validation
- Add exchange adapter interface + Hyperliquid stub + Deriw placeholder
- Write pytest for config validation and adapters (success/edge/failure cases)
- Document how to run API and tests in README
 - Initialize ScalpQuest Node.js backend (Express, Supabase, CCXT) (2025-09-26)

### Discovered During Work
- Add CI workflow (lint + tests) once base passes locally
- Docker Compose for 24/7 deployment later (post-integration)

### Done
- ScalpQuest Node.js backend initialized with Express, Supabase client, CCXT, envs and docs (2025-09-26)

---

## Empire Project Tasks (Cars Theme)

### Active
- **[NEW]** Run Supabase migration 002: Cleanup legacy Soldier/GPU data (2025-10-18)
  - File: `empire-forge-auth/migrations/002_cleanup_legacy_soldiersgpu.sql`
  - Purpose: Hard cutover to Cars-only content (remove all Soldier/GPU artifacts)
  - Strategy: Snapshot → purge legacy rows → rename legacy tables → re-seed Cars odds
  - Safety: Idempotent, atomic transaction, full archives in `_archive` schema
  - Next: Run in Supabase SQL Editor, then execute post-migration healthchecks

### Discovered During Work
- Verify no legacy edge functions remain (open-crate, train-soldier, etc.)
- Check frontend displays only Cars content in Garage/Packs

### Done
- Cars theme migration (001_cars_theme.sql) - Created car_tiers, car_level_multipliers, updated player_units schema (2025-10-18)
- Edge functions updated for Cars theme (open-pack, train-unit, recycle-unit, claim-rewards) (2025-10-18)
- Empire testkit updated with Cars-specific tests and validation (2025-10-18)
- Post-migration verification guide created (POST_MIGRATION_VERIFICATION.md) (2025-10-18)

---

## Trader Project Tasks (Phase 1: Integrations-first)

### Notes
- No secrets are requested or stored in this repository.




