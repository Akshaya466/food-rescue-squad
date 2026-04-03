import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PlusCircle, List, User, MapPin, BarChart3, Truck, Leaf } from "lucide-react";

const roleMenus: Record<string, { label: string; to: string; icon: React.ElementType }[]> = {
  donor: [
    { label: "Dashboard", to: "/donor/dashboard", icon: LayoutDashboard },
    { label: "New Listing", to: "/donor/new-listing", icon: PlusCircle },
    { label: "My Listings", to: "/donor/listings", icon: List },
    { label: "Profile", to: "/profile", icon: User },
  ],
  collector: [
    { label: "Dashboard", to: "/collector/dashboard", icon: LayoutDashboard },
    { label: "Live Map", to: "/collector/map", icon: MapPin },
    { label: "Profile", to: "/profile", icon: User },
  ],
  volunteer: [
    { label: "Deliveries", to: "/volunteer/dashboard", icon: Truck },
    { label: "Map", to: "/collector/map", icon: MapPin },
    { label: "Profile", to: "/profile", icon: User },
  ],
  admin: [
    { label: "Analytics", to: "/admin/dashboard", icon: BarChart3 },
    { label: "Profile", to: "/profile", icon: User },
  ],
};

export function DashboardSidebar({ role = "donor" }: { role?: string }) {
  const location = useLocation();
  const items = roleMenus[role] || roleMenus.donor;

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card min-h-[calc(100vh-4rem)]">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold capitalize">{role} Panel</p>
            <p className="text-xs text-muted-foreground">FoodBridge</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
