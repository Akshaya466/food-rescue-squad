import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Phone, ChevronRight, Flame, Package, Truck, CheckCircle, Navigation, Award } from "lucide-react";
import { subscribeToUnassignedDeliveries, subscribeToDeliveryHistory, updateDeliveryStatus } from "@/services/deliveryService";
import { Delivery, User } from "@/types";
import { toast } from "sonner";
import { auth } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/services/userService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const volunteerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const statusPipeline: Delivery["status"][] = ["assigned", "en_route", "picked_up", "delivered"];
const statusLabels: Record<string, string> = {
  assigned: "Assigned",
  en_route: "En Route",
  picked_up: "Picked Up",
  delivered: "Delivered",
};
const statusIcons: Record<string, React.ElementType> = {
  assigned: Package,
  en_route: Truck,
  picked_up: CheckCircle,
  delivered: CheckCircle,
};

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 14); }, [center, map]);
  return null;
}

export default function VolunteerDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [active, setActive] = useState<Delivery[]>([]);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [tab, setTab] = useState<"active" | "history" | "map">("active");
  const [zone, setZone] = useState("3");
  const [user, setUser] = useState<User | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([13.0827, 80.2707]);

  useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      setUser(profile);
      const unsubscribeActive = subscribeToUnassignedDeliveries(setActive);
      const unsubscribeHistory = subscribeToDeliveryHistory(firebaseUser.uid, setHistory);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setCurrentLocation([pos.coords.latitude, pos.coords.longitude]),
          () => setCurrentLocation([13.0827, 80.2707])
        );
      }
      return () => {
        unsubscribeActive();
        unsubscribeHistory();
      };
    }
  });
  return () => unsubscribeAuth();
}, []);
  const advanceStatus = async (delivery: Delivery) => {
    const idx = statusPipeline.indexOf(delivery.status);
    if (idx >= statusPipeline.length - 1) return;
    const next = statusPipeline[idx + 1];

    await updateDeliveryStatus(delivery.id, next);

    // Assign volunteer when they start
    if (delivery.volunteerId === "unassigned" && user) {
      await updateDoc(doc(db, "deliveries", delivery.id), { volunteerId: user.id });
    }

    if (next === "delivered") {
      setActive((p) => p.filter((d) => d.id !== delivery.id));
      setHistory((p) => [{ ...delivery, status: next }, ...p]);
      toast.success("Delivery completed! 🎉");
    } else {
      setActive((p) => p.map((d) => d.id === delivery.id ? { ...d, status: next } : d));
      toast.success(`Status updated to ${statusLabels[next]}`);
    }
  };

  const totalKgRescued = history.reduce((sum, d) => sum + (d.distanceKm || 0), 0).toFixed(1);

const todayStats = [
  { label: "Total Delivered", value: history.length.toString(), icon: Truck },
  { label: "Active Now", value: active.length.toString(), icon: Package },
  { label: "kg Rescued", value: totalKgRescued, icon: Flame },
  { label: "Points", value: (history.length * 50).toString(), icon: Award },
];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-400" />
            <span className="font-bold">Annora Delivery</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user?.name || "Volunteer"}</span>
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
              <span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
              <Switch checked={isOnline} onCheckedChange={setIsOnline} />
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4 pb-24 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {todayStats.map((s) => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
              <s.icon className="h-5 w-5 mx-auto text-green-400 mb-1" />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Zone selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Zone radius:</span>
          {["1", "3", "5"].map((z) => (
            <Button
              key={z}
              size="sm"
              variant={zone === z ? "default" : "outline"}
              className={zone === z ? "bg-green-500 text-black" : "border-slate-700 text-white"}
              onClick={() => setZone(z)}
            >
              {z} km
            </Button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700">
          {(["active", "map", "history"] as const).map((t) => (
            <button
              key={t}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? "border-green-400 text-green-400" : "border-transparent text-slate-400"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "active" ? `Active (${active.length})` : t === "map" ? "Live Map" : "History"}
            </button>
          ))}
        </div>

        {/* Active Deliveries */}
        {tab === "active" && (
          active.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
              <Truck className="h-10 w-10 mx-auto text-slate-500 mb-2" />
              <p className="text-slate-400">No active deliveries.</p>
              <p className="text-slate-500 text-sm mt-1">Stay online — deliveries appear here when collectors claim food.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((d) => (
                <div key={d.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{d.foodDetails}</p>
                        <p className="text-xs text-slate-400 mt-1">{d.estimatedTime} · {d.distanceKm} km away</p>
                      </div>
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full capitalize">
                        {statusLabels[d.status]}
                      </span>
                    </div>

                    {/* Status pipeline */}
                    <div className="flex items-center gap-1">
                      {statusPipeline.map((s, i) => {
                        const Icon = statusIcons[s];
                        const isActive = statusPipeline.indexOf(d.status) >= i;
                        return (
                          <div key={s} className="flex items-center gap-1 flex-1">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              isActive ? "bg-green-500 text-black" : "bg-slate-700 text-slate-400"
                            }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            {i < statusPipeline.length - 1 && (
                              <div className={`flex-1 h-0.5 ${isActive ? "bg-green-500" : "bg-slate-700"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Addresses */}
                    <div className="space-y-2 text-sm bg-slate-900 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400">Pickup from</p>
                          <p>{d.pickupAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Navigation className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-400">Drop at</p>
                          <p>{d.dropAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-500 text-black hover:bg-green-400 font-semibold"
                        onClick={() => advanceStatus(d)}
                      >
                        {d.status === "picked_up" ? "Mark Delivered ✓" :
                         d.status === "en_route" ? "Mark Picked Up" : "Start Route"}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-700 text-white"
                        onClick={() => setTab("map")}
                      >
                        <Navigation className="h-4 w-4 mr-1" /> Map
                      </Button>
                      <Button variant="outline" size="icon" className="border-slate-700 text-white">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Live Map */}
        {tab === "map" && (
          <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: "500px" }}>
            <MapContainer center={currentLocation} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap center={currentLocation} />
              <Marker position={currentLocation} icon={volunteerIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">📍 You are here</p>
                    <p className="text-xs text-gray-500">{user?.name || "Volunteer"}</p>
                  </div>
                </Popup>
              </Marker>
              {active.map((d, i) => (
                <Marker
                  key={d.id}
                  position={[
                    currentLocation[0] + (Math.random() - 0.5) * 0.02,
                    currentLocation[1] + (Math.random() - 0.5) * 0.02,
                  ]}
                  icon={pickupIcon}
                >
                  <Popup>
                    <div>
                      <p className="font-semibold">📦 {d.foodDetails}</p>
                      <p className="text-xs">{d.pickupAddress}</p>
                      <p className="text-xs text-gray-500">{d.distanceKm} km away</p>
                      <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded">
                        {statusLabels[d.status]}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center">
                <Truck className="h-8 w-8 mx-auto text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm">No delivery history yet.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="p-3 text-left font-medium">Food</th>
                    <th className="p-3 text-left font-medium">Distance</th>
                    <th className="p-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((d) => (
                    <tr key={d.id} className="border-b border-slate-700 last:border-0">
                      <td className="p-3">{d.foodDetails}</td>
                      <td className="p-3 text-slate-400">{d.distanceKm} km</td>
                      <td className="p-3">
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                          Delivered
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <BottomNav role="volunteer" />
    </div>
  );
}