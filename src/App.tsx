import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DonorDashboard from "./pages/DonorDashboard";
import NewListingPage from "./pages/NewListingPage";
import MyListingsPage from "./pages/MyListingsPage";
import CollectorDashboard from "./pages/CollectorDashboard";
import CollectorMapPage from "./pages/CollectorMapPage";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Redirects to correct dashboard based on role
function RoleRedirect() {
  const stored = localStorage.getItem("Annora_user");
  const user = stored ? JSON.parse(stored) : null;
  if (!user) return <Navigate to="/login" replace />;
  const routes: Record<string, string> = {
    donor: "/donor/dashboard",
    collector: "/collector/dashboard",
    volunteer: "/volunteer/dashboard",
    admin: "/admin/dashboard",
  };
  return <Navigate to={routes[user.role] || "/login"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<RoleRedirect />} />
          <Route path="/donor/dashboard" element={<DonorDashboard />} />
          <Route path="/donor/new-listing" element={<NewListingPage />} />
          <Route path="/donor/listings" element={<MyListingsPage />} />
          <Route path="/collector/dashboard" element={<CollectorDashboard />} />
          <Route path="/collector/map" element={<CollectorMapPage />} />
          <Route path="/volunteer/dashboard" element={<VolunteerDashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;