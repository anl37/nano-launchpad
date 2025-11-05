import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import InterestsSetup from "./pages/InterestsSetup";
import LocationSetup from "./pages/LocationSetup";
import Space from "./pages/Space";
import Spaces from "./pages/Spaces";
import NextUp from "./pages/NextUp";
import Plans from "./pages/Plans";
import Profile from "./pages/Profile";
import DevDebug from "./pages/DevDebug";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OnboardingCheck } from "./components/OnboardingCheck";
import { IncomingConnectionRequestDialog } from "./components/IncomingConnectionRequestDialog";
import { MatchNotificationDialog } from "./components/MatchNotificationDialog";
import { useConnectionRequestStatus } from "./hooks/useConnectionRequestStatus";

const queryClient = new QueryClient();

const App = () => {
  // Initialize connection request status listener
  useConnectionRequestStatus();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <IncomingConnectionRequestDialog />
          <MatchNotificationDialog />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Onboarding flow (protected but no onboarding check) */}
          <Route path="/interests-setup" element={<ProtectedRoute><InterestsSetup /></ProtectedRoute>} />
          <Route path="/location-setup" element={<ProtectedRoute><LocationSetup /></ProtectedRoute>} />
          
          {/* Main app (protected + onboarding check) */}
          <Route path="/space" element={<ProtectedRoute><OnboardingCheck><Space /></OnboardingCheck></ProtectedRoute>} />
          <Route path="/spaces" element={<ProtectedRoute><OnboardingCheck><Spaces /></OnboardingCheck></ProtectedRoute>} />
          <Route path="/next-up" element={<ProtectedRoute><OnboardingCheck><NextUp /></OnboardingCheck></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><OnboardingCheck><Plans /></OnboardingCheck></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><OnboardingCheck><Profile /></OnboardingCheck></ProtectedRoute>} />
          
          {/* Developer Tools */}
          <Route path="/dev" element={<ProtectedRoute><DevDebug /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
