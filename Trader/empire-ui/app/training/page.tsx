'use client';

import { useWallet } from '@solana/wallet-adapter-react';

export default function TrainingPage() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">Training</h1>
        <p className="text-gray-600">Connect your wallet to train your cars</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">⚡ Training</h1>
      <p className="text-gray-600 mb-8">Level up your cars (1→3)</p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-bold mb-2">🚧 Under Construction</h3>
        <p className="text-gray-700 mb-4">
          This page will allow you to:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>Select a car from your garage</li>
          <li>Choose levels to gain (max level 3)</li>
          <li>Preview cost: 10 × targetLevel per level</li>
          <li>POST train-unit with walletAddress, unitId, levels</li>
          <li>Show ledger delta and updated car</li>
        </ul>
        <p className="text-gray-600 mt-4">
          For now, use the Train button on individual cars in the Garage.
        </p>
      </div>
    </div>
  );
}
