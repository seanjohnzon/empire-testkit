import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Sword, Trophy, Users, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect } from "react";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { WalletDebugPanel } from "@/components/WalletDebugPanel";

const Landing = () => {
  const navigate = useNavigate();
  const { connected } = useWallet();
  const { profile, loading } = useWalletAuth();

  useEffect(() => {
    if (connected && profile && !loading) {
      if (!profile.initialized) {
        navigate("/init");
      } else {
        navigate("/packs");
      }
    }
  }, [connected, profile, loading, navigate]);

  const features = [
    {
      icon: Sword,
      title: "Build Your Army",
      description: "Collect powerful units from elite packs and create an unstoppable force",
    },
    {
      icon: Users,
      title: "Command Barracks",
      description: "Train and deploy your troops strategically across the battlefield",
    },
    {
      icon: Shield,
      title: "Upgrade Academy",
      description: "Enhance your military power and unlock advanced capabilities",
    },
    {
      icon: Trophy,
      title: "Compete & Conquer",
      description: "Climb the leaderboard and prove your tactical supremacy",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/10 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 mb-8 animate-pulse">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
            Build Your Empire
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Command elite forces, conquer territories, and dominate the battlefield in this tactical strategy experience
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground !rounded-lg !px-8 !py-6 !text-lg !font-semibold !transition-colors" />
          </div>
          {connected && loading && (
            <p className="text-muted-foreground mt-4">Initializing your command center...</p>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Master the Art of War
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-lg bg-background/50 border border-border hover:border-primary/50 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 mb-4 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Command?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of commanders and forge your path to victory
          </p>
          <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground !rounded-lg !px-8 !py-6 !text-lg !font-semibold !transition-colors" />
        </div>
      </div>

      <WalletDebugPanel />
    </div>
  );
};

export default Landing;
