"use client";
import { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

export function usePayWithAdapter() {
  const { publicKey, sendTransaction } = useWallet();
  
  return async function pay({ toAddress, amountSol, rpcUrl }: { toAddress: string; amountSol: number; rpcUrl?: string }) {
    if (!publicKey) throw new Error("Wallet not connected");
    
    // Validate address before creating transaction
    let toPk: PublicKey;
    try {
      toPk = new PublicKey(toAddress);
    } catch {
      throw new Error("Invalid destination address");
    }
    
    // Use provided RPC or default to devnet
    const connection = new Connection(rpcUrl || clusterApiUrl("devnet"), "confirmed");
    
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: toPk,
        lamports: Math.floor(amountSol * 1_000_000_000),
      })
    );
    
    // ONE request: adapter assembles blockhash & submits
    const signature = await sendTransaction(tx, connection, { skipPreflight: false });
    return signature;
  };
}
