import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/state/useSession";
import { useWallet } from "@solana/wallet-adapter-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { connected } = useWallet();
  const { walletAddress, initialized } = useSession();
  const location = useLocation();

  // ✅ Allow admin routes to pass through without any auth/init redirects
  if (location.pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  // Not connected - redirect to landing
  if (!connected || !walletAddress) {
    return <Navigate to="/" replace />;
  }

  // Connected but not initialized - only allow /init
  if (!initialized && location.pathname !== '/init') {
    return <Navigate to="/init" replace />;
  }

  // Initialized but on /init - redirect to packs
  if (initialized && location.pathname === '/init') {
    return <Navigate to="/packs" replace />;
  }

  return <>{children}</>;
};
