'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { callEdge } from '@/lib/callEdge';
import { CAR_TIERS, computeCarStats } from '@/lib/carTiers';
import toast from 'react-hot-toast';

interface CarUnit {
  id: string;
  tier_key: string;
  level: number;
  hp_base: number;
  grip_pct: number;
  fuel: number;
}

export default function GaragePage() {
  const { publicKey } = useWallet();
  const [units, setUnits] = useState<CarUnit[]>([]);
  const [bonds, setBonds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchGarage();
    }
  }, [publicKey]);

  async function fetchGarage() {
    if (!publicKey) return;

    setLoading(true);

    // Fetch economy stats to get bonds and potentially units
    const res = await callEdge('economy-stats');

    if (res.ok && res.data) {
      // Note: This endpoint may need adjustment based on actual response structure
      // For now, we'll use placeholder data
      setBonds(res.data.totals?.bondsMinted || 0);
      
      // In a real implementation, you'd fetch units from a dedicated endpoint
      // For now, showing how the structure would work
      setUnits(res.data.units || []);
    } else {
      toast.error(`Failed to fetch garage: ${res.error} (${res.status})`);
    }

    setLoading(false);
  }

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Garage</h1>
        <p className="text-gray-600">Connect your wallet to view your cars</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🏠 Garage (Showroom)</h1>
        <div className="bg-white rounded-lg shadow px-6 py-3">
          <div className="text-sm text-gray-600">War Bonds</div>
          <div className="text-2xl font-bold text-blue-600">
            {bonds.toLocaleString()}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading your garage...</p>
        </div>
      )}

      {!loading && units.length === 0 && (
        <div className="text-center py-20 bg-white rounded-lg shadow">
          <div className="text-6xl mb-4">🏎️</div>
          <h2 className="text-2xl font-bold mb-2">Your garage is empty</h2>
          <p className="text-gray-600 mb-6">
            Head to the Packs page to get your first car!
          </p>
          <a
            href="/packs"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium inline-block transition-colors"
          >
            Open Packs
          </a>
        </div>
      )}

      {!loading && units.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((unit) => {
            const tier = CAR_TIERS[unit.tier_key] || CAR_TIERS.beater;
            const stats = computeCarStats(unit.tier_key, unit.level);

            return (
              <div
                key={unit.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-${tier.color}-500`}
              >
                <div className={`bg-gradient-to-br from-${tier.color}-100 to-${tier.color}-200 p-6`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">{tier.display}</h3>
                      <div className="text-sm text-gray-600">Level {unit.level}</div>
                    </div>
                    <div className="text-4xl">🏎️</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">HP (Base):</span>
                      <span className="font-bold">{stats.hp_base}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">HP (Actual):</span>
                      <span className="font-bold text-green-600">{stats.hp}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Grip:</span>
                      <span className="font-bold">{stats.grip_pct}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fuel:</span>
                      <span className="font-bold">{stats.fuel}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-gray-600">MP:</span>
                      <span className="font-bold text-blue-600">{stats.mp.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 flex space-x-2">
                  <a
                    href={`/training?unitId=${unit.id}`}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-center text-sm font-medium transition-colors"
                  >
                    Train
                  </a>
                  {unit.tier_key !== 'godspeed' && (
                    <a
                      href={`/recycle?unitId=${unit.id}`}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-center text-sm font-medium transition-colors"
                    >
                      Recycle
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


