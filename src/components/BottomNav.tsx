import { Link, useLocation } from "react-router-dom";
import { Home, MapPin, History, User, Package, PlusCircle, List, LayoutDashboard, BarChart3, Truck } from "lucide-react";

const roleNavItems: Record<string, { label: string; to: string; icon: React.ElementType }[]> = {
  donor: [
    { label: "Dashboard", to: "/donor/dashboard", icon: LayoutDashboard },
    { label: "New Listing", to: "/donor/new-listing", icon: PlusCircle },
    { label: "My Listings", to: "/donor/listings", icon: List },
    { label: "Profile", to: "/profile", icon: User },
  ],
  collector: [
    { label: "Dashboard", to: "/collector/dashboard", icon: LayoutDashboard },
    { label: "Map", to: "/collector/map", icon: MapPin },
    { label: "Profile", to: "/profile", icon: User },
  ],
  volunteer: [
    { label: "Home", to: "/volunteer/dashboard", icon: Home },
    { label: "Map", to: "/collector/map", icon: MapPin },
    { label: "History", to: "/volunteer/dashboard", icon: History },
    { label: "Profile", to: "/profile", icon: User },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard", icon: BarChart3 },
    { label: "Profile", to: "/profile", icon: User },
  ],
};

export function BottomNav({ role = "donor" }: { role?: string }) {
  const location = useLocation();
  const items = roleNavItems[role] || roleNavItems.donor;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
