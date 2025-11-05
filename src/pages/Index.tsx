import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/space");
    }
  }, [user, navigate]);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 mx-auto rounded-2xl gradient-warm flex items-center justify-center text-3xl shadow-soft">
              👋
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-3 text-gradient-warm">
            Spotmate
          </h1>
          <p className="text-lg text-muted-foreground">
            Real people, real moments • Private location
          </p>
        </div>

        {/* Email Entry + CTA */}
        <div className="max-w-md mx-auto mb-6">
          <div className="flex gap-2 mb-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 shadow-soft"
            />
            <Button
              onClick={handleGetStarted}
              className="h-12 px-8 gradient-warm shadow-soft hover:shadow-glow transition-all whitespace-nowrap"
            >
              Get Started
            </Button>
          </div>
          <div className="text-center">
            <Button
              onClick={handleGetStarted}
              variant="outline"
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Try Demo
            </Button>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-2xl mx-auto mt-20">
          <h2 className="text-2xl font-bold mb-10 text-center">How It Works</h2>
          <div className="space-y-8">
            <Step
              number="1"
              title="Step into a space."
              description="Grab coffee, hit the gym, or chill at the park — just open Spotmate when you're there."
            />
            <Step
              number="2"
              title="See who's around."
              description="Spot familiar faces or new people who share your interests and energy."
            />
            <Step
              number="3"
              title="Send a quick ping."
              description="No pressure, no long messages — just a friendly tap to say you're open to connect."
            />
            <Step
              number="4"
              title="Meet in person."
              description="Once matched, you both get a fun cue to find each other."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Spotmate • Real connections, real time</p>
        </div>
      </footer>
    </div>
  );
};

const Step = ({ number, title, description }: { number: string; title: string; description: string }) => {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-8 h-8 rounded-lg gradient-warm flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0 shadow-soft text-sm">
        {number}
      </div>
      <div>
        <h4 className="font-semibold mb-1 text-foreground">{title}</h4>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default Index;
