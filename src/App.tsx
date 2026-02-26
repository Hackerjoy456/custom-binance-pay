import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import SubscriptionGate from "@/components/SubscriptionGate";
import { useDevToolsProtection } from "@/hooks/useDevToolsProtection";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import Overview from "./pages/dashboard/Overview";
import Subscription from "./pages/dashboard/Subscription";
import ApiConfig from "./pages/dashboard/ApiConfig";
import ApiKeys from "./pages/dashboard/ApiKeys";
import Logs from "./pages/dashboard/Logs";
import IntegrationGuide from "./pages/dashboard/IntegrationGuide";
import AdminUsers from "./pages/admin/Users";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminSettings from "./pages/admin/Settings";
import AdminVerificationLogs from "./pages/admin/VerificationLogs";

const queryClient = new QueryClient();

const App = () => {
  useDevToolsProtection();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/pay/:merchantId" element={<Checkout />} />

              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<Overview />} />
                <Route path="subscription" element={<Subscription />} />
                <Route path="api-config" element={<SubscriptionGate><ApiConfig /></SubscriptionGate>} />
                <Route path="api-keys" element={<SubscriptionGate><ApiKeys /></SubscriptionGate>} />
                <Route path="logs" element={<Logs />} />
                <Route path="integration" element={<IntegrationGuide />} />
              </Route>

              <Route path="/admin" element={<ProtectedRoute adminOnly><DashboardLayout /></ProtectedRoute>}>
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="logs" element={<AdminVerificationLogs />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
