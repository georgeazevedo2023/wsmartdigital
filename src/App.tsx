import { Suspense, lazy } from "react";
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

// Lazy load dashboard pages for better initial load performance
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const Instances = lazy(() => import("./pages/dashboard/Instances"));
const InstanceDetails = lazy(() => import("./pages/dashboard/InstanceDetails"));
const GroupDetails = lazy(() => import("./pages/dashboard/GroupDetails"));
const SendToGroup = lazy(() => import("./pages/dashboard/SendToGroup"));
const UsersManagement = lazy(() => import("./pages/dashboard/UsersManagement"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const ScheduledMessages = lazy(() => import("./pages/dashboard/ScheduledMessages"));
const Broadcaster = lazy(() => import("./pages/dashboard/Broadcaster"));
const BroadcastHistoryPage = lazy(() => import("./pages/dashboard/BroadcastHistoryPage"));
const LeadsBroadcaster = lazy(() => import("./pages/dashboard/LeadsBroadcaster"));
const HelpDesk = lazy(() => import("./pages/dashboard/HelpDesk"));
const InboxManagement = lazy(() => import("./pages/dashboard/InboxManagement"));

const queryClient = new QueryClient();

// Page loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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
        <Route index element={<Suspense fallback={<PageLoader />}><DashboardHome /></Suspense>} />
        <Route path="broadcast" element={<Suspense fallback={<PageLoader />}><Broadcaster /></Suspense>} />
        <Route path="broadcast/history" element={<Suspense fallback={<PageLoader />}><BroadcastHistoryPage /></Suspense>} />
        <Route path="broadcast/leads" element={<Suspense fallback={<PageLoader />}><LeadsBroadcaster /></Suspense>} />
        <Route path="instances" element={<Suspense fallback={<PageLoader />}><Instances /></Suspense>} />
        <Route path="instances/:id" element={<Suspense fallback={<PageLoader />}><InstanceDetails /></Suspense>} />
        <Route path="instances/:instanceId/groups/:groupId" element={<Suspense fallback={<PageLoader />}><GroupDetails /></Suspense>} />
        <Route path="instances/:instanceId/groups/:groupId/send" element={<Suspense fallback={<PageLoader />}><SendToGroup /></Suspense>} />
        <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersManagement /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
        <Route path="scheduled" element={<Suspense fallback={<PageLoader />}><ScheduledMessages /></Suspense>} />
        <Route path="helpdesk" element={<Suspense fallback={<PageLoader />}><HelpDesk /></Suspense>} />
        <Route path="inboxes" element={<Suspense fallback={<PageLoader />}><InboxManagement /></Suspense>} />
        {/* Redirect alias for legacy/bookmarked URLs */}
        <Route path="leads-broadcast" element={<Navigate to="/dashboard/broadcast/leads" replace />} />
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
