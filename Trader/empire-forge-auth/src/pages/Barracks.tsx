import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Shield, Coins, TrendingUp, Loader2 } from "lucide-react";
import { useSession } from "@/state/useSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Unit {
  id: string;
  level: number;
  rank: number;
  created_at: string;
  blueprint_id: string;
  name: string;
  rarity: string;
  base_power: number;
}

const Barracks = () => {
  const { walletAddress, balances, refreshAll } = useSession();
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState<string | null>(null);

  const fetchUnits = async () => {
    if (!walletAddress) return;

    try {
      const response = await fetch(
        'https://miflbztkdctpibawermj.supabase.co/functions/v1/list-units',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch units');
      }

      setUnits(data.units || []);
    } catch (error: any) {
      console.error('Failed to fetch units:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    fetchUnits();
  }, [walletAddress]);

  const calculateMP = (baseMP: number, level: number): number => {
    return Math.floor(baseMP * (1 + 0.1 * (level - 1)));
  };

  const calculateTrainCost = (level: number): number => {
    return 50 + (25 * level);
  };

  const handleTrain = async (unitId: string) => {
    if (!walletAddress) return;

    setTraining(unitId);
    try {
      const response = await fetch(
        'https://miflbztkdctpibawermj.supabase.co/functions/v1/train-unit',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitId, walletAddress }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to train unit');
      }

      toast({
        title: "Training complete!",
        description: `Level up to ${data.newLevel} (War Bonds -${data.cost})`,
      });

      // Refresh balances and units
      await refreshAll();
      await fetchUnits();
    } catch (error: any) {
      toast({
        title: "Training failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTraining(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: "bg-gray-500",
      rare: "bg-blue-500",
      epic: "bg-purple-500",
      legendary: "bg-orange-500",
      mythic: "bg-red-500",
    };
    return colors[rarity.toLowerCase()] || "bg-gray-500";
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* Header with Balances */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Barracks</h1>
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

        {/* Units List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : units.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground text-center">
                No units yet—open a Pack to recruit soldiers.
              </p>
              <Button className="mt-4" onClick={() => window.location.href = '/packs'}>
                Go to Packs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {units.map((unit) => (
              <Card key={unit.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{unit.name}</CardTitle>
                      <Badge className={getRarityColor(unit.rarity)}>
                        {unit.rarity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Level</p>
                        <p className="text-2xl font-bold">{unit.level}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">MP Contribution</p>
                        <p className="text-2xl font-bold text-primary">
                          {calculateMP(unit.base_power, unit.level)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <CardDescription>
                    Base Power: {unit.base_power} | Recruited: {new Date(unit.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Training Cost: <span className="font-bold text-foreground">{calculateTrainCost(unit.level)} War Bonds</span>
                    </div>
                    <Button
                      onClick={() => handleTrain(unit.id)}
                      disabled={training === unit.id || balances.war_bonds < calculateTrainCost(unit.level)}
                      size="sm"
                    >
                      {training === unit.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Training...
                        </>
                      ) : (
                        'Train Unit'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Barracks;
