# Empire — Product & Tokenomics Requirements (Authoritative)

## A) Core Gameplay
- **REQ-100** Wallet-only account (first connect → profile row).
- **REQ-101** Initialization payment (0.5 SOL) verified **by tx signature only**; on success grant starter bundle (3 common units + 100 WB).
- **REQ-102** Packs: list from DB; spending WB opens packs with configured drop rates.
- **REQ-103** Barracks: train/upgrade units with WB; upgrades increase unit MP.
- **REQ-104** Military Power (MP): player MP = Σ(unit_count × unit_MP); global MP = Σ(all players).
- **REQ-105** Claim: earn WB by MP share over time (math below); cooldown ≥ 1 min; season-aware.
- **REQ-106** Leaderboard: top N by MP; header shows global MP.
- **REQ-107** Profile: shows WB balance (DB or on-chain per flag), MP, last claim time.

## B) Economy / Tokenomics
- **REQ-120** Single currency: **War Bonds (WB)** (6 decimals).
- **REQ-121** Spend split on **every in-game spend** (packs, training, fees): **80% burn, 10% referral, 10% treasury**.
- **REQ-122** Referrals: one referrer per player, 30-day attribution; self-referral blocked; idempotent payouts.
- **REQ-123** Treasury addresses (devnet/mainnet) stored in config.
- **REQ-124** Halving schedule for emissions (stepwise multipliers over time).
- **REQ-125** One active season; per-season emission & burn config.

## C) On-Chain (Anchor) Mode
- **REQ-140** Program accounts: Global, Season, Player; SPL mint for WB.
- **REQ-141** `claim(now, mp, total_mp, sig)` mints WB after oracle **ed25519** signature check.
- **REQ-142** `spend(amount)` burns WB; emits Spend/Burn events.
- **REQ-144** Referral payout on-chain: transfer 10% to referrer ATA within spend txn (or emit event for deferred settlement if ATA missing).
- **REQ-145** Halving schedule available on-chain **or** provided in the signed oracle payload (configurable source).

## D) Backend (Edge Functions)
- **REQ-160** `sign-claim` (ed25519 oracle signer).
- **REQ-161** `verify-init` (no memo): verify tx by signature → sender, dest treasury, lamports ≥ price, recent, unused.
- **REQ-162** `economy-stats` (totals & recent ledger).
- **REQ-163** `open-pack` (DB mode) with spend split → ledger rows.
- **REQ-164** `train-unit` (DB mode) with spend split → ledger rows.
- **REQ-165** `referral-capture` + payout (DB mode), idempotent.
- **REQ-166** `get-chain-config` (programId, mint, seasonPubkey).
- **REQ-167** `get-balances` (DB or chain per flag).

## E) Admin / Ops
- **REQ-180** Admin: Seasons CRUD + toggle active.
- **REQ-181** Admin: Economy dashboard (claimed/spent/burn/ref/treasury totals, rolling 24h).
- **REQ-182** Admin: Safe config editor (whitelisted keys only).
- **REQ-183** Admin: Devnet airdrop & manual WB grant (DB mode only).

## F) Security / Fairness
- **REQ-200** RLS read rules (players read only their own); gameplay writes via Edge (service role).
- **REQ-201** Claim anti-abuse: cooldown, monotonic timestamps, clamp negatives.
- **REQ-202** Spend idempotency via nonce/txid.
- **REQ-203** Oracle key rotation (active + next).
- **REQ-204** Referral fraud checks (no self-referral; device/IP heuristic; lock first referrer).

## G) Analytics
- **REQ-220** Event log: init, claim, open_pack, train, spend_split (burn/ref/treasury).
- **REQ-221** Funnel metrics: connect → init → first_pack → first_claim.

## H) Modes / Toggles
- **REQ-240** `USE_ONCHAIN_BONDS` flag (DB vs on-chain path).
- **REQ-241** Cluster config (devnet/testnet/mainnet) + RPC URL secrets.
- **REQ-242** Emission source toggle (on-chain vs oracle payload).

---

## Game Math (Canonical)

Let:
- `WB` = War Bonds; 6 decimals.
- `MP_i` = player i’s MP; `MP_total` = Σ MP_i across eligible players.
- `E_base` = base WB/hour for the active season.
- `H(t)` = halving multiplier at time `t` (1, 1/2, 1/4, …).
- `minutes` = floor((now − last_claim_at)/60), clamped to ≥ 0.

**Claim amount**
