import { Link, useLocation } from "react-router-dom";
import { Shield, Coins, TrendingUp, Settings, Globe } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useSession } from "@/state/useSession";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { callEdge } from "@/lib/edge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navigation = () => {
  const location = useLocation();
  const { connected } = useWallet();
  const { profile, loading } = useWalletAuth();
  const { balances, isAdmin } = useSession();
  const [globalMp, setGlobalMp] = useState<number>(0);

  const navItems = [
    { label: "Packs", path: "/packs" },
    { label: "Barracks", path: "/barracks" },
    { label: "Academy", path: "/academy" },
    { label: "Claim", path: "/claim" },
    { label: "Leaderboard", path: "/leaderboard" },
    { label: "Profile", path: "/profile" },
  ];

  const showFullNav = connected && profile?.initialized;
  const showInitOnly = connected && !profile?.initialized && !loading;

  // Poll global MP every 30 seconds
  useEffect(() => {
    const fetchGlobalMp = async () => {
      try {
        const data = await callEdge("get-total-mp", { method: "GET" });
        if (data.ok) {
          setGlobalMp(data.totalMp);
        }
      } catch (err) {
        console.error("Failed to fetch global MP:", err);
      }
    };

    fetchGlobalMp();
    const interval = setInterval(fetchGlobalMp, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Shield className="h-6 w-6 text-primary group-hover:text-primary-glow transition-colors" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Empire
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {showFullNav && (
            <div className="flex items-center gap-6 mr-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Global MP:</span>
                <span className="font-bold">{globalMp.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">War Bonds:</span>
                <span className="font-bold">{balances.war_bonds.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">MP:</span>
                <span className="font-bold">{balances.mp.toLocaleString()}</span>
              </div>
            </div>
          )}

          {showInitOnly && (
            <Link to="/init">
              <Button variant="default" size="sm">
                Initialize
              </Button>
            </Link>
          )}

          {showFullNav && (
            <>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Admin
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Admin Panel</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/seasons" className="cursor-pointer">
                        Seasons
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/economy" className="cursor-pointer">
                        Economy
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/edge-diagnostics" className="cursor-pointer">
                        Edge Diagnostics
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}

          <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground" />
        </div>
      </div>
    </nav>
  );
};
