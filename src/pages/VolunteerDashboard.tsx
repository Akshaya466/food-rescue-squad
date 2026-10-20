import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Phone, ChevronRight, Flame, Package, Truck, CheckCircle, Navigation, Award } from "lucide-react";
import {
  subscribeToVolunteerDeliveries,
  subscribeToDeliveryHistory,
  updateDeliveryStatus,
} from "@/services/deliveryService";
import { Delivery, User } from "@/types";
import { auth } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/services/userService";
import { getCurrentCoordinates } from "@/services/locationService";
import { ListingClaimNotification, subscribeToListingClaims } from "@/services/listingClaimService";
import { toast } from "sonner";
delete L.Icon.Default.prototype._getIconUrl;
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
  const [active, setActive] = useState<Delivery[]>([]);
  const [deliveryFeedError, setDeliveryFeedError] = useState<string | null>(null);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [tab, setTab] = useState<"active" | "history" | "map">("active");
  const [zone, setZone] = useState("3");
  const [user, setUser] = useState<User | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [listingClaims, setListingClaims] = useState<ListingClaimNotification[]>([]);
  const [listingClaimsError, setListingClaimsError] = useState<string | null>(null);
  const [updatingDeliveryId, setUpdatingDeliveryId] = useState<string | null>(null);

  useEffect(() => {
  let unsubDeliveries: (() => void) | null = null;
  let unsubHistory: (() => void) | null = null;
  let unsubListingClaims: (() => void) | null = null;
  let authGeneration = 0;

  const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    const generation = ++authGeneration;
    if (unsubDeliveries) { unsubDeliveries(); unsubDeliveries = null; }
    if (unsubHistory) { unsubHistory(); unsubHistory = null; }
    if (unsubListingClaims) { unsubListingClaims(); unsubListingClaims = null; }

    if (!firebaseUser) {
      setUser(null);
      setActive([]);
      setHistory([]);
      setListingClaims([]);
      return;
    }

    try {
      const profile = await getUserProfile(firebaseUser.uid);
      if (generation !== authGeneration) return;
      setUser(profile);
      if (!profile || profile.role !== "volunteer") {
        setListingClaims([]);
        return;
      }

      unsubDeliveries = subscribeToVolunteerDeliveries(
        firebaseUser.uid,
        (deliveries) => {
          if (generation !== authGeneration) return;
          setActive(deliveries);
          setDeliveryFeedError(null);
        },
        (error) => {
          if (generation === authGeneration) setDeliveryFeedError(error.message);
        }
      );
      unsubHistory = subscribeToDeliveryHistory(firebaseUser.uid, (deliveries) => {
        if (generation === authGeneration) setHistory(deliveries);
      });
      setListingClaimsError(null);
      unsubListingClaims = subscribeToListingClaims(
        (claims) => {
          if (generation === authGeneration) setListingClaims(claims);
        },
        (error) => {
          if (generation === authGeneration) setListingClaimsError(error.message);
        }
      );

      getCurrentCoordinates()
        .then(({ lat, lng }) => {
          if (generation === authGeneration) setCurrentLocation([lat, lng]);
        })
        .catch((error: unknown) => {
          if (generation !== authGeneration) return;
          setCurrentLocation(null);
          setLocationError(
            error instanceof Error ? error.message : "Could not get your location."
          );
        });
    } catch (error: unknown) {
      if (generation !== authGeneration) return;
      console.error("Could not load volunteer profile:", error);
      setListingClaimsError(
        error instanceof Error ? error.message : "Could not load volunteer access alerts."
      );
    }
  });

  return () => {
    authGeneration += 1;
    unsubAuth();
    if (unsubDeliveries) unsubDeliveries();
    if (unsubHistory) unsubHistory();
    if (unsubListingClaims) unsubListingClaims();
  };
}, []);

  const advanceDelivery = async (delivery: Delivery) => {
    const nextStatus: Partial<Record<Delivery["status"], Delivery["status"]>> = {
      assigned: "en_route",
      en_route: "picked_up",
      picked_up: "delivered",
    };
    const next = nextStatus[delivery.status];
    if (!next) return;

    setUpdatingDeliveryId(delivery.id);
    try {
      await updateDeliveryStatus(delivery.id, next);
      if (next === "delivered") {
        toast.success("Delivery completed.");
      } else if (next === "en_route") {
        toast.success("Delivery accepted.");
      } else {
        toast.success("Food marked as picked up.");
      }
    } catch (error: unknown) {
      console.error("Could not update delivery status:", error);
      toast.error(error instanceof Error ? error.message : "Could not update delivery.");
    } finally {
      setUpdatingDeliveryId(null);
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
              <div className="h-2.5 w-2.5 rounded-full bg-slate-500" />
              <span className="text-sm">Availability not shared</span>
              <Switch
                checked={false}
                disabled
                aria-label="Availability requires trusted backend"
                title="Partner availability requires a trusted backend."
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4 pb-24 space-y-4">
        {listingClaimsError && (
          <div role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">
            Could not load food claim notifications: {listingClaimsError}
          </div>
        )}
        {listingClaims.length > 0 && (
          <section
            aria-live="polite"
            aria-label="Food claimed by collectors"
            className="space-y-2 rounded-xl border border-green-500/30 bg-green-500/10 p-4"
          >
            <h2 className="font-semibold text-green-300">Food claimed by collectors</h2>
            {listingClaims.map((claim) => (
              <article key={claim.id} className="rounded-lg bg-slate-800 p-3 text-sm">
                <p>
                  <span className="font-semibold">{claim.collectorName}</span>
                  {" claimed "}
                  <span className="font-semibold">{claim.foodType}</span>
                  {" ("}{claim.quantity} {claim.unit}{")"}
                </p>
                <p className="text-xs text-slate-400">Listing reference: {claim.listingId}</p>
                <p className="mt-1 text-slate-300">Pickup: {claim.pickupAddress}</p>
                <p className="text-slate-300">Delivery: {claim.dropAddress}</p>
                <p className="text-xs text-slate-400">
                  {claim.pickupWindowStart} – {claim.pickupWindowEnd}
                </p>
              </article>
            ))}
          </section>
        )}
        {deliveryFeedError && (
          <div role="alert" className="rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-200">
            Could not load delivery assignments: {deliveryFeedError}
          </div>
        )}
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
              <p className="text-slate-400">No active delivery assignments.</p>
              <p className="text-slate-500 text-sm mt-1">
                Live offers and partner availability require a trusted backend. This feed updates automatically when an authorized assignment is made.
              </p>
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
                        disabled={updatingDeliveryId === d.id}
                        onClick={() => void advanceDelivery(d)}
                      >
                        {updatingDeliveryId === d.id
                          ? "Updating..."
                          : d.status === "assigned"
                            ? "Accept & start"
                            : d.status === "en_route"
                              ? "Mark picked up"
                              : "Mark delivered"}
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
          <div className="space-y-3">
            {locationError && (
              <div role="alert" className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-100">
                {locationError}
              </div>
            )}
            <p className="text-sm text-slate-400">
              Pickup map pins are unavailable because delivery records do not contain pickup coordinates.
            </p>
            <div className="rounded-xl overflow-hidden border border-slate-700" style={{ height: "500px" }}>
            <MapContainer center={currentLocation || [13.0827, 80.2707]} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {currentLocation && (
                <>
                  <RecenterMap center={currentLocation} />
                  <Marker position={currentLocation} icon={volunteerIcon}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold">📍 You are here</p>
                      <p className="text-xs text-gray-500">{user?.name || "Volunteer"}</p>
                    </div>
                  </Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
            </div>
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