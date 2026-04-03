import { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { BottomNav } from "@/components/BottomNav";

interface DashboardLayoutProps {
  children: ReactNode;
  role?: string;
}

export function DashboardLayout({ children, role = "donor" }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <DashboardSidebar role={role} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <BottomNav role={role} />
    </div>
  );
}
