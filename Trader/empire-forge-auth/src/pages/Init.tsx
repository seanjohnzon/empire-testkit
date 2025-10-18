import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Copy, Check, Loader2, Wallet, Droplet, HeartPulse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayWithAdapter } from "@/lib/solanaTransfer";
import { WalletDebugPanel } from "@/components/WalletDebugPanel";

interface InitPaymentDetails {
  treasury: string;
  priceSol: string;
}

const Init = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const pay = usePayWithAdapter();
  
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<InitPaymentDetails | null>(null);
  const [copiedTreasury, setCopiedTreasury] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [airdropping, setAirdropping] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [pollingBalance, setPollingBalance] = useState(false);
  const [treasuryValid, setTreasuryValid] = useState(true);

  const isDev = import.meta.env.VITE_DEV_BYPASS_INIT === 'true';
  const isDevnet = import.meta.env.VITE_SOLANA_CLUSTER === 'devnet';
  const debugWallet = import.meta.env.VITE_DEBUG_WALLET !== 'false';

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!publicKey) return;

      try {
        setLoading(true);
        const response = await fetch(
          'https://miflbztkdctpibawermj.supabase.co/functions/v1/request-init',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: publicKey.toBase58() })
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch payment details');
        }

        const data = await response.json();
        setPaymentDetails(data);
        
        // Validate treasury address
        let valid = true;
        try {
          new PublicKey(data.treasury);
        } catch {
          valid = false;
        }
        setTreasuryValid(valid);
        if (!valid) {
          setError('Treasury address is invalid');
        }
      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [publicKey, toast]);

  // Poll wallet balance on devnet
  useEffect(() => {
    if (!publicKey || !isDevnet || !pollingBalance) return;

    const pollBalance = async () => {
      try {
        const connection = new Connection("https://api.devnet.solana.com");
        const bal = await connection.getBalance(publicKey);
        const solBalance = bal / LAMPORTS_PER_SOL;
        setBalance(solBalance);

        // Stop polling once balance is sufficient
        if (solBalance >= 0.5) {
          setPollingBalance(false);
        }
      } catch (err) {
        console.error('Balance polling error:', err);
      }
    };

    pollBalance();
    const interval = setInterval(pollBalance, 3000);
    return () => clearInterval(interval);
  }, [publicKey, isDevnet, pollingBalance]);

  const handleDevAirdrop = async () => {
    if (!publicKey) return;

    try {
      setAirdropping(true);
      const response = await fetch(
        'https://miflbztkdctpibawermj.supabase.co/functions/v1/dev-airdrop',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            walletAddress: publicKey.toBase58(),
            sol: 2
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Airdrop failed');
      }

      toast({
        title: "Airdrop requested",
        description: "It can take ~10–30s to confirm. Your balance will update automatically."
      });

      // Start polling balance
      setPollingBalance(true);

    } catch (err: any) {
      toast({
        title: "Airdrop failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setAirdropping(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedTreasury(true);
    setTimeout(() => setCopiedTreasury(false), 2000);
    toast({
      title: "Copied!",
      description: "Treasury address copied to clipboard"
    });
  };

  const handlePayment = async () => {
    // Debounce: prevent multiple clicks
    if (inFlight || !publicKey || !paymentDetails) {
      if (!publicKey || !paymentDetails) {
        toast({
          title: "Error",
          description: "Wallet not connected or payment details missing",
          variant: "destructive"
        });
      }
      return;
    }

    // Validate treasury address
    try {
      new PublicKey(paymentDetails.treasury.trim());
    } catch {
      setError("Invalid treasury address");
      toast({
        title: "Error",
        description: "Treasury address is invalid",
        variant: "destructive"
      });
      return;
    }

    const rpcUrl = isDevnet 
      ? "https://api.devnet.solana.com"
      : "https://api.mainnet-beta.solana.com";

    try {
      setInFlight(true);
      setProcessing(true);
      setError(null);

      // Single wallet request using adapter
      const signature = await pay({
        toAddress: paymentDetails.treasury.trim(),
        amountSol: parseFloat(paymentDetails.priceSol),
        rpcUrl
      });

      // Log for debugging
      const explorerUrl = isDevnet 
        ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        : `https://explorer.solana.com/tx/${signature}`;
      
      console.log('💳 Payment sent:', {
        payingTo: paymentDetails.treasury,
        treasuryFromServer: paymentDetails.treasury,
        signature,
        explorerUrl,
        cluster: isDevnet ? 'devnet' : 'mainnet'
      });

      toast({
        title: "Transaction sent",
        description: "Verifying payment..."
      });

      // Verify payment with polling
      await verifyPayment(signature, explorerUrl);

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      toast({
        title: "Payment failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setInFlight(false);
    }
  };

  const verifyPayment = async (txSignature: string, explorerUrl: string) => {
    if (!publicKey) return;

    try {
      const body = {
        walletAddress: publicKey.toBase58(),
        txSignature
      };

      // Poll up to 20 times with 2-second intervals
      for (let i = 0; i < 20; i++) {
        const response = await fetch(
          'https://miflbztkdctpibawermj.supabase.co/functions/v1/verify-init',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
        );

        const data = await response.json();

        // Success
        if (response.status === 200 && data.ok) {
          console.log('✅ Verification success:', {
            method: data.method,
            amountSol: data.amountSol,
            cluster: data.cluster
          });
          
          toast({
            title: "Success!",
            description: "Your account has been initialized. Welcome, Commander!"
          });

          setTimeout(() => {
            navigate("/packs");
          }, 1500);
          return;
        }

        // Still pending - wait and retry
        if (response.status === 202 && data.pending) {
          console.log(`Verification attempt ${i + 1}/20: pending`);
          toast({
            title: "Confirming transaction...",
            description: `Attempt ${i + 1}/20 - Transaction is pending confirmation`
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // Error occurred - log debug info
        console.error('🔍 VERIFY-INIT ERROR:', {
          error: data.error,
          debug: data.debug,
          signature: txSignature,
          explorerUrl
        });
        
        if (data.debug) {
          console.error('Debug details:', JSON.stringify(data.debug, null, 2));
        }
        
        throw new Error(data.error || 'Verification failed');
      }

      // Timeout after 20 attempts
      throw new Error('Timeout waiting for transaction confirmation');

    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Verification failed",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleHealthCheck = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(
        'https://miflbztkdctpibawermj.supabase.co/functions/v1/get-balances',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
        }
      );

      const data = await response.json();

      console.log('🏥 Health Check Result:', data);
      toast({
        title: response.ok ? "Health Check Success" : "Health Check Failed",
        description: response.ok 
          ? `War Bonds: ${data.war_bonds}, Iron: ${data.iron}, MP: ${data.mp}`
          : data.error || "Failed to fetch balances"
      });
    } catch (err: any) {
      console.error('Health check error:', err);
      toast({
        title: "Health Check Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleDevBypass = async () => {
    if (!publicKey) return;

    try {
      setProcessing(true);
      // Use a fake signature for dev mode
      await verifyPayment('DEV_BYPASS_' + Date.now(), 'https://explorer.solana.com/tx/DEV_BYPASS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || 'Failed to load payment details'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4 mx-auto">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Initialize Your Empire</CardTitle>
          <CardDescription>
            Send 0.5 SOL to activate your account and receive starter resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Details */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Treasury Address</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(paymentDetails.treasury)}
                  className="h-8 w-8 p-0"
                >
                  {copiedTreasury ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs font-mono break-all text-muted-foreground">
                {paymentDetails.treasury}
              </p>
              {!treasuryValid && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-destructive font-medium">
                    Treasury address invalid
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hint: Set public.config 'solana_treasury' to a valid devnet address
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Required Amount</span>
              </div>
              <p className="text-2xl font-bold">{paymentDetails.priceSol} SOL</p>
            </div>
          </div>

          {/* Rewards Info */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <h3 className="font-semibold mb-2">You'll Receive:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 200 War Bonds</li>
              <li>• 200 Iron</li>
              <li>• 3 Common Units</li>
              <li>• Full access to all game features</li>
            </ul>
          </div>

          {/* Dev Airdrop */}
          {isDevnet && (
            <div className="space-y-2">
              <Button
                onClick={handleDevAirdrop}
                variant="secondary"
                className="w-full"
                disabled={airdropping || pollingBalance}
              >
                {airdropping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting Airdrop...
                  </>
                ) : pollingBalance ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Waiting for confirmation...
                  </>
                ) : (
                  <>
                    <Droplet className="mr-2 h-4 w-4" />
                    Get Dev SOL (2 SOL)
                  </>
                )}
              </Button>
              {balance !== null && (
                <p className="text-sm text-center text-muted-foreground">
                  Current balance: {balance.toFixed(4)} SOL
                </p>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Payment Button */}
          <Button 
            onClick={handlePayment} 
            className="w-full" 
            size="lg"
            disabled={processing || !treasuryValid || (isDevnet && balance !== null && balance < 0.5)}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Open Wallet & Pay 0.5 SOL
              </>
            )}
          </Button>

          {/* Dev Bypass */}
          {isDev && (
            <Button
              onClick={handleDevBypass}
              variant="outline"
              className="w-full"
              disabled={processing}
            >
              DEV: Simulate Init
            </Button>
          )}
          
          {/* Health Check */}
          {debugWallet && publicKey && (
            <Button
              onClick={handleHealthCheck}
              variant="secondary"
              className="w-full"
            >
              <HeartPulse className="mr-2 h-4 w-4" />
              Health Check (Get Balances)
            </Button>
          )}
        </CardContent>
      </Card>
      
      {debugWallet && <WalletDebugPanel />}
    </div>
  );
};

export default Init;
