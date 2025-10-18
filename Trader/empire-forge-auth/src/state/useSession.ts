import { create } from "zustand";
import { callEdge } from "@/lib/edge";

type Bal = { war_bonds: number; mp: number; user_id?: string };
type S = {
  walletAddress: string | null;
  initialized: boolean;
  balances: Bal;
  isAdmin: boolean;
  setWallet: (addr: string | null, initialized?: boolean) => void;
  setBalances: (b: Partial<Bal>) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  refreshAll: () => Promise<void>;
};

export const useSession = create<S>((set, get) => ({
  walletAddress: null,
  initialized: false,
  balances: { war_bonds: 0, mp: 0 },
  isAdmin: false,

  setWallet(addr, initialized = false) { 
    set({ walletAddress: addr, initialized }); 
  },

  setBalances(b) {
    set({ balances: { ...get().balances, ...b } });
  },

  setIsAdmin(isAdmin) {
    set({ isAdmin });
  },

  async refreshAll() {
    const walletAddress = get().walletAddress;
    if (!walletAddress) return;
    
    try {
      const j = await callEdge("get-balances", {
        method: "POST",
        json: { walletAddress },
      });
      
      if (j.ok) {
        set({ 
          balances: { 
            war_bonds: j.war_bonds, 
            mp: j.mp, 
            user_id: j.user_id 
          } 
        });
      }
    } catch (err) {
      console.error("Failed to refresh balances:", err);
    }
  },
}));
