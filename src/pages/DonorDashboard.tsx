import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/FoodBadges";
import { Link } from "react-router-dom";
import { PlusCircle, Package, Weight, Heart, Star, CheckCircle, Clock, Bell } from "lucide-react";
import { getListingsByDonor } from "@/services/foodService";

const user = { name: "Priya Sharma", orgName: "GreenPlate Catering", trustScore: 4.8, isVerified: true };
const stats = [
  { label: "Active Listings", value: "4", icon: Package, color: "text-success" },
  { label: "Total Donated", value: "1,240 kg", icon: Weight, color: "text-primary" },
  { label: "Lives Impacted", value: "3,100+", icon: Heart, color: "text-secondary" },
  { label: "Rating", value: "4.8 ★", icon: Star, color: "text-warning" },
];

const recentActivity = [
  { text: "Helping Hands NGO claimed your Vegetable Biryani", time: "10 min ago" },
  { text: "Delivery completed: Dal Tadka & Rice → Velachery", time: "1 day ago" },
  { text: "5-star rating from Ravi Kumar", time: "2 days ago" },
  { text: "New listing posted: Idli & Sambar (50 portions)", time: "3 days ago" },
];

export default function DonorDashboard() {
  const listings = getListingsByDonor("u1");

  return (
    <DashboardLayout role="donor">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
              {user.isVerified && <CheckCircle className="h-5 w-5 text-success" />}
            </div>
            <p className="text-muted-foreground">{user.orgName} · Trust Score: <span className="font-semibold text-warning">{user.trustScore} ★</span></p>
          </div>
          <Link to="/donor/new-listing">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" /> Post New Surplus
            </Button>
          </Link>
        </div>

        {/* Stats */}
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

        <div className="grid md:grid-cols-3 gap-6">
          {/* Listings Table */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">My Listings</CardTitle>
                <Link to="/donor/listings"><Button variant="ghost" size="sm">View All</Button></Link>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-4 w-4" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
