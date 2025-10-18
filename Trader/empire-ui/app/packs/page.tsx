'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { callEdge } from '@/lib/callEdge';
import toast from 'react-hot-toast';

export default function PacksPage() {
  const { publicKey } = useWallet();
  const [opening, setOpening] = useState(false);

  // Pack types (would normally be fetched from backend)
  const packTypes = [
    {
      slug: 'common',
      name: 'Common Pack',
      price_bonds: 100,
      description: 'Contains 1 Beater or Street car',
      tier: 'beater',
    },
    {
      slug: 'rare',
      name: 'Rare Pack',
      price_bonds: 500,
      description: 'Contains 1 Sport or Supercar',
      tier: 'sport',
    },
    {
      slug: 'legendary',
      name: 'Legendary Pack',
      price_bonds: 2000,
      description: 'Contains 1 Hypercar or better',
      tier: 'hypercar',
    },
  ];

  async function handleOpenPack(packType: string, price: number) {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setOpening(true);
    const loadingToast = toast.loading(`Opening ${packType} pack...`);

    const res = await callEdge('open-pack', {
      body: {
        walletAddress: publicKey.toString(),
        packType,
        qty: 1,
      },
    });

    toast.dismiss(loadingToast);
    setOpening(false);

    if (res.ok) {
      const units = res.data?.units || [];
      const granted = res.data?.granted || 0;

      toast.success(
        `Pack opened! Got ${granted} new car${granted !== 1 ? 's' : ''}!`,
        { duration: 5000 }
      );

      if (units.length > 0) {
        units.forEach((unit: any) => {
          toast(`🏎️ ${unit.tier_key.toUpperCase()} Level ${unit.level}`, {
            icon: '🎉',
            duration: 4000,
          });
        });
      }

      // Refresh garage after short delay
      setTimeout(() => {
        window.location.href = '/garage';
      }, 2000);
    } else {
      let errorMsg = res.error || 'Failed to open pack';
      if (res.status === 400 && res.data?.error === 'insufficient_bonds') {
        errorMsg = `Not enough bonds! Need ${res.data.need}, have ${res.data.have}`;
      } else if (res.status === 404) {
        errorMsg = 'Pack type not found or function not deployed';
      }
      toast.error(`${errorMsg} (${res.status})`);
    }
  }

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Packs</h1>
        <p className="text-gray-600">Connect your wallet to open packs</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">📦 Packs</h1>
      <p className="text-gray-600 mb-8">Open packs to get new cars for your garage</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packTypes.map((pack) => (
          <div key={pack.slug} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
              <div className="text-5xl mb-3 text-center">📦</div>
              <h3 className="text-2xl font-bold text-center">{pack.name}</h3>
            </div>

            <div className="p-6">
              <p className="text-gray-600 mb-4 text-center">{pack.description}</p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Price:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {pack.price_bonds.toLocaleString()} WB
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleOpenPack(pack.slug, pack.price_bonds)}
                disabled={opening}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  opening
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {opening ? 'Opening...' : 'Open Pack'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold mb-2">ℹ️ How it works:</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Pack cost is deducted using 80/10/10 split (burn/referral/treasury)</li>
          <li>Each pack grants 1 car of the specified tier range</li>
          <li>All cars start at Level 1</li>
          <li>Use Training to level up (1→3) or Recycle to tier up</li>
        </ul>
      </div>
    </div>
  );
}


