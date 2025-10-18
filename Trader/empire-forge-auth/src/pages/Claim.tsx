import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Gift, Coins, TrendingUp, Clock, Loader2 } from "lucide-react";
import { useSession } from "@/state/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ClaimResult {
  amount: number;
  userMp: number;
  totalMp: number;
  minutes: number;
  season: {
    id: string;
    name: string;
    basePerHour: number;
  };
}

const Claim = () => {
  const { walletAddress, balances, refreshAll } = useSession();
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);
  const [lastClaim, setLastClaim] = useState<string | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  useEffect(() => {
    refreshAll();
    fetchLastClaim();
  }, [walletAddress]);

  const fetchLastClaim = async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(
        'https://miflbztkdctpibawermj.supabase.co/functions/v1/get-balances',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        }
      );

      const data = await response.json();
      if (response.ok && data.last_claim_at) {
        setLastClaim(data.last_claim_at);
      } else {
        setLastClaim(null);
      }
    } catch (err) {
      console.error('Failed to fetch last claim time:', err);
    }
  };

  const handleClaim = async () => {
    if (!walletAddress) return;

    setClaiming(true);
    try {
      const response = await fetch(
        'https://miflbztkdctpibawermj.supabase.co/functions/v1/claim-rewards',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim rewards');
      }

      setClaimResult({
        amount: data.amount,
        userMp: data.userMp,
        totalMp: data.totalMp,
        minutes: data.minutes,
        season: data.season,
      });

      toast({
        title: "Rewards claimed!",
        description: `Claimed ${data.amount.toFixed(2)} War Bonds`,
      });

      // Refresh balances
      await useSession.getState().refreshAll();
      await fetchLastClaim();
    } catch (error: any) {
      toast({
        title: "Claim failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with Balances */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Gift className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Claim Rewards</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">War Bonds:</span>
              <span className="text-lg font-bold">{balances.war_bonds.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">MP:</span>
              <span className="text-lg font-bold">{balances.mp.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Claim Card */}
        <Card>
          <CardHeader>
            <CardTitle>Claim War Bonds</CardTitle>
            <CardDescription>
              Earn War Bonds based on your Military Power (MP) and time since last claim
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Last Claim Time */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Last claimed: {formatTimeAgo(lastClaim)}
              </span>
            </div>

            {/* Claim Button */}
            <Button
              onClick={handleClaim}
              disabled={claiming}
              size="lg"
              className="w-full"
            >
              {claiming ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-5 w-5" />
                  Claim Now
                </>
              )}
            </Button>

            {/* Claim Result Details */}
            {claimResult && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
                <h3 className="font-semibold text-lg mb-3">Claim Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Season:</span>
                    <span className="font-medium">{claimResult.season.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your MP:</span>
                    <span className="font-medium">{claimResult.userMp.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total MP:</span>
                    <span className="font-medium">{claimResult.totalMp.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Base Rate:</span>
                    <span className="font-medium">{claimResult.season.basePerHour}/hr</span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Elapsed:</span>
                    <span className="font-medium">{claimResult.minutes} min</span>
                  </div>
                  <div className="flex justify-between col-span-2 pt-2 border-t">
                    <span className="font-semibold">Claimed:</span>
                    <span className="font-bold text-primary text-lg">
                      {claimResult.amount.toFixed(2)} Bonds
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• War Bonds are earned based on your Military Power (MP)</p>
              <p>• Higher MP = higher rewards</p>
              <p>• Claim frequently to maximize your earnings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default Claim;
