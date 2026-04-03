import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, UrgencyDot, CategoryBadge } from "@/components/FoodBadges";
import { MapPin, Clock, Package, Weight, Star, Search, LayoutGrid, Map } from "lucide-react";
import { getAllListings } from "@/services/foodService";
import { FoodListing } from "@/types";
import { toast } from "sonner";

const collectorStats = [
  { label: "Available Nearby", value: "6", icon: Package },
  { label: "Claimed Today", value: "2", icon: Search },
  { label: "Total Rescued", value: "820 kg", icon: Weight },
  { label: "Trust Score", value: "4.7 ★", icon: Star },
];

function CountdownTimer({ end }: { end: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(end).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m left`);
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [end]);
  return <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{remaining}</span>;
}

export default function CollectorDashboard() {
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [view, setView] = useState<"card" | "map">("card");
  const [filters, setFilters] = useState({ category: "all", distance: "5", urgency: "all" });

  useEffect(() => {
    getAllListings().then((data) => setListings(data.filter((l) => l.status === "active")));
  }, []);

  const handleClaim = (id: string) => {
    setListings((p) => p.map((l) => l.id === id ? { ...l, status: "claimed" as const } : l));
    toast.success("Food claimed! The donor will be notified.");
  };

  return (
    <DashboardLayout role="collector">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Available Food Nearby</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {collectorStats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filters.category} onValueChange={(v) => setFilters((p) => ({ ...p, category: v }))}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="cooked">Cooked</SelectItem>
              <SelectItem value="raw">Raw</SelectItem>
              <SelectItem value="packaged">Packaged</SelectItem>
              <SelectItem value="beverages">Beverages</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.distance} onValueChange={(v) => setFilters((p) => ({ ...p, distance: v }))}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Distance" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 km</SelectItem>
              <SelectItem value="3">3 km</SelectItem>
              <SelectItem value="5">5 km</SelectItem>
              <SelectItem value="10">10 km</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.urgency} onValueChange={(v) => setFilters((p) => ({ ...p, urgency: v }))}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Urgency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-1">
            <Button variant={view === "card" ? "default" : "outline"} size="icon" onClick={() => setView("card")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "map" ? "default" : "outline"} size="icon" onClick={() => setView("map")}>
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Listings */}
        {view === "card" ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l) => (
              <Card key={l.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="h-32 bg-muted flex items-center justify-center text-muted-foreground">
                    <Package className="h-8 w-8" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{l.foodType}</h3>
                        <p className="text-xs text-muted-foreground">{l.donorName}</p>
                      </div>
                      <UrgencyDot level={l.urgencyLevel} />
                    </div>
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={l.category} />
                      <span className="text-sm font-medium">{l.quantity} {l.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <CountdownTimer end={l.pickupWindowEnd} />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {(Math.random() * 5 + 0.5).toFixed(1)} km
                      </span>
                    </div>
                    <Button className="w-full" size="sm" onClick={() => handleClaim(l.id)}>
                      Claim Food
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="h-96 bg-muted flex items-center justify-center text-muted-foreground rounded-lg">
                <div className="text-center space-y-2">
                  <MapPin className="h-12 w-12 mx-auto text-primary/30" />
                  <p className="text-sm">Map view placeholder — Leaflet / Google Maps integration ready</p>
                  <p className="text-xs">Colored pins: 🟢 Fresh  🟠 Expiring &lt;1hr  🔴 Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
