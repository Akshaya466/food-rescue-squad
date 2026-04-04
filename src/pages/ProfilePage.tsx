import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, CheckCircle, Award, Package, Heart, Shield } from "lucide-react";
import { getUserRatings } from "@/services/userService";
import { useState, useEffect } from "react";
import { Rating, User } from "@/types";

const badges = [
  { label: "Top Donor", icon: Award, color: "bg-warning/15 text-warning" },
  { label: "Verified", icon: Shield, color: "bg-success/15 text-success" },
  { label: "100+ Rescues", icon: Heart, color: "bg-secondary/15 text-secondary" },
];

export default function ProfilePage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("foodbridge_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      getUserRatings(u.id).then(setRatings);
    }
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <DashboardLayout role={user?.role || "donor"}>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left space-y-2 flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl font-bold">{user?.name || "User"}</h1>
                  {user?.isVerified && <CheckCircle className="h-5 w-5 text-success" />}
                </div>
                <p className="text-muted-foreground">
                  {user?.orgName || "—"} · {user?.location?.address || "—"}
                </p>
                <div className="flex items-center gap-4 justify-center sm:justify-start">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-semibold">{user?.trustScore ?? "—"}</span>
                    <span className="text-muted-foreground text-sm">
                      ({ratings.length} ratings)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" /> {user?.totalRescues ?? 0} rescues
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-sm text-muted-foreground">{user?.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Badges & Achievements</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <div key={b.label} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${b.color}`}>
                <b.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Reviews</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {ratings.length === 0 ? (
              <p className="text-muted-foreground text-sm">No reviews yet.</p>
            ) : (
              ratings.map((r) => (
                <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.score ? "fill-warning text-warning" : "text-muted"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{r.review}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}