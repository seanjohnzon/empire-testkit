'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { callEdge } from '@/lib/callEdge';
import toast from 'react-hot-toast';

export default function Home() {
  const { publicKey } = useWallet();
  const [bonds, setBonds] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchBonds();
    }
  }, [publicKey]);

  async function fetchBonds() {
    setLoading(true);
    const res = await callEdge('economy-stats');
    setLoading(false);

    if (res.ok && res.data) {
      // Extract bonds from economy stats or set to 0
      setBonds(res.data.bonds || 0);
    }
  }

  async function handleClaim() {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    const loadingToast = toast.loading('Claiming rewards...');
    const res = await callEdge('claim-rewards', {
      body: { walletAddress: publicKey.toString() },
    });

    toast.dismiss(loadingToast);

    if (res.ok) {
      toast.success(`Claimed ${res.data?.amount || 0} bonds!`);
      fetchBonds();
    } else {
      toast.error(`${res.error || 'Failed to claim'} (${res.status})`);
    }
  }

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold mb-4">Welcome to Empire Cars</h1>
        <p className="text-gray-600 mb-8">
          Connect your wallet to start building your garage
        </p>
        <div className="text-6xl mb-8">🏎️</div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
            <div className="text-sm opacity-80">War Bonds</div>
            <div className="text-3xl font-bold">
              {loading ? '...' : bonds.toLocaleString()}
            </div>
          </div>
          <div className="col-span-2 flex items-center space-x-4">
            <button
              onClick={handleClaim}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Claim Rewards
            </button>
            <Link
              href="/garage"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              View Garage
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/garage"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-3">🏠</div>
          <h2 className="text-xl font-bold mb-2">Garage</h2>
          <p className="text-gray-600">View and manage your car collection</p>
        </Link>

        <Link
          href="/packs"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-3">📦</div>
          <h2 className="text-xl font-bold mb-2">Packs</h2>
          <p className="text-gray-600">Open packs to get new cars</p>
        </Link>

        <Link
          href="/training"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-3">⚡</div>
          <h2 className="text-xl font-bold mb-2">Training</h2>
          <p className="text-gray-600">Level up your cars (1→3)</p>
        </Link>

        <Link
          href="/recycle"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-3">♻️</div>
          <h2 className="text-xl font-bold mb-2">Recycle</h2>
          <p className="text-gray-600">20% promote, 80% burn</p>
        </Link>

        <Link
          href="/economy"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-xl font-bold mb-2">Economy</h2>
          <p className="text-gray-600">View stats and ledger</p>
        </Link>

        <Link
          href="/sanity"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-2 border-yellow-400"
        >
          <div className="text-4xl mb-3">🧪</div>
          <h2 className="text-xl font-bold mb-2">E2E Sanity</h2>
          <p className="text-gray-600">Run automated tests</p>
        </Link>
      </div>
    </div>
  );
}
