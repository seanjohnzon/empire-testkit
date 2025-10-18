# Empire — Backend & App Handoff (to Codex)

## Overview

Empire is a Solana-based strategy game built on Supabase with a Web3 wallet authentication system. Players initialize their accounts via on-chain payment, collect units through pack openings, train units to increase Military Power (MP), and claim War Bonds based on their share of global MP in an active season.

---

## Environment Variables

### Frontend (Client-Side)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://miflbztkdctpibawermj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Edge Functions (Supabase Secrets)
```bash
SUPABASE_URL=https://miflbztkdctpibawermj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_PUBLISHABLE_KEY=<publishable_key>
SUPABASE_DB_URL=<database_url>

# Solana Configuration
SOLANA_CLUSTER=devnet                    # or mainnet-beta
SOLANA_RPC_DEVNET=<devnet_rpc_url>
SOLANA_RPC_MAINNET=<mainnet_rpc_url>
ANKR_SOLANA_DEVNET_URL=<ankr_devnet_url>
ANKR_SOLANA_MAINNET_URL=<ankr_mainnet_url>

# Treasury Wallets
SOLANA_TREASURY_DEVNET=<devnet_treasury_pubkey>
SOLANA_TREASURY_MAINNET=<mainnet_treasury_pubkey>
```

---

## Database Schema

### Core Tables

#### `profiles`
Player profile linked to wallet address.
```sql
- user_id: uuid (PK)
- wallet_address: text (unique)
- username: text
- mp: numeric (Military Power, computed from units)
- initialized: boolean
- season_id: uuid
- created_at: timestamptz
- last_claim_at: timestamptz
```

#### `inventory_currency`
Player currency balances.
```sql
- owner: uuid (PK, references profiles.user_id)
- war_bonds: numeric
```

#### `units`
Individual units owned by players.
```sql
- id: uuid (PK)
- owner: uuid (references profiles.user_id)
- blueprint: uuid (references unit_blueprints)
- level: integer (default: 1)
- rank: integer (default: 0)
- created_at: timestamptz
```

#### `unit_blueprints`
Template definitions for units.
```sql
- id: uuid (PK)
- name: text
- rarity: text (references rarities.code)
- squad: text
- base_power: integer
- traits: text[]
```

#### `rarities`
Rarity tiers and their properties.
```sql
- code: text (PK) -- e.g., 'common', 'rare', 'legendary'
- base_power: integer
- weight: integer (for drop rate calculations)
```

#### `pack_types`
Pack definitions for gacha system.
```sql
- id: uuid (PK)
- name: text
- price_bonds: integer
- drops: jsonb -- { "common": 70, "rare": 25, "legendary": 5 }
- pity_threshold: integer (default: 20)
```

#### `pack_openings`
History of pack openings with pity tracking.
```sql
- id: uuid (PK)
- owner: uuid (references profiles.user_id)
- pack_type: uuid (references pack_types)
- result_unit: uuid (references units)
- pity_count: integer
- opened_at: timestamptz
```

#### `seasons`
Season configuration for emissions and rewards.
```sql
- id: uuid (PK)
- name: text
- is_active: boolean
- start_at: timestamptz
- starts_at: timestamptz
- end_at: timestamptz
- ends_at: timestamptz
- emission_per_hour: numeric (total bonds emitted per hour)
- base_rate_per_min: numeric
- burn_pct: numeric (percentage burned on spends, e.g., 0.10 = 10%)
- halving_days: integer
```

#### `player_season`
Per-player season state.
```sql
- user_id: uuid (PK)
- season_id: uuid (PK)
- last_claim_at: timestamptz
```

#### `bond_ledger`
Transaction history for War Bonds.
```sql
- id: bigint (PK)
- user_id: uuid
- season_id: uuid
- kind: text -- 'claim', 'spend', 'burn'
- amount: numeric
- meta: jsonb -- { minutes, userMp, totalMp, reason, etc. }
- ts: timestamptz
```

#### `admin_wallets`
Allowlist of admin wallet addresses.
```sql
- wallet_address: text (PK)
```

#### `init_payments`
Record of initialization payments.
```sql
- id: uuid (PK)
- wallet_address: text
- tx_signature: text
- amount_sol: numeric
- received_at: timestamptz
```

#### `academy_upgrades`
Player academy upgrade state.
```sql
- owner: uuid (PK, references profiles.user_id)
- tier: integer (default: 0)
- bonus_pct: numeric (default: 0)
- cooldown_until: timestamptz
```

#### `claim_receipts`
Historical claim receipts (read-only for players).
```sql
- id: uuid (PK)
- owner: uuid (references profiles.user_id)
- season_id: uuid
- amount: numeric
- from_ts: timestamptz
- to_ts: timestamptz
- created_at: timestamptz
```

#### `leaderboard_snapshots`
Periodic snapshots of leaderboard state.
```sql
- id: bigint (PK)
- season_id: uuid
- top: jsonb -- array of { wallet, username, mp }
- taken_at: timestamptz
```

#### `config`
Key-value configuration store.
```sql
- key: text (PK)
- value: text
```

---

## Edge Functions

All edge functions use `verify_jwt = false` in `supabase/config.toml` and validate via wallet address instead of JWT.

### Admin Functions

#### `admin-check`
**Method:** `POST`  
**Payload:**
```json
{ "walletAddress": "wallet_pubkey_string" }
```
**Response:**
```json
{ "ok": true, "reason": "allowlist" }
// or { "ok": false, "reason": "not on allowlist" }
```

#### `admin-set-season`
**Method:** `POST`  
**Payload:**
```json
{
  "walletAddress": "admin_wallet",
  "seasonId": "uuid"
}
```
**Response:**
```json
{ "ok": true, "seasonId": "uuid", "name": "Season 1" }
```

#### `admin-set-config`
**Method:** `POST`  
**Payload:**
```json
{
  "walletAddress": "admin_wallet",
  "key": "config_key",
  "value": "config_value"
}
```
**Response:**
```json
{ "ok": true, "key": "config_key", "value": "config_value" }
```

#### `economy-stats`
**Method:** `GET` or `POST`  
**Payload:** None  
**Response:**
```json
{
  "season": { "id": "uuid", "name": "Season 1" },
  "totals": {
    "claimed": 1000.5,
    "spent": 500.25,
    "burned": 50.025
  },
  "ledger": [
    {
      "ts": "2025-01-15T12:00:00Z",
      "wallet": "abc...xyz",
      "kind": "claim",
      "amount": 10.5,
      "meta": { "minutes": 60, "userMp": 100, "totalMp": 1000 }
    }
  ]
}
```

### Season & Leaderboard

#### `list-seasons`
**Method:** `GET` or `POST`  
**Payload:** None  
**Response:**
```json
{
  "seasons": [
    {
      "id": "uuid",
      "name": "Season 1",
      "is_active": true,
      "start_at": "2025-01-01T00:00:00Z",
      "emission_per_hour": 100
    }
  ]
}
```

#### `get-total-mp`
**Method:** `GET` or `POST`  
**Payload:** None  
**Response:**
```json
{ "totalMp": 50000 }
```

#### `leaderboard`
**Method:** `GET` or `POST`  
**Payload:** None  
**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "wallet_address": "abc...xyz",
      "username": "Player1",
      "mp": 1000
    }
  ]
}
```

### Player Functions

#### `get-balances`
**Method:** `POST`  
**Payload:**
```json
{ "walletAddress": "wallet_pubkey_string" }
```
**Response:**
```json
{
  "ok": true,
  "war_bonds": 100.5,
  "mp": 250
}
```

#### `claim-rewards`
**Method:** `POST`  
**Payload:**
```json
{ "walletAddress": "wallet_pubkey_string" }
```
**Response:**
```json
{
  "ok": true,
  "amount": 15.75,
  "userMp": 250,
  "totalMp": 50000,
  "minutes": 120,
  "season": {
    "id": "uuid",
    "name": "Season 1",
    "basePerHour": 100
  }
}
```
**Logic:**
- Calculates time elapsed since `last_claim_at` in minutes.
- Early return if `minutes <= 0` with `amount = 0`.
- Validates `basePerHour >= 0`, `totalMp > 0`, `userMp > 0`.
- Formula: `amount = (userMp / totalMp) * (basePerHour / 60) * minutes`
- Updates `last_claim_at` and `inventory_currency.war_bonds`.
- Logs to `bond_ledger` with kind `'claim'`.

#### `open-pack`
**Method:** `POST`  
**Payload:**
```json
{
  "walletAddress": "wallet_pubkey_string",
  "packTypeId": "uuid"
}
```
**Response:**
```json
{
  "ok": true,
  "unitId": "uuid",
  "rarity": "rare",
  "pityTriggered": false
}
```
**Logic:**
- Checks currency balance.
- Implements pity system (guaranteed rarer drop after threshold).
- Random rarity selection based on drop weights.
- Creates new unit in `units` table.
- Deducts cost, logs `'spend'` and `'burn'` to `bond_ledger`.

#### `train-unit`
**Method:** `POST`  
**Payload:**
```json
{
  "walletAddress": "wallet_pubkey_string",
  "unitId": "uuid"
}
```
**Response:**
```json
{
  "ok": true,
  "newLevel": 2,
  "cost": 50,
  "newMp": 275
}
```
**Logic:**
- Verifies unit ownership.
- Calculates training cost based on current level.
- Deducts cost, increments level.
- Calls `recompute_mp` RPC to update player MP.
- Logs `'spend'` and `'burn'` to `bond_ledger`.

#### `list-units`
**Method:** `POST`  
**Payload:**
```json
{ "walletAddress": "wallet_pubkey_string" }
```
**Response:**
```json
{
  "units": [
    {
      "id": "uuid",
      "name": "Tank",
      "rarity": "rare",
      "level": 2,
      "squad": "armor",
      "traits": ["heavy", "slow"]
    }
  ]
}
```

### Initialization

#### `request-init`
**Method:** `POST`  
**Payload:**
```json
{ "walletAddress": "wallet_pubkey_string" }
```
**Response:**
```json
{
  "ok": true,
  "treasuryAddress": "treasury_pubkey",
  "amountSol": 0.1,
  "cluster": "devnet"
}
```

#### `verify-init`
**Method:** `POST`  
**Payload:**
```json
{
  "walletAddress": "wallet_pubkey_string",
  "txSignature": "tx_sig_string"
}
```
**Response:**
```json
{
  "ok": true,
  "message": "Initialization complete",
  "starterUnits": ["uuid1", "uuid2"]
}
```
**Logic:**
- Verifies on-chain transaction to treasury.
- Creates profile, inventory_currency, academy_upgrades rows.
- Seeds starter units.
- Marks profile as `initialized = true`.

#### `ensure-profile`
**Method:** `POST`  
**Payload:**
```json
{ "walletAddress": "wallet_pubkey_string" }
```
**Response:**
```json
{
  "ok": true,
  "exists": true,
  "initialized": true
}
```

#### `dev-airdrop`
**Method:** `POST` (devnet only)  
**Payload:**
```json
{ "walletAddress": "wallet_pubkey_string" }
```
**Response:**
```json
{
  "ok": true,
  "signature": "airdrop_tx_sig"
}
```

---

## Auth Model

**Wallet-Linked Profile System:**
- Players authenticate by connecting Solana wallet (Phantom, Solflare, etc.).
- No traditional email/password auth.
- `profiles.wallet_address` is the primary identifier.
- Edge functions validate `walletAddress` in payload instead of JWT.
- All gameplay writes (pack opens, training, claims) use **service role** to bypass RLS.
- RLS policies exist for client-side reads only (`auth.uid() = owner/user_id`).

---

## Game Loop

1. **Initialize Account**
   - Player pays treasury wallet (0.1 SOL on devnet).
   - `verify-init` confirms payment on-chain.
   - Creates profile, seeds starter units.

2. **Collect Units**
   - Open packs via `open-pack` using War Bonds.
   - Pity system ensures rare drops.

3. **Train Units**
   - Upgrade units via `train-unit`.
   - Costs scale with level.
   - Increases player MP.

4. **Claim Rewards**
   - Call `claim-rewards` to receive War Bonds.
   - Amount based on `(userMp / totalMp) * emission_per_hour * minutes_elapsed`.
   - Season-based emission rate.

5. **Burn Mechanism**
   - Configurable `burn_pct` (default 10%) on all spends.
   - Logged separately in `bond_ledger` as `kind = 'burn'`.

---

## Admin Model

- **Allowlist:** `admin_wallets` table contains authorized wallet addresses.
- **Treasury:** Single treasury wallet per cluster (devnet/mainnet).
- **Season Management:** Only one active season at a time (`is_active = true`).
- Admins can:
  - Set active season via `admin-set-season`.
  - View economy stats via `economy-stats`.
  - Update config via `admin-set-config`.

---

## Known Limits / TODOs

### Rate Limiting
- **Issue:** No per-minute claim rate limiting implemented.
- **Risk:** Players could spam claims if cooldown is exploited.
- **TODO:** Add rate-limiting middleware or per-player cooldown tracking.

### Error Surfaces
- **Issue:** Generic error messages in some edge functions.
- **TODO:** Improve error handling and user-facing messages.

### Mainnet Token
- **Issue:** No SPL token minted for mainnet War Bonds yet.
- **TODO:** Deploy SPL token, integrate mint/burn into edge functions.

### RLS Policies
- **Limitation:** All writes bypass RLS via service role.
- **Security:** Edge functions must validate wallet ownership carefully.

### Pity System Edge Cases
- **Issue:** Pity count could be manipulated if pack opening fails mid-transaction.
- **TODO:** Add transactional guarantees or idempotency checks.

---

## On-Chain Plan

### Summary
Empire will transition from off-chain War Bonds (Supabase DB records) to on-chain SPL tokens with a Solana Anchor program managing staking, emissions, and treasury.

### Architecture

#### Anchor Program (Solana)
**Program:** `empire-bonds`

**Accounts:**
- `GlobalConfig`: Emission rates, burn %, treasury address, season metadata.
- `PlayerAccount`: PDA per wallet storing staked units, MP, last claim timestamp.
- `SeasonState`: Active season ID, start/end timestamps, total MP.
- `UnitMint`: NFT metadata (rarity, level, squad) for each unit.

**Instructions:**
1. **initialize_season**
   - Creates new `SeasonState` account.
   - Sets emission rate, burn percentage.
   - Only callable by admin authority.

2. **stake_unit**
   - Transfers unit NFT to program PDA.
   - Updates `PlayerAccount.mp` based on unit level/rarity.
   - Increments `SeasonState.total_mp`.

3. **unstake_unit**
   - Returns unit NFT to player.
   - Decrements MP from player and global totals.

4. **claim_emissions**
   - Calculates: `(player_mp / total_mp) * emission_rate * minutes_elapsed`
   - Mints War Bonds SPL tokens to player.
   - Updates `PlayerAccount.last_claim_at`.

5. **burn_on_spend**
   - Called when player spends bonds (pack open, training).
   - Burns configured `burn_pct` of spend amount.
   - Transfers remainder to treasury or burns entirely.

6. **open_pack**
   - On-chain randomness (Switchboard VRF or similar).
   - Mints unit NFT with metadata.
   - Burns/transfers payment tokens.

7. **train_unit**
   - Updates unit NFT metadata (increment level).
   - Recalculates MP, updates staking accounts.
   - Burns/transfers training cost.

**Key Features:**
- **Trustless Emissions:** No off-chain oracle; all calculations on-chain.
- **NFT Units:** Each unit is a unique Metaplex-compatible NFT.
- **Burn Mechanism:** Integrated into spend instructions.
- **Season Transitions:** Admin can close season, start new one.

#### Migration Path
1. **Phase 1 (Current):** Off-chain prototype in Supabase.
2. **Phase 2:** Deploy Anchor program, mint SPL token.
3. **Phase 3:** Migrate existing player data to on-chain accounts.
4. **Phase 4:** Deprecate Supabase writes, use DB as read-only cache for UI.

#### Dependencies
- **Metaplex:** NFT minting for units.
- **Switchboard / Chainlink VRF:** On-chain randomness for pack openings.
- **Anchor Framework:** Smart contract development.
- **@solana/web3.js:** Frontend integration.

---

## Development Notes

### Local Setup
1. Clone repository.
2. Install dependencies: `npm install`.
3. Set up Supabase project, copy environment variables.
4. Add secrets to Supabase dashboard (Functions > Secrets).
5. Deploy edge functions: `supabase functions deploy <function_name>`.
6. Seed database with initial season, pack types, rarities, unit blueprints.

### Testing
- Use devnet for Solana transactions.
- Airdrop SOL via `dev-airdrop` edge function.
- Test full flow: init → open pack → train → claim.

### Deployment
- Frontend: Deploy via Lovable publish.
- Edge Functions: Auto-deployed with Supabase CI/CD.
- Database Migrations: Apply via Supabase SQL editor or migration tool.

---

## Contact & Handoff

This README documents the current backend architecture as of handoff to Codex. For questions or clarifications, refer to the edge function source code in `supabase/functions/` and database schema in Supabase dashboard.

**Next Steps:**
1. Review edge function logic and error handling.
2. Implement rate limiting for claims.
3. Design and deploy Anchor program for on-chain transition.
4. Mint SPL token for War Bonds.
5. Migrate player data to on-chain accounts.

---

**End of Handoff Document**

---

## Appendix: Anchor Program Specification

### Account Structures

#### `GlobalState`
Program-wide configuration and authority.
```rust
#[account]
pub struct GlobalState {
    pub authority: Pubkey,           // Admin authority for program upgrades
    pub oracle_pubkey: Pubkey,       // Ed25519 public key for signature verification
    pub war_bonds_mint: Pubkey,      // SPL token mint for War Bonds
    pub treasury: Pubkey,            // Treasury wallet for collections
    pub bump: u8,                    // PDA bump seed
}
```

#### `Season`
Per-season emission configuration.
```rust
#[account]
pub struct Season {
    pub season_id: u64,              // Incrementing season identifier
    pub is_active: bool,             // Only one active season at a time
    pub start_ts: i64,               // Unix timestamp (season start)
    pub end_ts: i64,                 // Unix timestamp (season end)
    pub emission_per_hour: u64,      // Total bonds emitted per hour (scaled by 1e9)
    pub burn_pct: u16,               // Burn percentage (e.g., 1000 = 10%)
    pub total_mp: u64,               // Cached global MP (updated by oracle)
    pub bump: u8,                    // PDA bump seed
}
```

#### `PlayerAccount`
Per-player state (PDA: `[b"player", season_id.to_le_bytes(), wallet.key]`).
```rust
#[account]
pub struct PlayerAccount {
    pub wallet: Pubkey,              // Player wallet address
    pub season_id: u64,              // Season this account belongs to
    pub mp: u64,                     // Player's verified MP (from oracle signature)
    pub last_claim_ts: i64,          // Unix timestamp of last claim
    pub total_claimed: u64,          // Lifetime claimed bonds for this season
    pub bump: u8,                    // PDA bump seed
}
```

---

### Instructions

#### 1. `init_global`
Initialize the global program state (one-time setup).

**Accounts:**
- `global_state` (PDA, init): `[b"global"]`
- `authority` (signer): Admin wallet
- `oracle_pubkey` (unchecked): Ed25519 public key for oracle
- `war_bonds_mint` (unchecked): SPL token mint
- `treasury` (unchecked): Treasury wallet
- `system_program`

**Logic:**
```rust
global_state.authority = authority.key();
global_state.oracle_pubkey = oracle_pubkey.key();
global_state.war_bonds_mint = war_bonds_mint.key();
global_state.treasury = treasury.key();
global_state.bump = bump;
```

---

#### 2. `create_season`
Create a new season (admin only).

**Accounts:**
- `global_state` (PDA): `[b"global"]`
- `season` (PDA, init): `[b"season", season_id.to_le_bytes()]`
- `authority` (signer): Must match `global_state.authority`
- `system_program`

**Parameters:**
- `season_id: u64`
- `start_ts: i64`
- `end_ts: i64`
- `emission_per_hour: u64`
- `burn_pct: u16`

**Logic:**
```rust
require!(authority.key() == global_state.authority, Unauthorized);
season.season_id = season_id;
season.is_active = false;  // Must explicitly activate
season.start_ts = start_ts;
season.end_ts = end_ts;
season.emission_per_hour = emission_per_hour;
season.burn_pct = burn_pct;
season.total_mp = 0;
season.bump = bump;
```

---

#### 3. `set_season_active`
Toggle active status of a season (admin only).

**Accounts:**
- `global_state` (PDA): `[b"global"]`
- `season` (PDA, mut): `[b"season", season_id.to_le_bytes()]`
- `authority` (signer): Must match `global_state.authority`

**Parameters:**
- `season_id: u64`
- `is_active: bool`

**Logic:**
```rust
require!(authority.key() == global_state.authority, Unauthorized);
season.is_active = is_active;

// Optional: Deactivate all other seasons if activating this one
if is_active {
    // Iterate and deactivate others (or enforce via client)
}
```

---

#### 4. `claim`
Claim War Bonds emissions based on oracle-signed MP.

**Accounts:**
- `global_state` (PDA): `[b"global"]`
- `season` (PDA, mut): `[b"season", season_id.to_le_bytes()]`
- `player` (PDA, init_if_needed, mut): `[b"player", season_id.to_le_bytes(), wallet.key()]`
- `wallet` (signer): Player's wallet
- `war_bonds_mint` (mut): SPL token mint
- `player_token_account` (mut): Player's War Bonds ATA
- `token_program`
- `system_program`
- `instructions_sysvar` (unchecked): `sysvar::instructions`

**Parameters:**
- `season_id: u64`
- `mp: u64` (player's MP, oracle-verified)
- `total_mp: u64` (global MP, oracle-verified)
- `now: i64` (current Unix timestamp, oracle-verified)
- `signature: [u8; 64]` (Ed25519 signature from oracle)

**Logic:**
```rust
// 1. Verify oracle signature
let message = format!(
    "season={}&wallet={}&mp={}&total_mp={}&now={}",
    season_id, wallet.key(), mp, total_mp, now
);
let message_bytes = message.as_bytes();
let is_valid = ed25519_verify(
    &signature,
    message_bytes,
    &global_state.oracle_pubkey.to_bytes()
);
require!(is_valid, InvalidSignature);

// 2. Ensure season is active
require!(season.is_active, SeasonNotActive);
require!(now >= season.start_ts && now <= season.end_ts, SeasonOutOfRange);

// 3. Calculate elapsed time
let last_claim = player.last_claim_ts.max(season.start_ts);
let minutes_elapsed = (now - last_claim) / 60;
require!(minutes_elapsed > 0, NoTimeElapsed);

// 4. Calculate emission amount
// Formula: (mp / total_mp) * (emission_per_hour / 60) * minutes
let global_per_min = season.emission_per_hour / 60;
let amount = (mp as u128)
    .checked_mul(global_per_min as u128)
    .unwrap()
    .checked_mul(minutes_elapsed as u128)
    .unwrap()
    .checked_div(total_mp as u128)
    .unwrap() as u64;

require!(amount > 0, ZeroEmission);

// 5. Mint War Bonds to player
token::mint_to(
    CpiContext::new_with_signer(
        token_program.to_account_info(),
        MintTo {
            mint: war_bonds_mint.to_account_info(),
            to: player_token_account.to_account_info(),
            authority: global_state.to_account_info(),
        },
        &[&[b"global", &[global_state.bump]]],
    ),
    amount,
)?;

// 6. Update player state
player.wallet = wallet.key();
player.season_id = season_id;
player.mp = mp;
player.last_claim_ts = now;
player.total_claimed += amount;

// 7. Update season total_mp cache (optional)
season.total_mp = total_mp;
```

---

### Oracle Signature Mechanism

#### Overview
To prevent on-chain computation of MP (which requires iterating all units), an off-chain oracle computes `mp` and `total_mp`, then signs the claim request using Ed25519.

#### Message Format
The oracle signs a deterministic message:
```
season={season_id}&wallet={wallet_pubkey}&mp={player_mp}&total_mp={global_mp}&now={unix_timestamp}
```

Example:
```
season=1&wallet=8xKz...Abc&mp=1500&total_mp=100000&now=1705320000
```

#### Signature Generation (Off-Chain Oracle)
```typescript
import * as ed25519 from '@noble/ed25519';

const oraclePrivateKey = Uint8Array.from([...]); // 32-byte secret key

async function signClaimRequest(
  seasonId: number,
  wallet: string,
  mp: number,
  totalMp: number,
  now: number
): Promise<Uint8Array> {
  const message = `season=${seasonId}&wallet=${wallet}&mp=${mp}&total_mp=${totalMp}&now=${now}`;
  const messageBytes = new TextEncoder().encode(message);
  const signature = await ed25519.sign(messageBytes, oraclePrivateKey);
  return signature; // 64 bytes
}
```

#### Signature Verification (On-Chain)
The Anchor program uses Solana's `ed25519_verify` syscall:
```rust
use solana_program::ed25519_program;

let message = format!(
    "season={}&wallet={}&mp={}&total_mp={}&now={}",
    season_id, wallet.key(), mp, total_mp, now
);
let is_valid = ed25519_program::verify(
    &signature,
    message.as_bytes(),
    &global_state.oracle_pubkey.to_bytes()
);
require!(is_valid, InvalidSignature);
```

#### Security Considerations
- **Timestamp Window:** Accept signatures within ±60 seconds of `Clock::get()?.unix_timestamp` to prevent replay attacks.
- **Nonce (Optional):** Include a nonce in the message to prevent signature reuse.
- **Oracle Rotation:** Allow `authority` to update `oracle_pubkey` via a new instruction.

---

### Devnet Rollout Plan

#### Phase 1: Parallel Infrastructure (Weeks 1-2)
**Objective:** Deploy Anchor program alongside existing Supabase backend.

**Steps:**
1. **Deploy Anchor Program**
   - Deploy `empire-bonds` program to devnet.
   - Initialize `GlobalState` with oracle pubkey and SPL mint.
   - Create Season 1 with matching emission parameters.

2. **Mint War Bonds SPL Token**
   - Create SPL token mint with mint authority set to `GlobalState` PDA.
   - Metadata: `name: "War Bonds", symbol: "BONDS", decimals: 9`.

3. **Deploy Oracle Service**
   - Standalone service (e.g., Node.js + Express) that:
     - Queries Supabase for player MP and global MP.
     - Generates Ed25519 signatures for claim requests.
     - Exposes endpoint: `POST /oracle/sign-claim`.
   - Store oracle private key in secure secret manager.

4. **Update Frontend (Feature Flag)**
   - Add feature flag: `USE_ONCHAIN_CLAIMS`.
   - When `false`: Use existing Supabase `claim-rewards` function.
   - When `true`: Call oracle, then invoke Anchor `claim` instruction.

**Validation:**
- Test claims on devnet using oracle signatures.
- Verify SPL tokens mint correctly.
- Ensure DB and on-chain MP values match.

---

#### Phase 2: Dual Mode (Weeks 3-4)
**Objective:** Run both systems in parallel for verification.

**Steps:**
1. **Sync Mechanism**
   - After every Supabase claim, log the event.
   - Oracle service periodically compares on-chain `PlayerAccount.total_claimed` with DB `bond_ledger` totals.
   - Alert on discrepancies.

2. **User Testing**
   - Invite devnet testers to claim via on-chain method.
   - Monitor gas costs, signature failures, and edge cases.

3. **Gradual Rollout**
   - Enable `USE_ONCHAIN_CLAIMS` for 10% of users.
   - Increase to 50%, then 100% over 2 weeks.

**Metrics:**
- Transaction success rate.
- Average claim latency (DB vs. on-chain).
- Oracle uptime and signature error rate.

---

#### Phase 3: Full Migration (Week 5)
**Objective:** Deprecate Supabase writes, use DB as read-only cache.

**Steps:**
1. **Disable DB Writes**
   - Set `claim-rewards`, `open-pack`, `train-unit` edge functions to read-only mode.
   - All mutations go through Anchor instructions.

2. **On-Chain Pack Openings**
   - Deploy `open_pack` instruction with VRF (Switchboard).
   - Mint unit NFTs via Metaplex.
   - Burn War Bonds via `token::burn`.

3. **On-Chain Training**
   - Deploy `train_unit` instruction.
   - Update NFT metadata on-chain.
   - Burn training cost, update oracle MP cache.

4. **DB as Cache**
   - Periodically sync on-chain state to Supabase for fast UI queries.
   - Use Solana account webhooks (Helius, QuickNode) to trigger sync.

**Cutover:**
- Announce maintenance window (1 hour).
- Snapshot final DB state.
- Migrate user balances to on-chain (airdrop SPL tokens if needed).
- Switch frontend to 100% on-chain mode.

---

#### Phase 4: Mainnet Preparation (Week 6+)
**Objective:** Prepare for mainnet launch.

**Steps:**
1. **Audit Anchor Program**
   - Security audit by reputable firm (e.g., Neodyme, OtterSec).
   - Fix vulnerabilities, re-deploy to devnet for final testing.

2. **Mainnet Deployment**
   - Deploy program to mainnet-beta.
   - Initialize `GlobalState` with mainnet treasury.
   - Mint mainnet War Bonds token.

3. **User Migration**
   - Snapshot devnet balances.
   - Offer mainnet airdrop or require re-initialization.

4. **Marketing Launch**
   - Announce on Twitter, Discord.
   - Run Season 1 with real economic incentives.

---

### App Switching from DB Credit to On-Chain Mint/Burn

#### Frontend Changes

**Before (DB Mode):**
```typescript
// claim-rewards edge function
const response = await supabase.functions.invoke('claim-rewards', {
  body: { walletAddress }
});
// Updates inventory_currency.war_bonds in DB
```

**After (On-Chain Mode):**
```typescript
import { claimEmissions } from '@/lib/anchor/instructions';
import { getOracleSignature } from '@/lib/oracle';

async function handleClaim() {
  // 1. Fetch oracle signature
  const { mp, totalMp, now, signature } = await getOracleSignature(
    seasonId,
    walletAddress
  );

  // 2. Build Anchor instruction
  const tx = await claimEmissions({
    wallet: publicKey,
    seasonId,
    mp,
    totalMp,
    now,
    signature,
  });

  // 3. Send transaction
  const txSig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(txSig);

  // 4. Refresh balance from SPL token account
  const tokenAccount = await getAssociatedTokenAddress(
    warBondsMint,
    publicKey
  );
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  setWarBonds(balance.value.uiAmount);
}
```

#### Oracle Endpoint (`/oracle/sign-claim`)

**Request:**
```json
POST /oracle/sign-claim
{
  "seasonId": 1,
  "walletAddress": "8xKz...Abc"
}
```

**Response:**
```json
{
  "ok": true,
  "mp": 1500,
  "totalMp": 100000,
  "now": 1705320000,
  "signature": "a1b2c3..." // 128-char hex (64 bytes)
}
```

**Implementation:**
```typescript
app.post('/oracle/sign-claim', async (req, res) => {
  const { seasonId, walletAddress } = req.body;

  // Query Supabase for MP
  const { data: profile } = await supabase
    .from('profiles')
    .select('mp')
    .eq('wallet_address', walletAddress)
    .single();

  const { data: totalMpData } = await supabase
    .from('profiles')
    .select('mp');
  const totalMp = totalMpData.reduce((sum, p) => sum + Number(p.mp), 0);

  const now = Math.floor(Date.now() / 1000);
  const signature = await signClaimRequest(
    seasonId,
    walletAddress,
    profile.mp,
    totalMp,
    now
  );

  res.json({
    ok: true,
    mp: profile.mp,
    totalMp,
    now,
    signature: Buffer.from(signature).toString('hex'),
  });
});
```

---

### Migration Checklist

- [ ] Deploy Anchor program to devnet
- [ ] Initialize GlobalState with oracle pubkey
- [ ] Mint War Bonds SPL token
- [ ] Deploy oracle signing service
- [ ] Add feature flag to frontend
- [ ] Test on-chain claims with 10 devnet wallets
- [ ] Monitor oracle uptime for 1 week
- [ ] Gradually enable for 50% of users
- [ ] Audit Anchor program
- [ ] Deploy to mainnet
- [ ] Migrate user balances
- [ ] Announce launch

---

**End of Anchor Specification**
