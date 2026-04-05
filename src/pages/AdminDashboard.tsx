import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Package, Leaf, ChefHat, Users, Building2, Truck, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/FoodBadges";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { getAllListings, deleteListing } from "@/services/foodService";
import { FoodListing, User } from "@/types";
import { toast } from "sonner";
import { db } from "@/config/firebase";
import { collection, getDocs } from "firebase/firestore";

const COLORS = ["hsl(142, 72%, 29%)", "hsl(24, 95%, 53%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)"];

const weeklyActivity = [
  { day: "Mon", listings: 12, deliveries: 8 },
  { day: "Tue", listings: 15, deliveries: 11 },
  { day: "Wed", listings: 10, deliveries: 9 },
  { day: "Thu", listings: 18, deliveries: 14 },
  { day: "Fri", listings: 22, deliveries: 16 },
  { day: "Sat", listings: 14, deliveries: 10 },
  { day: "Sun", listings: 8, deliveries: 6 },
];

export default function AdminDashboard() {
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<FoodListing | null>(null);

  useEffect(() => {
  getAllListings().then(setListings);
  getDocs(collection(db, "users")).then((snap) => {
    setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
  });
}, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteListing(deleteTarget.id);
    setListings((p) => p.filter((l) => l.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Listing deleted");
  };

  const totalKg = listings.reduce((s, l) => s + (l.unit === "kg" ? l.quantity : 0), 0);
  const activeListings = listings.filter(l => l.status === "active").length;
  const deliveredListings = listings.filter(l => l.status === "delivered").length;
  const donors = users.filter(u => u.role === "donor");
  const collectors = users.filter(u => u.role === "collector");
  const volunteers = users.filter(u => u.role === "volunteer");

  const kpis = [
    { label: "Food Rescued", value: `${totalKg} kg`, icon: Package, color: "text-primary" },
    { label: "Active Listings", value: activeListings.toString(), icon: Leaf, color: "text-success" },
    { label: "Delivered", value: deliveredListings.toString(), icon: ChefHat, color: "text-secondary" },
    { label: "Donors", value: donors.length.toString(), icon: Building2, color: "text-info" },
    { label: "Collectors", value: collectors.length.toString(), icon: Users, color: "text-warning" },
    { label: "Volunteers", value: volunteers.length.toString(), icon: Truck, color: "text-primary" },
  ];

  const categoryData = [
    { name: "Cooked", value: listings.filter(l => l.category === "cooked").length || 1 },
    { name: "Raw", value: listings.filter(l => l.category === "raw").length || 1 },
    { name: "Packaged", value: listings.filter(l => l.category === "packaged").length || 1 },
    { name: "Beverages", value: listings.filter(l => l.category === "beverages").length || 1 },
  ];

  const monthlyData = [
    { month: "Oct", kg: 32000 }, { month: "Nov", kg: 38000 },
    { month: "Dec", kg: 41000 }, { month: "Jan", kg: 45000 },
    { month: "Feb", kg: 39000 }, { month: "Mar", kg: totalKg || 48000 },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Impact Dashboard</h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4 text-center space-y-1">
                <k.icon className={`h-6 w-6 mx-auto ${k.color}`} />
                <p className="text-xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Monthly Food Rescued (kg)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="kg" fill="hsl(142, 72%, 29%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Food Categories</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Weekly Activity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="listings" stroke="hsl(142, 72%, 29%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="deliveries" stroke="hsl(24, 95%, 53%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* All Listings with Delete */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">All Listings ({listings.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {listings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No listings yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left bg-muted/50">
                      <th className="p-4 font-medium">Food</th>
                      <th className="p-4 font-medium">Donor</th>
                      <th className="p-4 font-medium">Qty</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Posted</th>
                      <th className="p-4 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-4 font-medium">{l.foodType}</td>
                        <td className="p-4 text-muted-foreground">{l.donorName}</td>
                        <td className="p-4">{l.quantity} {l.unit}</td>
                        <td className="p-4"><StatusBadge status={l.status} /></td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {new Date(l.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-4">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTarget(l)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registered Users */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Registered Users ({users.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No registered users yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left bg-muted/50">
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Role</th>
                      <th className="p-4 font-medium">Org</th>
                      <th className="p-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-4 font-medium">{u.name}</td>
                        <td className="p-4 text-muted-foreground">{u.email}</td>
                        <td className="p-4 capitalize">{u.role}</td>
                        <td className="p-4 text-muted-foreground">{u.orgName || "—"}</td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {new Date(u.createdAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Modal */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Listing</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.foodType}"</span>? This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}