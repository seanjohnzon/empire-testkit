import { ProtectedRoute } from "@/components/ProtectedRoute";
import { User } from "lucide-react";

const Profile = () => {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Profile management coming soon...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Profile;
