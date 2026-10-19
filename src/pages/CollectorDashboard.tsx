import { subscribeToListings } from "@/services/foodService";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, UrgencyDot, CategoryBadge } from "@/components/FoodBadges";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Clock, Package, Weight, Star, Search, LayoutGrid, Map, X } from "lucide-react";
import { FoodListing, User } from "@/types";
import { auth } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/services/userService";
import { SparkUnavailableNotice } from "@/components/SparkUnavailableNotice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Clock className="h-3 w-3" />{remaining}
    </span>
  );
}

export default function CollectorDashboard() {
  const [allData, setAllData] = useState<FoodListing[]>([]);
  const [view, setView] = useState<"card" | "map">("card");
  const [filters, setFilters] = useState({ category: "all", distance: "5", urgency: "all" });
  const [viewTarget, setViewTarget] = useState<FoodListing | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [listingError, setListingError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeListings: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubscribeListings) {
        unsubscribeListings();
        unsubscribeListings = null;
      }

      if (firebaseUser) {
        setCurrentUid(firebaseUser.uid);
        const profile = await getUserProfile(firebaseUser.uid);
        setUser(profile);

        setListingError(null);
        unsubscribeListings = subscribeToListings((data) => {
          // Deduplicate by id
          const unique = data.filter(
  (l, index, self) => index === self.findIndex((t) => t.id === l.id)
);
setAllData(unique);
        }, (error) => setListingError(error.message));
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeListings) unsubscribeListings();
    };
  }, []);

  // Derive active and claimed from single source of truth
  const listings = allData.filter((l) => l.status === "active");
  const claimedListings = allData.filter((l) => l.claimedBy === currentUid);

  const filteredListings = listings.filter(l => {
    if (filters.category !== "all" && l.category !== filters.category) return false;
    if (filters.urgency !== "all" && l.urgencyLevel !== filters.urgency) return false;
    return true;
  });

  const totalKgClaimed = claimedListings.reduce(
    (sum, l) => sum + (l.unit === "kg" ? l.quantity : 0), 0
  );

  const collectorStats = [
    { label: "Available Nearby", value: listings.length.toString(), icon: Package },
    { label: "Total Claimed", value: claimedListings.length.toString(), icon: Search },
    { label: "kg Collected", value: `${totalKgClaimed} kg`, icon: Weight },
    { label: "Trust Score", value: user ? `${user.trustScore} ★` : "—", icon: Star },
  ];

  return (
    <DashboardLayout role="collector">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Available Food Nearby</h1>
        <SparkUnavailableNotice operation="Claiming and unclaiming food" />
        {listingError && (
          <Alert variant="destructive">
            <AlertTitle>Could not load available food</AlertTitle>
            <AlertDescription>{listingError}</AlertDescription>
          </Alert>
        )}

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

        {/* Card View */}
        {view === "card" && (
          <>
            {filteredListings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No food listings available right now.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((l) => (
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
                            <MapPin className="h-3 w-3" /> {l.address.split(",")[0]}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewTarget(l)}>
                            Details
                          </Button>
                          <Button className="flex-1" size="sm" disabled title="Claiming requires a trusted Cloud Functions backend.">
                            Claim unavailable
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Claimed by You */}
            {claimedListings.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Claimed by You</h2>
                {claimedListings.map((l) => (
                  <Card key={l.id} className="border-primary/30">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{l.foodType}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.quantity} {l.unit} · {l.address}
                        </p>
                      </div>
                      <StatusBadge status={l.status} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30"
                        disabled
                        title="Unclaiming requires a trusted Cloud Functions backend."
                      >
                        <X className="h-3 w-3 mr-1" /> Unclaim unavailable
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Map View */}
        {view === "map" && (
          <div className="rounded-xl overflow-hidden border" style={{ height: "500px" }}>
            <MapContainer center={[13.0827, 80.2707]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredListings.map((l) => (
                <Marker
                  key={l.id}
                  position={[l.location.lat, l.location.lng]}
                  icon={getMarkerIcon(l)}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[180px]">
                      <p className="font-semibold">{l.foodType}</p>
                      <p className="text-xs text-gray-500">{l.donorName}</p>
                      <p className="text-xs">{l.quantity} {l.unit} · {l.category}</p>
                      <p className="text-xs text-gray-500">{l.address}</p>
                      <button
                        className="w-full bg-green-600 text-white text-xs py-1.5 rounded font-semibold opacity-50 cursor-not-allowed"
                        disabled
                        title="Claiming requires a trusted Cloud Functions backend."
                      >
                        Claim unavailable
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Details Modal */}
        <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{viewTarget?.foodType}</DialogTitle>
            </DialogHeader>
            {viewTarget && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-muted-foreground">Donor</p><p className="font-medium">{viewTarget.donorName}</p></div>
                  <div><p className="text-muted-foreground">Category</p><p className="font-medium capitalize">{viewTarget.category}</p></div>
                  <div><p className="text-muted-foreground">Quantity</p><p className="font-medium">{viewTarget.quantity} {viewTarget.unit}</p></div>
                  <div><p className="text-muted-foreground">Urgency</p><UrgencyDot level={viewTarget.urgencyLevel} /></div>
                </div>
                <div><p className="text-muted-foreground">Address</p><p className="font-medium">{viewTarget.address}</p></div>
                <div><p className="text-muted-foreground">Description</p><p>{viewTarget.description || "—"}</p></div>
                <div><p className="text-muted-foreground">Dietary Tags</p><p className="font-medium">{viewTarget.dietaryTags.join(", ") || "None"}</p></div>
                <div>
                  <p className="text-muted-foreground">Pickup Window</p>
                  <p className="font-medium">
                    {new Date(viewTarget.pickupWindowStart).toLocaleString("en-IN")} — {new Date(viewTarget.pickupWindowEnd).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
              <Button disabled title="Claiming requires a trusted Cloud Functions backend.">
                Claim unavailable
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}