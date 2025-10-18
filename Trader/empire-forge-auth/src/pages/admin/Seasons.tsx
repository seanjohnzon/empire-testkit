import { useState, useEffect } from "react";
import { callEdge } from "@/lib/edge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, ChevronDown } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import AdminGate from "@/components/AdminGate";

interface Season {
  id: string;
  name: string;
  emission_per_hour: number;
  burn_pct: number;
  is_active: boolean;
  start_at: string;
  end_at?: string;
}

const Seasons = () => {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [newSeasonOpen, setNewSeasonOpen] = useState(false);
  const [editSeasonOpen, setEditSeasonOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    emission_per_hour: "",
    burn_pct: "",
    start_at: "",
    end_at: "",
  });

  const fetchSeasons = async () => {
    try {
      const data = await callEdge("list-seasons", { method: "GET" });
      if (data.ok) {
        setSeasons(data.seasons);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch seasons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  const handleCreate = async () => {
    if (!walletAddress) return;
    
    setRequesting(true);
    setErrorDetails(null);
    try {
      const data = await callEdge("admin-set-season", {
        method: "POST",
        json: {
          walletAddress,
          action: "create",
          name: formData.name,
          emission_per_hour: Number(formData.emission_per_hour),
          burn_pct: Number(formData.burn_pct),
          start_at: formData.start_at || undefined,
        },
      });

      if (data?.error === "not_admin") {
        toast({
          title: "Access Denied",
          description: "Your wallet isn't an admin.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.ok) {
        setErrorDetails(JSON.stringify(data, null, 2));
        throw new Error("Failed to create season");
      }

      toast({
        title: "Success",
        description: "Season created successfully",
      });

      setNewSeasonOpen(false);
      setFormData({ name: "", emission_per_hour: "", burn_pct: "", start_at: "", end_at: "" });
      fetchSeasons();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create season",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSeason || !walletAddress) return;

    setRequesting(true);
    setErrorDetails(null);
    try {
      const data = await callEdge("admin-set-season", {
        method: "POST",
        json: {
          walletAddress,
          action: "update",
          id: editingSeason.id,
          name: formData.name,
          emission_per_hour: Number(formData.emission_per_hour),
          burn_pct: Number(formData.burn_pct),
          end_at: formData.end_at || undefined,
        },
      });

      if (data?.error === "not_admin") {
        toast({
          title: "Access Denied",
          description: "Your wallet isn't an admin.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.ok) {
        setErrorDetails(JSON.stringify(data, null, 2));
        throw new Error("Failed to update season");
      }

      toast({
        title: "Success",
        description: "Season updated successfully",
      });

      setEditSeasonOpen(false);
      setEditingSeason(null);
      setFormData({ name: "", emission_per_hour: "", burn_pct: "", start_at: "", end_at: "" });
      fetchSeasons();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update season",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleToggleActive = async (season: Season) => {
    if (!walletAddress) return;
    
    setRequesting(true);
    setErrorDetails(null);
    try {
      const data = await callEdge("admin-set-season", {
        method: "POST",
        json: {
          walletAddress,
          action: "toggleActive",
          id: season.id,
          active: !season.is_active,
        },
      });

      if (data?.error === "not_admin") {
        toast({
          title: "Access Denied",
          description: "Your wallet isn't an admin.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.ok) {
        setErrorDetails(JSON.stringify(data, null, 2));
        throw new Error("Failed to toggle season");
      }

      toast({
        title: "Success",
        description: `Season ${!season.is_active ? "activated" : "deactivated"}`,
      });

      fetchSeasons();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to toggle season",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  const openEditDialog = (season: Season) => {
    setEditingSeason(season);
    setFormData({
      name: season.name,
      emission_per_hour: season.emission_per_hour.toString(),
      burn_pct: season.burn_pct.toString(),
      start_at: season.start_at,
      end_at: season.end_at || "",
    });
    setEditSeasonOpen(true);
  };

  return (
    <AdminGate walletAddress={walletAddress}>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6 p-4 bg-warning/10 border border-warning rounded-lg">
          <p className="text-sm font-medium text-warning-foreground">⚠️ Admin only</p>
        </div>

        {errorDetails && (
          <Collapsible className="mb-6">
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <CollapsibleTrigger className="flex items-center gap-2 w-full">
                <ChevronDown className="h-4 w-4" />
                <span className="text-sm font-medium text-destructive-foreground">
                  Error Details (click to expand)
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <pre className="text-xs text-destructive-foreground bg-background/50 p-2 rounded overflow-auto">
                  {errorDetails}
                </pre>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Seasons Management</h1>
          <Dialog open={newSeasonOpen} onOpenChange={setNewSeasonOpen}>
            <DialogTrigger asChild>
              <Button disabled={requesting}>
                <Plus className="mr-2 h-4 w-4" />
                New Season
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Season</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="emission">Emission per Hour</Label>
                  <Input
                    id="emission"
                    type="number"
                    value={formData.emission_per_hour}
                    onChange={(e) => setFormData({ ...formData, emission_per_hour: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="burn">Burn % (0-1)</Label>
                  <Input
                    id="burn"
                    type="number"
                    step="0.01"
                    value={formData.burn_pct}
                    onChange={(e) => setFormData({ ...formData, burn_pct: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="start">Start At (optional)</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={requesting}>
                  {requesting ? "Creating..." : "Create Season"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Emission/hr</TableHead>
                <TableHead>Burn %</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : seasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No seasons found</TableCell>
                </TableRow>
              ) : (
                seasons.map((season) => (
                  <TableRow key={season.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {season.name}
                        {season.is_active && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{season.emission_per_hour}</TableCell>
                    <TableCell>{(season.burn_pct * 100).toFixed(0)}%</TableCell>
                    <TableCell>
                      <Switch
                        checked={season.is_active}
                        onCheckedChange={() => handleToggleActive(season)}
                        disabled={requesting}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(season)}
                        disabled={requesting}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={editSeasonOpen} onOpenChange={setEditSeasonOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Season</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-emission">Emission per Hour</Label>
                <Input
                  id="edit-emission"
                  type="number"
                  value={formData.emission_per_hour}
                  onChange={(e) => setFormData({ ...formData, emission_per_hour: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-burn">Burn % (0-1)</Label>
                <Input
                  id="edit-burn"
                  type="number"
                  step="0.01"
                  value={formData.burn_pct}
                  onChange={(e) => setFormData({ ...formData, burn_pct: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-end">End At (optional)</Label>
                <Input
                  id="edit-end"
                  type="datetime-local"
                  value={formData.end_at}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full" disabled={requesting}>
                {requesting ? "Updating..." : "Update Season"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="mt-6 text-xs text-muted-foreground">
          Wallet: <code className="bg-muted px-2 py-1 rounded">{walletAddress || "(not connected)"}</code>
        </div>
      </div>
    </AdminGate>
  );
};

export default Seasons;
