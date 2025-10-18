import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Trophy, TrendingUp, User, Loader2, Search } from "lucide-react";
import { useSession } from "@/state/useSession";
import { callEdge } from "@/lib/edge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  username: string | null;
  mp: number;
}

const Leaderboard = () => {
  const { balances } = useSession();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await callEdge("leaderboard", { method: "GET" });
      if (data.ok) {
        setLeaders(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const shortenWallet = (wallet: string) => {
    if (!wallet || wallet.length < 16) return wallet;
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  // Client-side search
  const filteredLeaders = leaders.filter((entry) => {
    const search = searchQuery.toLowerCase();
    return (
      entry.wallet.toLowerCase().includes(search) ||
      (entry.username && entry.username.toLowerCase().includes(search)) ||
      entry.rank.toString().includes(search)
    );
  });

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-500";
    if (rank === 2) return "bg-gray-400";
    if (rank === 3) return "bg-orange-600";
    return "bg-muted";
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Leaderboard</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Your MP:</span>
            <span className="text-lg font-bold">{balances.mp.toLocaleString()}</span>
          </div>
        </div>

        {/* Leaderboard Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top 100 Commanders</CardTitle>
                <CardDescription>
                  Ranked by total Military Power (MP)
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by rank, wallet, or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeaders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? "No matching commanders found" : "No commanders on the leaderboard yet"}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                  <div className="col-span-2 text-center">Rank</div>
                  <div className="col-span-4">Wallet</div>
                  <div className="col-span-3">Username</div>
                  <div className="col-span-3 text-right">MP</div>
                </div>

                {/* Leaderboard Rows */}
                {filteredLeaders.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`grid grid-cols-12 gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                      entry.rank <= 3 ? 'bg-muted/30' : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className="col-span-2 flex items-center justify-center">
                      <Badge className={getRankBadgeColor(entry.rank)}>
                        #{entry.rank}
                      </Badge>
                    </div>

                    {/* Wallet */}
                    <div className="col-span-4 flex items-center">
                      <span className="font-mono text-sm">
                        {shortenWallet(entry.wallet)}
                      </span>
                    </div>

                    {/* Username */}
                    <div className="col-span-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {entry.username || "-"}
                      </span>
                    </div>

                    {/* MP */}
                    <div className="col-span-3 flex items-center justify-end">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold">
                          {entry.mp.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-6 text-sm text-muted-foreground text-center space-y-1">
          <p>• Military Power (MP) is earned by training units</p>
          <p>• Higher MP gives better rewards when claiming War Bonds</p>
          <p>• Leaderboard updates in real-time</p>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Leaderboard;
