# 🏎️ Empire Cars - UI

First playable slice of the Cars Theme blockchain racing game.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (same as empire-testkit)
- A Solana wallet (Phantom, Solflare, etc.)
- Supabase Edge Functions deployed (empire-forge-auth)

### Installation

1. **Install dependencies:**
```bash
cd empire-ui
npm install
```

2. **Configure environment:**
```bash
# Copy .env.local.example (already created)
# .env.local should contain:
NEXT_PUBLIC_SUPABASE_URL=https://miflbztkdctpibawermj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
```

3. **Run development server:**
```bash
npm run dev
```

4. **Open browser:**
```
http://localhost:3000
```

## 📁 Project Structure

```
empire-ui/
├── app/                    # Next.js 14 App Router
│   ├── page.tsx            # Dashboard/Home
│   ├── garage/page.tsx     # View & manage cars ✅
│   ├── packs/page.tsx      # Open packs ✅
│   ├── training/page.tsx   # Level up cars (stub)
│   ├── recycle/page.tsx    # Tier up/burn (stub)
│   ├── economy/page.tsx    # Stats & ledger (partial)
│   ├── admin/page.tsx      # Season management (stub)
│   └── sanity/page.tsx     # E2E tests ✅
├── components/
│   ├── WalletProvider.tsx  # Solana wallet context
│   └── Navigation.tsx      # Top nav with admin check
├── lib/
│   ├── callEdge.ts         # API helper ✅
│   └── carTiers.ts         # Cars config & formulas ✅
└── README.md               # This file
```

## 🎮 Features

### ✅ Implemented

#### Home Dashboard
- Wallet connection (Solana devnet)
- Bonds balance display
- Quick claim rewards
- Navigation cards to all sections

#### Garage (Showroom)
- Fetch owned cars (via economy-stats or dedicated endpoint)
- Display car cards with:
  - Tier (Beater → Godspeed)
  - Level (1-3)
  - HP (base and actual)
  - Grip (%)
  - Fuel
  - Computed MP = hp × (1 + grip/100)
- Color-coded by tier
- Quick links to Train/Recycle

#### Packs
- List pack types (common, rare, legendary)
- Open pack: POST open-pack with walletAddress, packType, qty
- Display cost and description
- Success toast shows granted cars
- Auto-redirect to Garage on success
- Error handling:
  - 400: Insufficient bonds
  - 404: Pack not found or function not deployed

#### Sanity Tests (E2E)
- Automated flow:
  1. Claim rewards
  2. Open pack
  3. Train unit to level 2
  4. Recycle unit (20%/80%)
  5. Fetch economy stats
- Real-time results display
- HTTP status codes shown

#### Navigation
- Top nav with all sections
- Admin link appears only if wallet in admin_wallets
- Wallet address and cluster display
- WalletConnect button

### 🚧 Stub/Partial Implementation

#### Training (Stub)
- Page exists but redirects users to Garage
- Pattern documented in comments
- To complete:
  1. Fetch garage units
  2. Select unit + levels (1-2)
  3. Preview cost: `sum of (10 × targetLevel)`
  4. POST train-unit
  5. Show updated level

#### Recycle (Stub)
- Page exists but redirects users to Garage
- Pattern documented
- To complete:
  1. Fetch garage units (exclude Godspeed)
  2. POST recycle-unit
  3. Show promote (tier+1, level=1) or burn result
  4. Update garage

#### Economy (Partial)
- Fetches economy-stats
- Shows totals (claimed, spent, burned)
- Needs:
  - Recent ledger table (≤25 entries)
  - Pill tags for ledger kinds
  - Optional mini chart

#### Admin (Stub)
- Placeholder only
- To complete:
  1. GET list-seasons
  2. Display seasons table
  3. Toggle button (disabled if not admin)
  4. POST toggle-season with seasonId

## 🎨 Theme & Colors

### Tier Colors (Tailwind)
- **Beater:** gray
- **Street:** green
- **Sport:** blue
- **Supercar:** purple
- **Hypercar:** pink
- **Prototype:** orange
- **Godspeed:** red

### UI Labels (from Spec)
- Garage/Showroom ✓
- Cars (not "units") ✓
- HP, Fuel, Grip ✓
- War Bonds (WB) ✓
- Training (level-only) ✓
- Recycle (tier-up) ✓

## 🔧 API Integration

### callEdge Helper
All API calls use `lib/callEdge.ts`:

```typescript
import { callEdge } from '@/lib/callEdge';

const res = await callEdge('function-name', {
  body: { ...data },
});

if (res.ok) {
  // res.data contains response
} else {
  // res.error, res.status, res.message
}
```

### Function Names
- `claim-rewards` (POST)
- `economy-stats` (GET)
- `open-pack` (POST)
- `train-unit` (POST)
- `recycle-unit` (POST)
- `referral-capture` (POST)
- `sign-claim` (POST)
- `list-seasons` (GET)
- `toggle-season` (POST)

### Error Handling
All errors show toast with:
- HTTP status code
- Error message
- User-friendly context

## 🧪 Testing Flow

### Local Sanity Test
1. Connect wallet
2. Go to `/sanity`
3. Click "Run All Tests"
4. Watch automated flow:
   - Claim → Open pack → Train → Recycle → Economy
5. Results show in terminal-style output

### Manual Testing
1. **Claim**: Dashboard → "Claim Rewards"
2. **Pack**: Packs → Select pack → Open
3. **Garage**: View cars, check MP calculation
4. **Train**: Garage → Train button (if implemented)
5. **Recycle**: Garage → Recycle button (if implemented)

## 📦 Dependencies

### Core
- `next@15.5.6` - React framework
- `react@19` - UI library
- `typescript` - Type safety
- `tailwindcss` - Styling

### Solana
- `@solana/wallet-adapter-*` - Wallet connection
- `@solana/web3.js` - Solana utilities

### UI
- `react-hot-toast` - Notifications

## 🛠️ Development

### Run Dev Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run start
```

### Lint
```bash
npm run lint
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SOLANA_CLUSTER`
4. Deploy

### Environment Variables
**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon API key

**Optional:**
- `NEXT_PUBLIC_SOLANA_CLUSTER` - devnet/testnet/mainnet-beta (default: devnet)

## 📝 Extending the UI

### Adding a New Page

1. **Create page file:**
```typescript
// app/my-page/page.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { callEdge } from '@/lib/callEdge';

export default function MyPage() {
  const { publicKey } = useWallet();
  
  // Your implementation
}
```

2. **Add to Navigation:**
```typescript
// components/Navigation.tsx
const navLinks = [
  // ...existing
  { href: '/my-page', label: 'My Page' },
];
```

3. **Call Edge Functions:**
```typescript
const res = await callEdge('function-name', {
  body: { walletAddress: publicKey.toString(), ...data },
});

if (res.ok) {
  toast.success('Success!');
} else {
  toast.error(`${res.error} (${res.status})`);
}
```

### Car Stats Formulas

```typescript
import { computeCarStats } from '@/lib/carTiers';

const stats = computeCarStats('beater', 1);
// stats.hp = hp_base × levelMult
// stats.mp = hp × (1 + grip_pct/100)
```

### Training Cost Preview

```typescript
import { getTrainingCost } from '@/lib/carTiers';

const cost = getTrainingCost(1, 2); // L1→L3
// cost = 20 + 30 = 50 bonds
```

## ⚠️ Known Limitations

1. **Garage data fetching:**
   - Currently uses economy-stats
   - May need dedicated endpoint for player_units

2. **Pack types:**
   - Hardcoded pack list
   - Should fetch from pack_types table

3. **Admin check:**
   - Uses list-seasons as proxy
   - Should query admin_wallets table directly

4. **Ledger display:**
   - Not implemented in Economy page
   - Structure exists in backend

5. **Styling:**
   - Basic Tailwind classes
   - No heavy design system
   - Tier colors may not render in dynamic classes

## 🔗 Related Repos

- **Backend:** `empire-forge-auth` (Supabase Edge Functions)
- **Tests:** `empire-testkit` (Vitest test suite)
- **Docs:** `CARS_MIGRATION_COMPLETE.md`, `REFINEMENT_COMPLETE.md`

## 📖 References

- **Cars Theme Spec:** 7 tiers × 3 levels
- **Formulas:**
  - HP = hp_base × levelMult[level]
  - MP = hp × (1 + grip_pct / 100)
  - Training cost = Σ(10 × targetLevel)
- **Splits:** 80% burn, 10% referral, 10% treasury
- **Recycle:** 20% promote, 80% burn

## ✅ Acceptance Checklist

- [x] Next.js app created with TypeScript + Tailwind
- [x] Environment variables configured
- [x] Solana wallet connection working
- [x] callEdge helper uses NEXT_PUBLIC_ vars
- [x] Top nav with conditional Admin link
- [x] Home/Dashboard page
- [x] Garage page with car cards & MP display
- [x] Packs page with open functionality
- [x] E2E sanity test page
- [x] Error handling with toasts (status + message)
- [x] Theme labels from spec (Garage, Cars, HP, etc.)
- [ ] Complete Training page implementation
- [ ] Complete Recycle page implementation
- [ ] Complete Economy ledger display
- [ ] Complete Admin seasons management
- [ ] Fetch real garage data from backend

## 📞 Support

For issues or questions:
1. Check edge function deployment (empire-forge-auth)
2. Verify SQL migration ran (car_tiers, car_level_multipliers)
3. Check testkit passes (empire-testkit)
4. Review backend contracts in REFINEMENT_COMPLETE.md

---

**Ready to race! 🏁**
