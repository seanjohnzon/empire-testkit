import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronUp } from "lucide-react";

const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_WALLET !== "false";

interface DebugLog {
  timestamp: string;
  stage: string;
  status: "success" | "error" | "info";
  message: string;
  data?: any;
}

export const WalletDebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [phantomDetected, setPhantomDetected] = useState<boolean>(false);
  const [network, setNetwork] = useState<string>("unknown");
  const [testWalletAddress, setTestWalletAddress] = useState<string>("");

  if (!DEBUG_ENABLED) return null;

  const addLog = (stage: string, status: DebugLog["status"], message: string, data?: any) => {
    setLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        stage,
        status,
        message,
        data,
      },
      ...prev.slice(0, 19), // Keep last 20 logs
    ]);
  };

  const testRawConnect = async () => {
    try {
      addLog("raw-connect", "info", "Attempting raw Phantom connect...");
      
      // Check if Phantom is installed
      const phantom = (window as any).solana;
      if (!phantom?.isPhantom) {
        setPhantomDetected(false);
        addLog("raw-connect", "error", "Phantom wallet not detected");
        return;
      }
      
      setPhantomDetected(true);
      addLog("raw-connect", "info", "Phantom detected");

      // Try to connect
      const resp = await phantom.connect({ onlyIfTrusted: false });
      const pubKey = resp.publicKey.toString();
      
      setTestWalletAddress(pubKey);
      setNetwork(phantom.network || "unknown");
      
      addLog("raw-connect", "success", "Connected successfully", {
        publicKey: pubKey,
        network: phantom.network,
      });
    } catch (err: any) {
      addLog("raw-connect", "error", err?.message || String(err), {
        code: err?.code,
        stack: err?.stack,
      });
    }
  };

  const testEnsureProfile = async () => {
    if (!testWalletAddress) {
      addLog("ensure-profile", "error", "No wallet address. Run 'Test Raw Connect' first.");
      return;
    }

    try {
      addLog("ensure-profile", "info", `Calling /functions/v1/ensure-profile with ${testWalletAddress}`);
      
      const response = await fetch(
        `https://miflbztkdctpibawermj.supabase.co/functions/v1/ensure-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ walletAddress: testWalletAddress }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        addLog("ensure-profile", "error", `HTTP ${response.status}`, data);
        return;
      }

      addLog("ensure-profile", "success", "Profile ensured", {
        status: response.status,
        response: data,
      });
    } catch (err: any) {
      addLog("ensure-profile", "error", err?.message || String(err), {
        stack: err?.stack,
      });
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="fixed bottom-4 right-4 w-[600px] z-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>🔧 Wallet Debug Panel</span>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2 space-y-2">
          <Alert>
            <AlertTitle>Status</AlertTitle>
            <AlertDescription className="space-y-1 text-sm">
              <div>Phantom detected: <strong>{phantomDetected ? "✅ Yes" : "❌ No"}</strong></div>
              <div>Network: <strong>{network}</strong></div>
              <div className="break-all">
                Test Address: <strong className="font-mono text-xs">{testWalletAddress || "none"}</strong>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={testRawConnect} size="sm" className="flex-1">
              Test Raw Connect
            </Button>
            <Button onClick={testEnsureProfile} size="sm" variant="secondary" className="flex-1">
              Call ensure-profile
            </Button>
          </div>

          <Button onClick={clearLogs} size="sm" variant="ghost" className="w-full">
            Clear Logs
          </Button>

          <div className="bg-background border rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
            <div className="text-sm font-semibold mb-3 text-foreground">Logs ({logs.length})</div>
            {logs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No logs yet</div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    log.status === "success"
                      ? "bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-100"
                      : log.status === "error"
                      ? "bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-100"
                      : "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-100"
                  }`}
                >
                  <div className="font-mono font-bold text-sm mb-2">
                    [{log.timestamp}] {log.stage}
                  </div>
                  <div className="mb-2 font-medium text-foreground">{log.message}</div>
                  {log.data && (
                    <pre className="mt-2 text-xs p-3 bg-muted rounded overflow-x-auto font-mono leading-relaxed text-foreground">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
