import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { EnvCheck } from "@/components/EnvCheck";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WalletContextProvider } from "@/contexts/WalletContext";
import Landing from "./pages/Landing";
import Init from "./pages/Init";
import Packs from "./pages/Packs";
import Barracks from "./pages/Barracks";
import Academy from "./pages/Academy";
import Claim from "./pages/Claim";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Seasons from "./pages/admin/Seasons";
import Economy from "./pages/admin/Economy";
import EdgeDiagnostics from "./pages/admin/EdgeDiagnostics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <>
      <EnvCheck />
      <Navigation />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/init" element={<Init />} />
        <Route path="/packs" element={<ProtectedRoute><Packs /></ProtectedRoute>} />
        <Route path="/barracks" element={<ProtectedRoute><Barracks /></ProtectedRoute>} />
        <Route path="/academy" element={<ProtectedRoute><Academy /></ProtectedRoute>} />
        <Route path="/claim" element={<ProtectedRoute><Claim /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin/seasons" element={<Seasons />} />
        <Route path="/admin/economy" element={<Economy />} />
        <Route path="/admin/edge-diagnostics" element={<EdgeDiagnostics />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletContextProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </WalletContextProvider>
  </QueryClientProvider>
);

export default App;
