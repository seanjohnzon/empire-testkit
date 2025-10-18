'use client';

import { useWallet } from '@solana/wallet-adapter-react';

export default function RecyclePage() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Recycle</h1>
        <p className="text-gray-600">Connect your wallet to recycle cars</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">♻️ Recycle</h1>
      <p className="text-gray-600 mb-8">20% promote to next tier, 80% burn</p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-bold mb-2">🚧 Under Construction</h3>
        <p className="text-gray-700 mb-4">
          This page will allow you to:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Select a car from your garage (not Godspeed)</li>
          <li>POST recycle-unit with walletAddress, unitId</li>
          <li>Show result toast (promote or burn)</li>
          <li>Refresh garage and show ledger change</li>
        </ul>
        <p className="text-gray-600 mt-4">
          For now, use the Recycle button on individual cars in the Garage.
        </p>
      </div>
    </div>
  );
}
