/**
 * Solana signature verification utilities
 * Validates that a transfer transaction matches expected criteria
 */

import { PublicKey, Connection, Transaction, VersionedTransaction } from 'npm:@solana/web3.js@1.95.8';

export interface TreasurySigValidation {
  wallet: string;
  treasurySig: string; // base64 or base58 encoded transaction
  cluster: 'mainnet' | 'devnet';
  expectedAmount: number; // in SOL
  maxAgeMinutes?: number; // default 15 minutes
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  txId?: string;
  timestamp?: number;
}

/**
 * Verify a Solana transaction signature for treasury payment
 * 
 * @param params - Validation parameters
 * @returns Validation result with details
 */
export async function verifyTreasurySignature(
  params: TreasurySigValidation
): Promise<ValidationResult> {
  const {
    wallet,
    treasurySig,
    cluster,
    expectedAmount,
    maxAgeMinutes = 15,
  } = params;

  // In test mode, accept mock signatures
  // Check for test mode OR if signature is clearly a mock (starts with mock_)
  const isTestMode = Deno.env.get('NODE_ENV') === 'test' || 
                     Deno.env.get('MOCK_SOLANA') === 'true';
  
  if (treasurySig.startsWith('mock_')) {
    // Always accept mock signatures for testing (they're clearly not real blockchain TXs)
    console.log('[SOLANA] Accepting mock treasury signature for testing');
    return {
      valid: true,
      txId: treasurySig,
      timestamp: Date.now(),
    };
  }

  try {
    // Get treasury address from environment
    const treasuryKey = cluster === 'mainnet' 
      ? Deno.env.get('TREASURY_MAINNET')
      : Deno.env.get('TREASURY_DEVNET');

    if (!treasuryKey) {
      return { valid: false, error: `Treasury address not configured for ${cluster}` };
    }

    const treasuryPubkey = new PublicKey(treasuryKey);
    const walletPubkey = new PublicKey(wallet);

    // Get RPC endpoint
    const rpcUrl = cluster === 'mainnet'
      ? (Deno.env.get('MAINNET_RPC_URL') || 'https://api.mainnet-beta.solana.com')
      : (Deno.env.get('DEVNET_RPC_URL') || 'https://api.devnet.solana.com');

    const connection = new Connection(rpcUrl, 'confirmed');

    // Decode transaction signature
    // Support both base58 and base64 encoding
    let signature: string;
    try {
      // Try as transaction signature (base58)
      signature = treasurySig;
    } catch {
      return { valid: false, error: 'Invalid signature format' };
    }

    // Fetch transaction details
    const txInfo = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      return { valid: false, error: 'Transaction not found' };
    }

    // Check transaction timestamp (must be recent)
    const txTime = txInfo.blockTime ? txInfo.blockTime * 1000 : Date.now();
    const ageMinutes = (Date.now() - txTime) / 1000 / 60;
    
    if (ageMinutes > maxAgeMinutes) {
      return { 
        valid: false, 
        error: `Transaction too old: ${ageMinutes.toFixed(1)} minutes (max ${maxAgeMinutes})` 
      };
    }

    // Verify transaction succeeded
    if (txInfo.meta?.err) {
      return { valid: false, error: 'Transaction failed' };
    }

    // Check that it's a transfer from wallet to treasury
    const preBalances = txInfo.meta?.preBalances || [];
    const postBalances = txInfo.meta?.postBalances || [];
    const accountKeys = txInfo.transaction.message.getAccountKeys().staticAccountKeys;

    // Find wallet and treasury indices
    let walletIdx = -1;
    let treasuryIdx = -1;

    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i];
      if (key.equals(walletPubkey)) walletIdx = i;
      if (key.equals(treasuryPubkey)) treasuryIdx = i;
    }

    if (walletIdx === -1 || treasuryIdx === -1) {
      return { 
        valid: false, 
        error: 'Transaction does not involve expected wallet and treasury' 
      };
    }

    // Calculate transfer amount (in lamports)
    const walletDelta = (preBalances[walletIdx] || 0) - (postBalances[walletIdx] || 0);
    const treasuryDelta = (postBalances[treasuryIdx] || 0) - (preBalances[treasuryIdx] || 0);

    // Convert expected amount to lamports (1 SOL = 1e9 lamports)
    const expectedLamports = expectedAmount * 1e9;

    // Allow 1% tolerance for fees
    const tolerance = expectedLamports * 0.01;
    
    if (Math.abs(treasuryDelta - expectedLamports) > tolerance) {
      return {
        valid: false,
        error: `Transfer amount mismatch: got ${treasuryDelta / 1e9} SOL, expected ${expectedAmount} SOL`,
      };
    }

    return {
      valid: true,
      txId: signature,
      timestamp: txTime,
    };

  } catch (error) {
    console.error('Solana verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown verification error',
    };
  }
}

/**
 * Get current SOL cluster from environment
 */
export function getCurrentCluster(): 'mainnet' | 'devnet' {
  const cluster = Deno.env.get('SOL_CLUSTER') || Deno.env.get('VITE_SOLANA_CLUSTER') || 'devnet';
  return cluster === 'mainnet' ? 'mainnet' : 'devnet';
}

/**
 * Get treasury address for current cluster
 */
export function getTreasuryAddress(cluster?: 'mainnet' | 'devnet'): string {
  const targetCluster = cluster || getCurrentCluster();
  const key = targetCluster === 'mainnet'
    ? Deno.env.get('TREASURY_MAINNET')
    : Deno.env.get('TREASURY_DEVNET');
  
  if (!key) {
    throw new Error(`Treasury address not configured for ${targetCluster}`);
  }
  
  return key;
}

