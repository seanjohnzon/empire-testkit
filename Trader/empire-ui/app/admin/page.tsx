'use client';

import { useWallet } from '@solana/wallet-adapter-react';

export default function AdminPage() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Admin</h1>
        <p className="text-gray-600">Connect your wallet</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">⚙️ Admin (Seasons)</h1>
      <p className="text-gray-600 mb-8">Manage seasons (admin only)</p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-bold mb-2">🚧 Under Construction</h3>
        <p className="text-gray-700 mb-4">
          This page will allow admins to:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>GET list-seasons to show all seasons</li>
          <li>POST toggle-season with walletAddress, seasonId</li>
          <li>Show disabled state for non-admins (403)</li>
        </ul>
      </div>
    </div>
  );
}
