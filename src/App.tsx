import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Instances from "./pages/dashboard/Instances";
import InstanceDetails from "./pages/dashboard/InstanceDetails";
import GroupDetails from "./pages/dashboard/GroupDetails";
import SendToGroup from "./pages/dashboard/SendToGroup";
import UsersManagement from "./pages/dashboard/UsersManagement";
import Settings from "./pages/dashboard/Settings";
import ScheduledMessages from "./pages/dashboard/ScheduledMessages";
import Broadcaster from "./pages/dashboard/Broadcaster";
import BroadcastHistoryPage from "./pages/dashboard/BroadcastHistoryPage";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Auth route wrapper (redirect to dashboard if already logged in)
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="broadcast" element={<Broadcaster />} />
        <Route path="broadcast/history" element={<BroadcastHistoryPage />} />
        <Route path="instances" element={<Instances />} />
        <Route path="instances/:id" element={<InstanceDetails />} />
        <Route path="instances/:instanceId/groups/:groupId" element={<GroupDetails />} />
        <Route path="instances/:instanceId/groups/:groupId/send" element={<SendToGroup />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="settings" element={<Settings />} />
        <Route path="scheduled" element={<ScheduledMessages />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
