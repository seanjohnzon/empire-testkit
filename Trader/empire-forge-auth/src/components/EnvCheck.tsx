import { AlertCircle } from "lucide-react";
import { edgeEnvOk } from "@/lib/edge";

export const EnvCheck = () => {
  const env = edgeEnvOk();

  if (env.hasBase && env.hasAnon) {
    return null; // Everything is configured correctly
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-warning/10 border-b border-warning">
      <div className="container mx-auto px-4 py-2 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-warning-foreground" />
        <div className="text-sm text-warning-foreground">
          {!env.hasBase && (
            <span>
              Missing NEXT_PUBLIC_SUPABASE_URL - Set it in Lovable App Secrets
            </span>
          )}
          {env.hasBase && !env.hasAnon && (
            <span>
              Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (optional but recommended)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
