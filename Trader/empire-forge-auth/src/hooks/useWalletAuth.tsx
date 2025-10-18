import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/state/useSession";
import { callEdge } from "@/lib/edge";

interface Profile {
  user_id: string;
  wallet_address: string;
  initialized: boolean;
}

export const useWalletAuth = () => {
  const { publicKey, connected, disconnect: walletDisconnect } = useWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { setWallet, refreshAll, setIsAdmin } = useSession();

  // Handle wallet connection
  const handleConnect = async () => {
    if (!publicKey) {
      toast({
        title: "No wallet selected",
        description: "Please select a wallet first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const walletAddress = publicKey.toBase58();
      console.log("Wallet connected:", walletAddress);

      // Call ensure-profile function
      const data = await callEdge("ensure-profile", {
        method: "POST",
        json: { walletAddress },
      });

      console.log("ensure-profile response:", { data });

      if (!data.ok) {
        toast({
          title: "Profile setup failed",
          description: JSON.stringify(data, null, 2),
          variant: "destructive",
        });
        throw new Error(JSON.stringify(data));
      }

      // Update session store
      setWallet(walletAddress, data.profile.initialized);
      
      // Store profile in state
      setProfile({
        user_id: data.profile.user_id,
        wallet_address: walletAddress,
        initialized: data.profile.initialized,
      });

      // Refresh balances
      await refreshAll();

      // Check admin status
      try {
        const adminData = await callEdge("admin-check", {
          method: "POST",
          json: { walletAddress },
        });
        
        if (adminData.ok) {
          setIsAdmin(adminData.isAdmin);
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        setIsAdmin(false);
      }

      console.log("Profile loaded:", data.profile);

      // Route based on initialized flag (skip for admin routes)
      const isAdminRoute = location.pathname.startsWith('/admin');
      if (!isAdminRoute) {
        if (data.profile.initialized) {
          console.log("Routing to /packs");
          navigate('/packs');
        } else {
          console.log("Routing to /init");
          navigate('/init');
        }
      } else {
        console.log("Admin route detected, skipping auto-navigation");
      }
    } catch (error: any) {
      const detailedError = {
        stage: "wallet-connect",
        message: error?.message || String(error),
        stack: error?.stack,
        timestamp: new Date().toISOString(),
      };
      console.error("Wallet connect error:", detailedError);
      
      toast({
        title: "Wallet connect error",
        description: typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error),
        variant: "destructive",
      });
      await walletDisconnect();
    } finally {
      setLoading(false);
    }
  };

  // Auto-connect when wallet connects
  useEffect(() => {
    if (connected && publicKey && !profile) {
      handleConnect();
    }
  }, [connected, publicKey]);

  // Handle disconnect
  const handleDisconnect = async () => {
    setProfile(null);
    setWallet(null);
    setIsAdmin(false);
    await walletDisconnect();
    navigate('/');
  };

  return { 
    profile, 
    loading, 
    walletAddress: publicKey?.toBase58() || null,
    connected,
    disconnect: handleDisconnect,
    connect: handleConnect,
  };
};
