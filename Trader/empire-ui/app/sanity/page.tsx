'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { callEdge } from '@/lib/callEdge';
import toast from 'react-hot-toast';

export default function SanityPage() {
  const { publicKey } = useWallet();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  async function runSanityTests() {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    setRunning(true);
    setResults([]);
    const wallet = publicKey.toString();

    // Test 1: Claim rewards
    addResult('🧪 Test 1: Claiming rewards...');
    const claim = await callEdge('claim-rewards', {
      body: { walletAddress: wallet },
    });

    if (claim.ok) {
      addResult(`✅ Claimed ${claim.data?.amount || 0} bonds`);
    } else {
      addResult(`❌ Claim failed: ${claim.error} (${claim.status})`);
    }

    // Test 2: Open a pack
    addResult('🧪 Test 2: Opening pack...');
    const pack = await callEdge('open-pack', {
      body: { walletAddress: wallet, packType: 'common', qty: 1 },
    });

    if (pack.ok) {
      const granted = pack.data?.granted || 0;
      addResult(`✅ Opened pack, got ${granted} car(s)`);

      // Test 3: Train unit if we got one
      if (pack.data?.units?.[0]?.id) {
        const unitId = pack.data.units[0].id;
        addResult(`🧪 Test 3: Training unit ${unitId.slice(0, 8)}...`);

        const train = await callEdge('train-unit', {
          body: { walletAddress: wallet, unitId, levels: 1 },
        });

        if (train.ok) {
          addResult(`✅ Trained to level ${train.data?.newLevel || '?'}`);
        } else {
          addResult(`❌ Training failed: ${train.error} (${train.status})`);
        }

        // Test 4: Recycle attempt
        addResult(`🧪 Test 4: Recycling unit...`);
        const recycle = await callEdge('recycle-unit', {
          body: { walletAddress: wallet, unitId },
        });

        if (recycle.ok) {
          const result = recycle.data?.result || 'unknown';
          if (result === 'promote') {
            addResult(`✅ Recycled: Promoted to ${recycle.data?.newTier || '?'}`);
          } else {
            addResult(`✅ Recycled: Burned (80% chance)`);
          }
        } else {
          addResult(`❌ Recycle failed: ${recycle.error} (${recycle.status})`);
        }
      } else {
        addResult('⚠️  No unit received, skipping train/recycle tests');
      }
    } else {
      addResult(`❌ Pack opening failed: ${pack.error} (${pack.status})`);
    }

    // Test 5: Economy stats
    addResult('🧪 Test 5: Fetching economy stats...');
    const economy = await callEdge('economy-stats');

    if (economy.ok) {
      addResult(`✅ Economy stats fetched`);
    } else {
      addResult(`❌ Economy failed: ${economy.error} (${economy.status})`);
    }

    addResult('');
    addResult('✨ All sanity tests complete!');
    setRunning(false);
  }

  function addResult(msg: string) {
    setResults((prev) => [...prev, msg]);
  }

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">E2E Sanity Tests</h1>
        <p className="text-gray-600">Connect your wallet to run tests</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">🧪 E2E Sanity Tests</h1>
      <p className="text-gray-600 mb-6">
        Automated smoke tests for core game flow
      </p>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <button
          onClick={runSanityTests}
          disabled={running}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            running
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {running ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-900 text-green-400 rounded-lg p-6 font-mono text-sm">
          {results.map((result, i) => (
            <div key={i} className="mb-1">
              {result}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold mb-2">ℹ️ Test Flow:</h3>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Claim rewards (creates profile if needed)</li>
          <li>Open a common pack (gets 1 car)</li>
          <li>Train the car to level 2</li>
          <li>Recycle the car (20% promote, 80% burn)</li>
          <li>Fetch economy stats</li>
        </ol>
      </div>
    </div>
  );
}


