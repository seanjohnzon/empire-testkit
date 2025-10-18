import { useState } from "react";
import { callEdge, edgeEnvOk } from "@/lib/edge";
import { Button } from "@/components/ui/button";

export default function EdgeDiagnostics() {
  const [out, setOut] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const env = edgeEnvOk();

  async function run() {
    setRunning(true);
    const results: any = { env };
    
    try {
      results.admin_check = await callEdge("admin-check", {
        method: "POST",
        json: { walletAddress: "test" }
      });
    } catch (e: any) {
      results.admin_check = { error: e.message };
    }
    
    try {
      results.list_seasons = await callEdge("list-seasons", { method: "GET" });
    } catch (e: any) {
      results.list_seasons = { error: e.message };
    }

    try {
      results.economy_stats = await callEdge("economy-stats", { method: "GET" });
    } catch (e: any) {
      results.economy_stats = { error: e.message };
    }
    
    setOut(results);
    setRunning(false);
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-4">
      <h1 className="text-3xl font-bold">Edge Function Diagnostics</h1>
      
      <div className="p-4 bg-muted rounded-lg space-y-2">
        <div className="text-sm">
          <span className="font-medium">BASE URL:</span>{" "}
          <code className="bg-background px-2 py-1 rounded">
            {String(env.base || "(missing)")}
          </code>
        </div>
        <div className="text-sm">
          <span className="font-medium">Has Anon Key:</span>{" "}
          <code className="bg-background px-2 py-1 rounded">
            {String(env.hasAnon)}
          </code>
        </div>
      </div>

      <Button onClick={run} disabled={running}>
        {running ? "Running Tests..." : "Run Tests"}
      </Button>

      {out && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Results:</h2>
          <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[600px]">
            {JSON.stringify(out, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
