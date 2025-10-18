# Requirements Coverage

- Total: **20**  |  Passed: **20**  |  Failed: **0**

## Test Scenarios

- 1.  REQ-105 Claim (Cars: fixed-pool earnings) REQ-105A: 400 when walletAddress missing — passed (344ms)
- 2.  REQ-105 Claim (Cars: fixed-pool earnings) REQ-105B: 200 and returns breakdown for known wallet (MP from car stats) — passed (588ms)
- 3.  REQ-105 Claim (Cars: fixed-pool earnings) REQ-201: cooldown immediate second call yields <= previous — passed (1098ms)
- 4.  REQ-105 Claim (Cars: fixed-pool earnings) REQ-202: crowding effect - doubling totalMP reduces per-minute earnings proportionally (fixed pool) — passed (578ms)
- 5.  REQ-401 Economy stats (Cars Theme ledger) REQ-401/402: economy stats totals and recents with new ledger kinds — passed (454ms)
- 6.  REQ-001/002 Seasons admin REQ-001: list-seasons returns array (or 405 if method mismatch) — passed (524ms)
- 7.  REQ-001/002 Seasons admin REQ-002: toggle-season admin-only (403 non-admin, 405 wrong method, or 200/400 if admin) — passed (162ms)
- 8.  REQ-310 Packs spend split (Cars Theme) REQ-310/315/318: pack grants cars with tier_key, level=1, and correct stats — passed (523ms)
- 9.  REQ-340 Recycle unit (Cars: tier-up mechanism) REQ-340: recycle returns either promote or burn result — passed (515ms)
- 10.  REQ-340 Recycle unit (Cars: tier-up mechanism) REQ-341: recycle promotes ~20% of the time (probabilistic) — passed (374ms)
- 11.  REQ-340 Recycle unit (Cars: tier-up mechanism) REQ-342: cannot recycle godspeed tier (max tier) — passed (312ms)
- 12.  REQ-520 Referral capture REQ-520: referral capture first set returns 200 — passed (224ms)
- 13.  REQ-520 Referral capture REQ-521: referral capture change attempt returns 409 — passed (388ms)
- 14.  REQ-520 Referral capture REQ-522: referral capture with same code is idempotent (200) — passed (460ms)
- 15.  REQ-520 Referral capture REQ-523: referral capture with missing wallet returns 400 — passed (108ms)
- 16.  REQ-520 Referral capture REQ-524: referral capture with non-existent wallet returns 404 — passed (213ms)
- 17.  REQ-160 Sign claim oracle REQ-160/145: sign claim returns signature and halving multiplier — passed (301ms)
- 18.  REQ-330 Train unit (Cars: level-only progression) REQ-330/315/318: training upgrades level only (1→3), never tier, with correct cost curve — passed (831ms)
- 19.  REQ-330 Train unit (Cars: level-only progression) REQ-331: training cannot exceed level 3 — passed (306ms)
- 20.  REQ-330 Train unit (Cars: level-only progression) REQ-332: training cost curve verification — passed (282ms)
