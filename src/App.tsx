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
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const queryClient = new QueryClient();

const AnalyticsTracker = () => {
  const location = useLocation();
  useEffect(() => { 
    try { initGA(); } catch(e) { console.error(e); }
  }, []);
  useEffect(() => { 
    try { trackPage(location.pathname); } catch(e) { console.error(e); }
  }, [location]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnalyticsTracker /> 
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/clients" element={<Clients />} />
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