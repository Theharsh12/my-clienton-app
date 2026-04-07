import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useEffect } from "react";
import { initGA, trackPage } from "./lib/analytics";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Clients from "./pages/Clients";
import Onboard from "./pages/Onboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// ✅ Analytics logic ko alag component mein rakha hai
const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    trackPage(location.pathname);
  }, [location]);

  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          {/* ✅ BrowserRouter ke andar hone se useLocation() crash nahi karega */}
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
};

export default App;