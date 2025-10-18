# Backend Implementation Guide

## Overview

Complete backend system for the Cars-themed Empire game, featuring:
- Solana-based player initialization with treasury payment verification
- Garage management with configurable levels and capacity
- Motor power-based reward claiming with network share calculation
- Referral system with multi-level commission payouts
- Pack opening with daily limits and tier-based probabilities
- Car training and recycling mechanics
- Comprehensive audit trails and leaderboards

## Environment Variables

### Required
```bash
# Supabase Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"  # For admin operations
SUPABASE_ACCESS_TOKEN="your_access_token"  # For deployments

# Solana Configuration
SOL_CLUSTER="devnet"  # or "mainnet"
TREASURY_MAINNET="6CJSg3mas8UejxboXcHP8Sktu8pDRJ4Nh9kpTtACNxRg"
TREASURY_DEVNET="27iC4pJHhc4ZnAsbmAPFHV6deWz3BWWqD9QFEJxoCun9"

# Test Configuration
TEST_WALLET="27iC4pJHhc4ZnAsbmAPFHV6deWz3BWWqD9QFEJxoCun9"
SEASON_PUBKEY="11111111111111111111111111111111"

# Test Mocking (optional)
NODE_ENV="test"  # Enables mock Solana verification
MOCK_SOLANA="true"  # Alternative way to enable mocking
```

## Database Schema

### Core Tables
- **`profiles`**: User accounts with wallet addresses and garage levels
- **`player_units`**: Car NFTs with stats (HP, Grip, Fuel, Level)
- **`garage_slots`**: Active cars generating rewards
- **`garage_levels`**: Garage configuration (capacity, daily pack limits, upgrade costs)
- **`inventory_currency`**: $OIL balances
- **`claim_history`**: Earnings audit trail
- **`garage_upgrades`**: Upgrade audit trail with cooldowns
- **`pack_openings`**: Pack opening audit trail
- **`referral_earnings`**: Commission payouts tracking
- **`car_catalog`**: 28 cars across 7 tiers
- **`car_tiers`**: Tier stats (HP, Grip, Fuel)
- **`pack_odds`**: Probability distribution for pack openings

### Views
- **`v_network_motor_power`**: Sum of all motor power from slotted cars

## Edge Functions (Endpoints)

### 1. POST /init-player
**Purpose**: Initialize new player with treasury payment verification

**Request:**
```json
{
  "wallet": "string",
  "referralCode": "string (optional)",
  "cluster": "mainnet | devnet",
  "treasurySig": "string (base58 transaction signature)"
}
```

**Behavior:**
- Verifies 0.5 SOL payment to treasury (recent, unused transaction)
- Creates profile with `garage_level=1` (idempotent)
- Grants 3 beater tier starter cars
- Attaches referrer if provided and valid

**Mock Mode**: Use `treasurySig: "mock_*"` in test environments

**Response (201):**
```json
{
  "ok": true,
  "existing": false,
  "profile": { "user_id": "uuid", "wallet_address": "string", "garage_level": 1 },
  "units": [{ "id": 1, "name": "Honda Civic", "tier_key": "beater", "level": 1, "hp_base": 100, "grip_pct": 5, "fuel": 50 }],
  "txId": "string"
}
```

### 2. GET /me?wallet=<address>
**Purpose**: Get complete player snapshot

**Response (200):**
```json
{
  "ok": true,
  "profile": { "user_id": "uuid", "wallet": "string", "garage_level": 1 },
  "balances": { "oil": 1000, "bonds": 1000 },
  "garage": {
    "level": 1,
    "capacity": 4,
    "slots_used": 2,
    "daily_pack_limit": 10,
    "packs_opened_today": 3,
    "upgrade_cost": 2000,
    "slots": [{ "position": 1, "unit": { ... } }]
  },
  "stats": { "total_hp": 250, "total_mp": 262.5, "total_units": 5 }
}
```

### 3. POST /update-garage-slots
**Purpose**: Update active garage slots

**Request:**
```json
{
  "wallet": "string",
  "unitIds": [1, 2, 3, 4]  // max = garage capacity
}
```

**Behavior:**
- Validates unit ownership
- Enforces capacity from `garage_levels`
- Replaces all slots in transaction (delete + insert)
- Calculates total MP: `HP × Level Multiplier × (1 + Grip%)`

**Response (200):**
```json
{
  "ok": true,
  "slots": [{ "position": 1, "unit": { ... } }],
  "total_mp": 262.5,
  "capacity": 4
}
```

### 4. POST /claim-rewards
**Purpose**: Claim $OIL rewards based on motor power share

**Request:**
```json
{
  "wallet": "string"
}
```

**Behavior:**
- Computes user MP from slotted units
- Reads network MP from `v_network_motor_power`
- Gets active season `emission_per_hour` (default: 100)
- Computes hours since last claim
- Formula: `claimable = (userMP / networkMP) × emission × hours`
- Credits user balance, inserts `claim_history`
- **Referral Payouts:**
  - Level-1 referrer: +2.5% of claim
  - Level-2 referrer: +1.25% of claim
  - Records in `referral_earnings`

**Response (200):**
```json
{
  "ok": true,
  "claimed_amount": 42.5,
  "new_balance": 1042.5,
  "network_share_pct": 1.25,
  "hours_elapsed": 2.5,
  "user_mp": 262.5,
  "network_mp": 21000,
  "referral_payouts": [
    { "generation": 1, "wallet": "...", "amount": 1.06 },
    { "generation": 2, "wallet": "...", "amount": 0.53 }
  ]
}
```

### 5. POST /upgrade-garage
**Purpose**: Upgrade garage level

**Request:**
```json
{
  "wallet": "string"
}
```

**Behavior:**
- Reads current level from profile
- Looks up next level in `garage_levels`
- **24h Cooldown**: Checks last upgrade from `garage_upgrades`
- Deducts `upgrade_cost_oil`
- Increments `garage_level`
- Inserts audit record

**Garage Levels (L1–L10):**
| Level | Capacity | Daily Pack Limit | Upgrade Cost ($OIL) |
|-------|----------|------------------|---------------------|
| 1     | 4        | 10               | 1,000               |
| 2     | 6        | 20               | 2,000               |
| 3     | 8        | 30               | 4,500               |
| 4     | 10       | 40               | 9,000               |
| 5     | 12       | 50               | 20,000              |
| 6     | 14       | 60               | 50,000              |
| 7     | 16       | 70               | 100,000             |
| 8     | 18       | 80               | 200,000             |
| 9     | 20       | 90               | 450,000             |
| 10    | 22       | 100              | 900,000             |

**Response (200):**
```json
{
  "ok": true,
  "from_level": 1,
  "to_level": 2,
  "cost_oil": 2000,
  "new_balance": 8000,
  "garage": { "level": 2, "capacity": 6, "daily_pack_limit": 20 }
}
```

### 6. POST /open-pack
**Purpose**: Open pack(s) and grant random cars

**Request:**
```json
{
  "wallet": "string",
  "packType": "booster",
  "qty": 1
}
```

**Behavior:**
- Checks daily pack limit from `garage_levels` (counts from `pack_openings` today)
- Deducts cost from balance
- Rolls tier by `pack_odds` (RNG)
- Picks random car from `car_catalog` by tier
- Creates `player_units`, inserts `pack_openings`

**Pack Odds (Booster):**
| Tier      | Odds  |
|-----------|-------|
| Beater    | 40%   |
| Street    | 25%   |
| Sport     | 15%   |
| Supercar  | 10%   |
| Hypercar  | 6%    |
| Prototype | 3%    |
| Godspeed  | 1%    |

**Response (201):**
```json
{
  "ok": true,
  "spent": 100,
  "new_balance": 900,
  "granted": 1,
  "units": [{ "id": 42, "name": "Toyota Supra", "tier_key": "sport", ... }],
  "daily_limit": { "limit": 10, "used": 1, "remaining": 9 }
}
```

### 7. POST /train-unit
**Purpose**: Train car to increase level

**Request:**
```json
{
  "wallet": "string",
  "unitId": 42,
  "levels": 1  // 1-2 levels
}
```

**Behavior:**
- Validates ownership, enforces `level ≤ 3`
- **Cost**: 50 $OIL per level
- Applies level multiplier (stored in `car_level_multipliers`)
- Increases Grip by +2% per level
- Deducts cost, updates unit

**Response (200):**
```json
{
  "ok": true,
  "unit": { "id": 42, "level": 2, "hp_base": 300, "grip_pct": 22, ... },
  "cost": 50,
  "new_balance": 850,
  "from_level": 1,
  "to_level": 2,
  "level_multiplier": 1.1
}
```

### 8. POST /recycle-unit
**Purpose**: Recycle car (20% promote, 80% burn)

**Request:**
```json
{
  "wallet": "string",
  "unitId": 42
}
```

**Behavior:**
- **20% Promote**: Upgrade to next tier, reset to level 1
  - HP × 1.5
  - Grip × 1.3
- **80% Burn**: Delete unit, remove from `garage_slots`
- Cannot recycle Godspeed tier (already max)

**Response (200 - Promoted):**
```json
{
  "ok": true,
  "result": "promoted",
  "unit": { "id": 42, "tier_key": "supercar", "level": 1, ... },
  "from_tier": "sport",
  "to_tier": "supercar",
  "hp_multiplier": 1.5,
  "grip_multiplier": 1.3
}
```

**Response (200 - Burned):**
```json
{
  "ok": true,
  "result": "burned",
  "unit_id": 42,
  "tier": "sport"
}
```

### 9. GET /leaderboard?limit=100
**Purpose**: Get top players by total claimed

**Response (200):**
```json
{
  "ok": true,
  "leaderboard": [
    {
      "rank": 1,
      "wallet": "...",
      "total_claimed": 12500.75,
      "garage_level": 5,
      "invites": 42,
      "joined_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total_players": 100
}
```

## Testing

### Run All Tests
```bash
cd empire-testkit
npm run ci:html  # Runs tests + generates HTML report
```

### Run Specific Test Suite
```bash
npx vitest tests/init-player.spec.ts
npx vitest tests/claim-rewards.spec.ts
```

### Test Requirements Coverage
- ✅ **REQ-INIT-001**: init is idempotent, creates profile + 3 starter cars
- ✅ **REQ-GARAGE-SLOTS-001**: cannot exceed capacity from garage_levels
- ✅ **REQ-CLAIM-001**: claim returns >0 when networkMP>0, inserts claim_history
- ✅ **REQ-CLAIM-REFERRAL-001**: level-1 gets 2.5%, level-2 gets 1.25%
- ✅ **REQ-UPGRADE-001**: upgrade consumes exact cost, enforces 24h cooldown
- ✅ **REQ-PACKS-LIMIT-001**: daily pack limit enforced from garage_levels
- ✅ **REQ-TRAIN-001**: respect level cap (≤ 3), cost: 50 $OIL per level
- ✅ **REQ-RECYCLE-001**: 20% promote, 80% burn

### Mocking Solana Verification
In test mode (`NODE_ENV=test` or `MOCK_SOLANA=true`), treasury signatures starting with `mock_` are automatically accepted:

```javascript
{
  treasurySig: "mock_init_sig_12345"  // Accepted in test mode
}
```

## Deployment

### Deploy All Functions
```bash
cd empire-forge-auth
supabase functions deploy init-player --no-verify-jwt
supabase functions deploy me --no-verify-jwt
supabase functions deploy update-garage-slots --no-verify-jwt
supabase functions deploy claim-rewards --no-verify-jwt
supabase functions deploy upgrade-garage --no-verify-jwt
supabase functions deploy open-pack --no-verify-jwt
supabase functions deploy train-unit --no-verify-jwt
supabase functions deploy recycle-unit --no-verify-jwt
supabase functions deploy leaderboard --no-verify-jwt
```

### Apply Migrations
```bash
supabase db push
```

### Verify Deployment
```bash
supabase functions list
```

## Architecture Notes

### Idempotency
- **`init-player`**: Returns 200 with existing data if profile already exists
- **Garage slots**: Transaction-based (delete all + insert new) for consistency
- **Migrations**: All use `IF NOT EXISTS` and `ON CONFLICT` for safe re-runs

### Security
- **Treasury Verification**: Validates real Solana transactions in production
- **Ownership Checks**: All mutations verify wallet owns the resource
- **Rate Limits**: Daily pack limits, 24h upgrade cooldowns, claim time windows

### Performance
- **Network MP View**: Pre-computed aggregate for fast claims
- **Indexed Queries**: All foreign keys and frequent lookups have indexes
- **Audit Trails**: Separate tables avoid bloating core tables

### Referral System
- **2-Level Commission**: Recursive lookup through `referrer_wallet`
- **Generation Tracking**: Distinguishes level-1 (2.5%) from level-2 (1.25%)
- **Balance Credits**: Atomic updates to `inventory_currency`

## Troubleshooting

### Function Deployment Fails
```bash
# Check login status
supabase status

# Re-authenticate
supabase login --token YOUR_ACCESS_TOKEN
```

### Tests Fail with "Missing SUPABASE_URL"
```bash
# Verify .env file exists in empire-testkit/
cat empire-testkit/.env

# Ensure vitest loads environment
# Check vitest.config.ts has loadEnv configured
```

### Claim Returns 0
- Ensure wallet has cars in garage slots
- Check network MP is > 0 (at least one player has slotted cars)
- Verify enough time has passed since last claim (>36 seconds)

### Pack Opening Fails with 429
- Daily pack limit reached for current garage level
- Wait until next day (UTC midnight) or upgrade garage

## Support

For issues or questions, check:
1. **Supabase Dashboard**: Monitor function logs and database state
2. **Test Reports**: `empire-testkit/reports/index.html` for detailed test results
3. **Database Console**: Run SQL queries directly to inspect state

---

**Implementation Complete** ✅  
All endpoints deployed, tested, and documented.

