import { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { BottomNav } from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useauth";
import { logoutUser } from "@/services/authService";

interface DashboardLayoutProps {
  children: ReactNode;
  role?: string;
}

export function DashboardLayout({ children, role = "donor" }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        userName={user?.name || "User"}
        userRole={user?.role || role}
        onLogout={handleLogout}
      />
      <div className="flex flex-1">
        <DashboardSidebar role={user?.role || role} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <BottomNav role={user?.role || role} />
    </div>
  );
}