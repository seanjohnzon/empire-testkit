'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { callEdge } from '@/lib/callEdge';

export default function EconomyPage() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchEconomy();
    }
  }, [publicKey]);

  async function fetchEconomy() {
    setLoading(true);
    const res = await callEdge('economy-stats');
    if (res.ok) {
      setStats(res.data);
    }
    setLoading(false);
  }

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Economy</h1>
        <p className="text-gray-600">Connect your wallet to view economy stats</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">📊 Economy</h1>
      <p className="text-gray-600 mb-8">Stats and ledger</p>

      {loading && <div className="text-center py-10">Loading...</div>}

      {!loading && stats && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Totals</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-600 text-sm">Claimed</div>
                <div className="text-2xl font-bold">{stats.totals?.claimed || 0}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">Spent</div>
                <div className="text-2xl font-bold">{stats.totals?.spent || 0}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">Burned</div>
                <div className="text-2xl font-bold">{stats.totals?.burned || 0}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Recent Ledger (≤25)</h2>
            <div className="text-gray-600">
              Would show recent ledger entries with pill tags for:
              claim, spend, burn, train_level_up, recycle_promote, recycle_burn, etc.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
