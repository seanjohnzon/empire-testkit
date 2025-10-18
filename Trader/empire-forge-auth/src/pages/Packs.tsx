import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Package, Coins } from "lucide-react";
import { useSession } from "@/state/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface Currency {
  iron: number;
  war_bonds: number;
}

interface PackType {
  id: string;
  name: string;
  price_bonds: number;
  drops: any;
}

interface OpenResult {
  unitId: string;
  rarity: string;
  blueprintName: string;
}

const Packs = () => {
  const { walletAddress, balances, refreshAll } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [packTypes, setPackTypes] = useState<PackType[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [openResult, setOpenResult] = useState<OpenResult | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Refresh balances
      await refreshAll();
      
      // Fetch pack types
      const packsRes = await supabase.from('pack_types').select('*');

      if (packsRes.error) {
        console.error('Error fetching packs:', packsRes.error);
      } else if (packsRes.data) {
        setPackTypes(packsRes.data as PackType[]);
      }
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [walletAddress]);

  const handleOpenPack = async (packTypeId: string) => {
    if (!walletAddress) return;
    
    setOpening(true);
    try {
      const response = await fetch(
        `https://miflbztkdctpibawermj.supabase.co/functions/v1/open-pack`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packTypeId, walletAddress }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open pack');
      }

      setOpenResult(data);
      setShowResultModal(true);
      
      // Refresh balances via session store
      await useSession.getState().refreshAll();
      
      toast({
        title: "Pack opened!",
        description: `You recruited a ${data.rarity} unit!`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* Header with Balances */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Unit Packs</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">War Bonds:</span>
              <span className="text-lg font-bold">
                {loading ? '...' : balances.war_bonds.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Pack Cards */}
        <TooltipProvider>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packTypes.map((pack) => {
              const canAfford = balances.war_bonds >= pack.price_bonds;
              
              return (
                <Card key={pack.id}>
                  <CardHeader>
                    <CardTitle>{pack.name}</CardTitle>
                    <CardDescription>
                      Cost: {pack.price_bonds} War Bonds
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Drop Rates:</p>
                      {Array.isArray(pack.drops) && pack.drops.map((drop: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="capitalize">{drop.rarity}</span>
                          <span>{drop.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button
                            className="w-full"
                            onClick={() => handleOpenPack(pack.id)}
                            disabled={opening || !canAfford}
                          >
                            {opening ? 'Opening...' : 'Open Pack'}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!canAfford && (
                        <TooltipContent>
                          <p>Not enough War Bonds</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Result Modal */}
        <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>You recruited a {openResult?.rarity} unit!</DialogTitle>
              <DialogDescription>
                Unit: {openResult?.blueprintName}
                <br />
                Unit ID: {openResult?.unitId}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => {
                setShowResultModal(false);
                navigate('/barracks');
              }}>
                View in Barracks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default Packs;
