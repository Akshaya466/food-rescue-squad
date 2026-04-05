import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/FoodBadges";
import { Link } from "react-router-dom";
import { PlusCircle, Package, Weight, Heart, Star, CheckCircle, Clock, Bell } from "lucide-react";
import { subscribeToListingsByDonor } from "@/services/foodService";
import { FoodListing, User } from "@/types";
import { auth } from "@/config/firebase";
import { getUserProfile } from "@/services/userService";
import { onAuthStateChanged } from "firebase/auth";

export default function DonorDashboard() {
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          setUser(profile);
          const unsubscribeListings = subscribeToListingsByDonor(
            firebaseUser.uid,
            setListings
          );
          return () => unsubscribeListings();
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const activeCount = listings.filter((l) => l.status === "active").length;
  const claimedCount = listings.filter((l) => l.status === "claimed").length;
  const deliveredCount = listings.filter((l) => l.status === "delivered").length;
  const totalKg = listings.reduce((sum, l) => sum + (l.unit === "kg" ? l.quantity : 0), 0);
  const livesImpacted = deliveredCount * 30;

  const stats = [
    { label: "Active Listings", value: String(activeCount), icon: Package, color: "text-success" },
    { label: "Total Donated", value: `${totalKg} kg`, icon: Weight, color: "text-primary" },
    { label: "Lives Impacted", value: String(livesImpacted), icon: Heart, color: "text-secondary" },
    { label: "Rating", value: user ? `${user.trustScore} ★` : "—", icon: Star, color: "text-warning" },
  ];

  return (
    <DashboardLayout role="donor">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Welcome, {user?.name || "Donor"}</h1>
              {user?.isVerified && <CheckCircle className="h-5 w-5 text-success" />}
            </div>
            <p className="text-muted-foreground">
              {user?.orgName || "Your Organisation"} · Trust Score:{" "}
              <span className="font-semibold text-warning">{user?.trustScore ?? "—"} ★</span>
            </p>
          </div>
          <Link to="/donor/new-listing">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" /> Post New Surplus
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${s.color}`}>
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

        <div className="grid grid-cols-3 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{activeCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Active Now</p>
            </CardContent>
          </Card>
          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-warning">{claimedCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Claimed</p>
            </CardContent>
          </Card>
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-success">{deliveredCount}</p>
              <p className="text-sm text-muted-foreground mt-1">Delivered</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">My Listings</CardTitle>
                <Link to="/donor/listings">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {listings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No listings yet. Post your first surplus!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-3 font-medium">Food Item</th>
                          <th className="pb-3 font-medium">Qty</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="pb-3 font-medium">Pickup</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listings.slice(0, 5).map((l) => (
                          <tr key={l.id} className="border-b last:border-0">
                            <td className="py-3 font-medium">{l.foodType}</td>
                            <td className="py-3 text-muted-foreground">{l.quantity} {l.unit}</td>
                            <td className="py-3"><StatusBadge status={l.status} /></td>
                            <td className="py-3 text-muted-foreground text-xs">
                              {new Date(l.pickupWindowStart).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              {" - "}
                              {new Date(l.pickupWindowEnd).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-4 w-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {listings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {listings.slice(0, 5).map((l) => (
                    <div key={l.id} className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm">
                          {l.status === "claimed" ? `✅ ${l.foodType} was claimed` :
                           l.status === "delivered" ? `🎉 ${l.foodType} was delivered` :
                           `📢 ${l.foodType} is ${l.status}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(l.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}