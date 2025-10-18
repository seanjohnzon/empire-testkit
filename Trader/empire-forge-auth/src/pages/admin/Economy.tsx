import { useState, useEffect } from "react";
import { callEdge } from "@/lib/edge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import AdminGate from "@/components/AdminGate";

interface EconomyStats {
  season: {
    name: string;
  };
  totals: {
    claimed: number;
    spent: number;
    burned: number;
  };
  ledger: Array<{
    ts: string;
    wallet: string;
    kind: string;
    amount: number;
    reason: string;
  }>;
}

const Economy = () => {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;
  const [stats, setStats] = useState<EconomyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callEdge("economy-stats", { method: "GET" });
      
      if (data.ok) {
        setStats(data);
      } else {
        setError(data);
      }
    } catch (err: any) {
      setError(err);
      toast({
        title: "Error",
        description: err.message || "Failed to fetch economy stats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const shortenWallet = (wallet: string) => {
    if (wallet.length < 16) return wallet;
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (error) {
    return (
      <AdminGate walletAddress={walletAddress}>
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="mb-6 p-4 bg-warning/10 border border-warning rounded-lg">
            <p className="text-sm font-medium text-warning-foreground">⚠️ Admin only</p>
          </div>
          <h1 className="text-3xl font-bold mb-6">Economy Stats</h1>
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm font-medium text-destructive-foreground mb-2">Error:</p>
            <pre className="text-xs overflow-auto">{JSON.stringify(error, null, 2)}</pre>
          </div>
        </div>
      </AdminGate>
    );
  }

  return (
    <AdminGate walletAddress={walletAddress}>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6 p-4 bg-warning/10 border border-warning rounded-lg">
          <p className="text-sm font-medium text-warning-foreground">⚠️ Admin only</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Economy Stats</h1>
          <Button onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading && !stats ? (
          <div className="text-center py-12">Loading...</div>
        ) : stats ? (
          <>
            <div className="grid gap-6 mb-6">
              <div className="p-6 bg-card border rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Active Season: {stats.season.name}</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Claimed</p>
                    <p className="text-2xl font-bold">{stats.totals.claimed.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">{stats.totals.spent.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Burned</p>
                    <p className="text-2xl font-bold text-destructive">{stats.totals.burned.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Recent Transactions (Last 100)</h2>
              </div>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.ledger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No transactions found</TableCell>
                      </TableRow>
                    ) : (
                      stats.ledger.map((entry, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">
                            {new Date(entry.ts).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {shortenWallet(entry.wallet)}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              entry.kind === "claim" ? "bg-green-500/20 text-green-700 dark:text-green-300" :
                              entry.kind === "spend" ? "bg-blue-500/20 text-blue-700 dark:text-blue-300" :
                              entry.kind === "burn" ? "bg-red-500/20 text-red-700 dark:text-red-300" :
                              "bg-gray-500/20"
                            }`}>
                              {entry.kind}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono">{Number(entry.amount).toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{entry.reason || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        ) : null}
        
        <div className="mt-6 text-xs text-muted-foreground">
          Wallet: <code className="bg-muted px-2 py-1 rounded">{walletAddress || "(not connected)"}</code>
        </div>
      </div>
    </AdminGate>
  );
};

export default Economy;
