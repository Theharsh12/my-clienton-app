import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Clients from "./pages/Clients";
import Onboard from "./pages/Onboard";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { initGA, trackPage } from "./lib/analytics";

const queryClient = new QueryClient();

// ✅ Analytics Tracker (Safe Version)
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Check if ID exists before initializing to prevent crash
    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (gaId) {
      try {
        initGA();
      } catch (e) {
        console.error("GA Init Error:", e);
      }
    }
  }, []);

  useEffect(() => {
    const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (gaId) {
      trackPage(location.pathname);
    }
  }, [location]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* 🔥 FIX: AnalyticsTracker ab BrowserRouter ke ANDAR hai */}
        <AnalyticsTracker /> 
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/clients" element={<Clients />} />
            
            {/* Dono paths support karein taaki link mismatch na ho */}
            <Route path="/onboard/:token" element={<Onboard />} />
            <Route path="/onboarding/:token" element={<Onboard />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;