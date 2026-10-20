import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import { RoleRouteGuard } from "@/components/RoleRouteGuard";

const queryClient = new QueryClient();

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
          <Route
            path="/dashboard"
            element={<RoleRouteGuard role="dashboard">{null}</RoleRouteGuard>}
          />
          <Route
            path="/donor/dashboard"
            element={
              <RoleRouteGuard role="donor">
                <DonorDashboard />
              </RoleRouteGuard>
            }
          />
          <Route
            path="/donor/new-listing"
            element={
              <RoleRouteGuard role="donor">
                <NewListingPage />
              </RoleRouteGuard>
            }
          />
          <Route
            path="/donor/listings"
            element={
              <RoleRouteGuard role="donor">
                <MyListingsPage />
              </RoleRouteGuard>
            }
          />
          <Route
            path="/collector/dashboard"
            element={
              <RoleRouteGuard role="collector">
                <CollectorDashboard />
              </RoleRouteGuard>
            }
          />
          <Route
            path="/collector/map"
            element={
              <RoleRouteGuard role="collector">
                <CollectorMapPage />
              </RoleRouteGuard>
            }
          />
          <Route
            path="/volunteer/dashboard"
            element={
              <RoleRouteGuard role="volunteer">
                <VolunteerDashboard />
              </RoleRouteGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <RoleRouteGuard role="authenticated">
                <ProfilePage />
              </RoleRouteGuard>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <RoleRouteGuard role="admin">
                <AdminDashboard />
              </RoleRouteGuard>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;