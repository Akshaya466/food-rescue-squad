import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Leaf, ChefHat, Users, Building2, Truck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const kpis = [
  { label: "Food Rescued", value: "2,40,000 kg", icon: Package, color: "text-primary" },
  { label: "CO₂ Offset", value: "48 tons", icon: Leaf, color: "text-success" },
  { label: "Meals Delivered", value: "8,500+", icon: ChefHat, color: "text-secondary" },
  { label: "Active Donors", value: "320", icon: Building2, color: "text-info" },
  { label: "Active NGOs", value: "180", icon: Users, color: "text-warning" },
  { label: "Volunteers", value: "95", icon: Truck, color: "text-primary" },
];

const monthlyData = [
  { month: "Oct", kg: 32000 }, { month: "Nov", kg: 38000 }, { month: "Dec", kg: 41000 },
  { month: "Jan", kg: 45000 }, { month: "Feb", kg: 39000 }, { month: "Mar", kg: 48000 },
];

const categoryData = [
  { name: "Cooked", value: 45 }, { name: "Raw", value: 25 },
  { name: "Packaged", value: 20 }, { name: "Beverages", value: 10 },
];
const COLORS = ["hsl(142, 72%, 29%)", "hsl(24, 95%, 53%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)"];

const weeklyActivity = [
  { day: "Mon", listings: 12, deliveries: 8 }, { day: "Tue", listings: 15, deliveries: 11 },
  { day: "Wed", listings: 10, deliveries: 9 }, { day: "Thu", listings: 18, deliveries: 14 },
  { day: "Fri", listings: 22, deliveries: 16 }, { day: "Sat", listings: 14, deliveries: 10 },
  { day: "Sun", listings: 8, deliveries: 6 },
];

const topDonors = [
  { name: "Priya Sharma", org: "GreenPlate Catering", kg: 1240, rating: 4.8 },
  { name: "Rahul Menon", org: "Taj Banquets", kg: 980, rating: 4.7 },
  { name: "Anita Das", org: "FreshBasket", kg: 870, rating: 4.9 },
  { name: "Karthik S.", org: "Bombay Bakers", kg: 650, rating: 4.6 },
];

const topCollectors = [
  { name: "Helping Hands NGO", rescued: "2,100 kg", rating: 4.9 },
  { name: "Feed Chennai", rescued: "1,850 kg", rating: 4.8 },
  { name: "Amma Unavagam", rescued: "1,400 kg", rating: 4.7 },
];

export default function AdminDashboard() {
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
          {/* Monthly Bar Chart */}
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

          {/* Pie Chart */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Food Categories</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Line */}
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Donors */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Top Donors</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Org</th>
                    <th className="pb-2 font-medium">kg</th>
                    <th className="pb-2 font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topDonors.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{d.name}</td>
                      <td className="py-2 text-muted-foreground">{d.org}</td>
                      <td className="py-2">{d.kg}</td>
                      <td className="py-2 text-warning">{d.rating} ★</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Top Collectors */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Top Collectors</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Rescued</th>
                    <th className="pb-2 font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {topCollectors.map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 font-medium">{c.name}</td>
                      <td className="py-2 text-muted-foreground">{c.rescued}</td>
                      <td className="py-2 text-warning">{c.rating} ★</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
