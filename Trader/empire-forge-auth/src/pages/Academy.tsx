import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GraduationCap } from "lucide-react";

const Academy = () => {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <GraduationCap className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Academy</h1>
        </div>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Upgrade system coming soon...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Academy;
