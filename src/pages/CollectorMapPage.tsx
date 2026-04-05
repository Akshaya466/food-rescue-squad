import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Package } from "lucide-react";
import { getAllListings, claimListing } from "@/services/foodService";
import { FoodListing, User } from "@/types";
import { toast } from "sonner";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const freshIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const expiringIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const criticalIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

function getMarkerIcon(listing: FoodListing) {
  const diff = new Date(listing.pickupWindowEnd).getTime() - Date.now();
  if (diff < 3600000) return criticalIcon;
  if (diff < 7200000) return expiringIcon;
  return freshIcon;
}

export default function CollectorMapPage() {
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("Annora_user");
    const u = stored ? JSON.parse(stored) : null;
    setUser(u);
    getAllListings().then((data) => setListings(data.filter((l) => l.status === "active")));
  }, []);

  const handleClaim = async (id: string) => {
    if (!user) return;
    await claimListing(id, user.id);
    setListings((p) => p.filter((l) => l.id !== id));
    toast.success("Food claimed successfully!");
  };

  return (
    <DashboardLayout role="collector">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Live Map</h1>
            <p className="text-sm text-muted-foreground">
              🟢 Fresh &nbsp; 🟠 Expiring &lt;2hr &nbsp; 🔴 Critical &lt;1hr
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {listings.length} active listings
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border" style={{ height: "calc(100vh - 14rem)" }}>
          {listings.length === 0 ? (
            <div className="h-full bg-muted flex items-center justify-center">
              <div className="text-center space-y-2">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No active listings to show on map</p>
              </div>
            </div>
          ) : (
            <MapContainer center={[13.0827, 80.2707]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {listings.map((l) => (
                <Marker
                  key={l.id}
                  position={[
                    l.location.lat + (Math.random() - 0.5) * 0.02,
                    l.location.lng + (Math.random() - 0.5) * 0.02,
                  ]}
                  icon={getMarkerIcon(l)}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <p className="font-semibold text-base">{l.foodType}</p>
                      <p className="text-xs text-gray-500">by {l.donorName}</p>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">{l.category}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded">{l.quantity} {l.unit}</span>
                      </div>
                      <p className="text-xs text-gray-500">📍 {l.address}</p>
                      <p className="text-xs text-gray-500">
                        ⏰ Until {new Date(l.pickupWindowEnd).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {l.description && <p className="text-xs">{l.description}</p>}
                      <button
                        className="w-full bg-green-600 text-white text-sm py-2 rounded font-semibold hover:bg-green-700 transition-colors"
                        onClick={() => handleClaim(l.id)}
                      >
                        ✓ Claim This Food
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}