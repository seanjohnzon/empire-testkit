import { useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, ShieldAlert, Loader2 } from "lucide-react";
import { callEdge } from "@/lib/edge";

interface AdminGateProps {
  walletAddress?: string | null;
  children: ReactNode;
}

interface AdminState {
  loading: boolean;
  isAdmin: boolean;
  reason?: string;
  error?: string;
}

export default function AdminGate({ walletAddress, children }: AdminGateProps) {
  const location = useLocation();
  const [state, setState] = useState<AdminState>({
    loading: true,
    isAdmin: false,
  });

  // Debug logging on mount
  useEffect(() => {
    console.log("Admin route mount", { 
      pathname: location.pathname, 
      walletAddress 
    });
  }, [location.pathname, walletAddress]);

  useEffect(() => {
    let cancelled = false;

    console.log("AdminGate: Starting admin check for wallet:", walletAddress);

    (async () => {
      try {
        if (!walletAddress) {
          console.log("AdminGate: No wallet connected");
          setState({
            loading: false,
            isAdmin: false,
            reason: "no_wallet",
            error: undefined,
          });
          return;
        }

        const j = await callEdge("admin-check", {
          method: "POST",
          json: { walletAddress },
        });

        if (cancelled) return;

        console.log("AdminGate: admin check complete", {
          isAdmin: !!j.isAdmin,
          reason: j.reason
        });
        
        setState({
          loading: false,
          isAdmin: !!j.isAdmin,
          reason: j.reason,
        });
      } catch (e: any) {
        console.error("AdminGate: admin-check exception", e);
        if (!cancelled)
          setState({
            loading: false,
            isAdmin: false,
            error: e?.message || "unknown error",
          });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  if (state.loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking admin rights…</p>
        </div>
      </div>
    );
  }

  if (!state.isAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <h1 className="text-3xl font-bold text-destructive">403 Forbidden</h1>
          <p className="text-muted-foreground">Your wallet is not an admin.</p>
          
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2 max-w-lg">
            <div className="text-sm">
              <span className="font-medium">Wallet:</span>{" "}
              <code className="bg-background px-2 py-1 rounded text-xs">
                {walletAddress || "(not connected)"}
              </code>
            </div>
            <div className="text-sm">
              <span className="font-medium">Reason:</span>{" "}
              <code className="bg-background px-2 py-1 rounded text-xs">
                {state.reason || "n/a"}
              </code>
              {state.error && (
                <>
                  {" · "}
                  <span className="font-medium">Error:</span>{" "}
                  <code className="bg-destructive/10 px-2 py-1 rounded text-xs text-destructive">
                    {state.error}
                  </code>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              Tip: Admins must be listed in the{" "}
              <code className="bg-background px-1 rounded">admin_wallets</code> table.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
