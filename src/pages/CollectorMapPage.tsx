import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Package } from "lucide-react";
import { subscribeToListings } from "@/services/foodService";
import { FoodListing, User } from "@/types";
import { auth } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/services/userService";
import { recordListingAccess } from "@/services/listingAccessService";
import { toast } from "sonner";

delete L.Icon.Default.prototype._getIconUrl;
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
  const [collector, setCollector] = useState<User | null>(null);
  const [listingError, setListingError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeListings: (() => void) | null = null;
    let authGeneration = 0;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      const generation = ++authGeneration;
      unsubscribeListings?.();
      unsubscribeListings = null;
      if (!firebaseUser) {
        setCollector(null);
        setListings([]);
        return;
      }
      try {
        const profile = await getUserProfile(firebaseUser.uid);
        if (generation !== authGeneration) return;
        setCollector(profile);
        if (!profile || profile.role !== "collector") {
          setListings([]);
          return;
        }
        setListingError(null);
        unsubscribeListings = subscribeToListings(
          (data) => {
            if (generation !== authGeneration) return;
            setListings(data.filter(
              (listing) => listing.status === "active" && !listing.claimedBy
            ));
          },
          (error) => {
            if (generation === authGeneration) setListingError(error.message);
          }
        );
      } catch (error: unknown) {
        if (generation !== authGeneration) return;
        console.error("Could not load collector map profile:", error);
        setListingError(
          error instanceof Error ? error.message : "Could not load available food."
        );
      }
    });
    return () => {
      authGeneration += 1;
      unsubscribeAuth();
      unsubscribeListings?.();
    };
  }, []);

  const notifyVolunteersOfAccess = async (listing: FoodListing) => {
    if (!collector || collector.role !== "collector") {
      toast.error("Could not notify delivery volunteers: collector profile is unavailable.");
      return;
    }
    try {
      await recordListingAccess(listing, collector);
    } catch (error: unknown) {
      console.error("Could not record collector listing access:", error);
      toast.error("Could not notify delivery volunteers about this food.");
    }
  };

  return (
    <DashboardLayout role="collector">
      <div className="space-y-4">
        {listingError && (
          <Alert variant="destructive">
            <AlertTitle>Could not load available food</AlertTitle>
            <AlertDescription>{listingError}</AlertDescription>
          </Alert>
        )}
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
                  eventHandlers={{ popupopen: () => void notifyVolunteersOfAccess(l) }}
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