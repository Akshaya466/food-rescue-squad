import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Phone, ChevronRight, Flame, Clock, Package, Truck, CheckCircle, Navigation, Award } from "lucide-react";
import { getActiveDeliveries, getDeliveryHistory, updateDeliveryStatus } from "@/services/deliveryService";
import { Delivery } from "@/types";
import { toast } from "sonner";
import { useEffect } from "react";

const statusPipeline: Delivery["status"][] = ["assigned", "en_route", "picked_up", "delivered"];
const statusLabels: Record<string, string> = {
  assigned: "Assigned", en_route: "En Route", picked_up: "Picked Up", delivered: "Delivered",
};
const statusIcons: Record<string, React.ElementType> = {
  assigned: Package, en_route: Truck, picked_up: CheckCircle, delivered: CheckCircle,
};

export default function VolunteerDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [active, setActive] = useState<Delivery[]>([]);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [zone, setZone] = useState("3");

  useEffect(() => {
    getActiveDeliveries("v1").then(setActive);
    getDeliveryHistory("v1").then(setHistory);
  }, []);

  const advanceStatus = async (delivery: Delivery) => {
    const idx = statusPipeline.indexOf(delivery.status);
    if (idx >= statusPipeline.length - 1) return;
    const next = statusPipeline[idx + 1];
    await updateDeliveryStatus(delivery.id, next);
    if (next === "delivered") {
      setActive((p) => p.filter((d) => d.id !== delivery.id));
      setHistory((p) => [{ ...delivery, status: next }, ...p]);
      toast.success("Delivery completed! 🎉");
    } else {
      setActive((p) => p.map((d) => d.id === delivery.id ? { ...d, status: next } : d));
      toast.success(`Status updated to ${statusLabels[next]}`);
    }
  };

  const todayStats = [
    { label: "Deliveries", value: "3", icon: Truck },
    { label: "kg Rescued", value: "28", icon: Package },
    { label: "Streak", value: "12 days", icon: Flame },
    { label: "Points", value: "450", icon: Award },
  ];

  return (
    <div className="min-h-screen bg-volunteer-bg text-volunteer-foreground">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-volunteer-card bg-volunteer-bg/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-volunteer-accent" />
            <span className="font-bold">FoodBridge Delivery</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-volunteer-accent animate-pulse" : "bg-muted-foreground"}`} />
              <span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
              <Switch checked={isOnline} onCheckedChange={setIsOnline} />
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4 pb-20 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {todayStats.map((s) => (
            <Card key={s.label} className="bg-volunteer-card border-volunteer-card">
              <CardContent className="p-3 text-center">
                <s.icon className="h-5 w-5 mx-auto text-volunteer-accent mb-1" />
                <p className="text-lg font-bold text-volunteer-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Zone selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zone radius:</span>
          {["1", "3", "5"].map((z) => (
            <Button
              key={z}
              size="sm"
              variant={zone === z ? "default" : "outline"}
              className={zone === z ? "bg-volunteer-accent text-volunteer-bg" : "border-volunteer-card text-volunteer-foreground"}
              onClick={() => setZone(z)}
            >
              {z} km
            </Button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-volunteer-card">
          <button
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "active" ? "border-volunteer-accent text-volunteer-accent" : "border-transparent text-muted-foreground"}`}
            onClick={() => setTab("active")}
          >
            Active ({active.length})
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "history" ? "border-volunteer-accent text-volunteer-accent" : "border-transparent text-muted-foreground"}`}
            onClick={() => setTab("history")}
          >
            History
          </button>
        </div>

        {tab === "active" ? (
          active.length === 0 ? (
            <Card className="bg-volunteer-card border-volunteer-card">
              <CardContent className="p-8 text-center">
                <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active deliveries. Stay online to receive assignments!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {active.map((d) => (
                <Card key={d.id} className="bg-volunteer-card border-volunteer-card overflow-hidden">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-volunteer-foreground">{d.foodDetails}</p>
                        <p className="text-xs text-muted-foreground mt-1">{d.estimatedTime} · {d.distanceKm} km</p>
                      </div>
                      <Badge className="bg-volunteer-accent/20 text-volunteer-accent border-0 capitalize">
                        {statusLabels[d.status]}
                      </Badge>
                    </div>

                    {/* Status pipeline */}
                    <div className="flex items-center gap-1">
                      {statusPipeline.map((s, i) => {
                        const Icon = statusIcons[s];
                        const isActive = statusPipeline.indexOf(d.status) >= i;
                        return (
                          <div key={s} className="flex items-center gap-1 flex-1">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs ${
                              isActive ? "bg-volunteer-accent text-volunteer-bg" : "bg-volunteer-card border border-muted-foreground text-muted-foreground"
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            {i < statusPipeline.length - 1 && (
                              <div className={`flex-1 h-0.5 ${isActive ? "bg-volunteer-accent" : "bg-muted-foreground/30"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-volunteer-accent mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Pickup</p>
                          <p className="text-volunteer-foreground">{d.pickupAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Navigation className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Drop-off</p>
                          <p className="text-volunteer-foreground">{d.dropAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-volunteer-accent text-volunteer-bg hover:bg-volunteer-accent/90"
                        onClick={() => advanceStatus(d)}
                      >
                        {d.status === "picked_up" ? "Mark Delivered" : d.status === "en_route" ? "Mark Picked Up" : "Start Route"}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button variant="outline" size="icon" className="border-volunteer-card text-volunteer-foreground">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card className="bg-volunteer-card border-volunteer-card">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-volunteer-card text-muted-foreground">
                    <th className="p-3 text-left font-medium">Food</th>
                    <th className="p-3 text-left font-medium">Distance</th>
                    <th className="p-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((d) => (
                    <tr key={d.id} className="border-b border-volunteer-card last:border-0">
                      <td className="p-3 text-volunteer-foreground">{d.foodDetails}</td>
                      <td className="p-3 text-muted-foreground">{d.distanceKm} km</td>
                      <td className="p-3"><Badge className="bg-volunteer-accent/20 text-volunteer-accent border-0">Delivered</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav role="volunteer" />
    </div>
  );
}
