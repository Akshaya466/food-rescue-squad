import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Leaf, ArrowRight, Upload, Search, Truck, Star, Quote, MapPin, Heart, Users, Building2, ChefHat } from "lucide-react";
import { useEffect, useState } from "react";

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <span>{count.toLocaleString("en-IN")}{suffix}</span>;
}

const stats = [
  { label: "Food Rescued", value: 240000, suffix: " kg", icon: Heart },
  { label: "Meals Delivered", value: 8500, suffix: "+", icon: ChefHat },
  { label: "Active Donors", value: 320, suffix: "", icon: Building2 },
  { label: "NGO Partners", value: 180, suffix: "", icon: Users },
];

const steps = [
  { icon: Upload, title: "Donors List Surplus", desc: "Restaurants, caterers, and canteens post surplus food with pickup details." },
  { icon: Search, title: "Collectors Discover", desc: "NGOs and shelters browse available food nearby in real-time." },
  { icon: Truck, title: "Volunteers Deliver", desc: "Local volunteers pick up and deliver food to those who need it most." },
];

const roles = [
  { role: "Donor", desc: "Restaurants, hotels, and caterers — share surplus food instead of wasting it.", icon: Upload, color: "bg-primary" },
  { role: "Collector", desc: "NGOs, shelters, and community kitchens — discover and claim food for your community.", icon: Search, color: "bg-secondary" },
  { role: "Volunteer", desc: "Delivery heroes — pick up and deliver food to earn trust points and make an impact.", icon: Truck, color: "bg-info" },
];

const testimonials = [
  { name: "Rajesh Kumar", role: "Restaurant Owner, Chennai", text: "FoodBridge transformed how we handle surplus. We used to throw away 20kg of biryani daily — now it feeds families in Dharavi.", stars: 5 },
  { name: "Meera Iyer", role: "NGO Coordinator, Mumbai", text: "The real-time listings are a game-changer. We can now plan our food drives around available surplus — zero wastage, maximum impact.", stars: 5 },
  { name: "Arjun Nair", role: "Volunteer, Bangalore", text: "Delivering food feels rewarding. The app makes it seamless — I just pick up and drop off. Already rescued 500kg this month!", stars: 5 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-slide-up">
            <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium border-primary/30 text-primary">
              🌱 Reducing food waste across India
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              From Surplus to <span className="text-gradient">Smiles</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Real-time food rescue for urban communities. Connect donors, collectors, and volunteers to ensure no meal goes to waste.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/register">
                <Button size="lg" className="text-base px-8 h-12 gap-2">
                  Start Rescuing Food <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="text-base px-8 h-12">
                  See How It Works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card" id="impact">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center space-y-2 animate-slide-up">
                <s.icon className="h-8 w-8 mx-auto text-primary" />
                <p className="text-3xl md:text-4xl font-bold text-foreground">
                  <AnimatedCounter end={s.value} suffix={s.suffix} />
                </p>
                <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20" id="how-it-works">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">How FoodBridge Works</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Three simple steps to rescue surplus food and feed communities.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="text-center space-y-4 animate-slide-up" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mx-auto text-sm font-bold text-muted-foreground">{i + 1}</div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join As */}
      <section className="py-20 bg-muted/50" id="join">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">Join the Movement</h2>
            <p className="text-muted-foreground mt-3">Choose your role and start making an impact today.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {roles.map((r) => (
              <Card key={r.role} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center space-y-4">
                  <div className={`h-14 w-14 rounded-xl ${r.color} flex items-center justify-center mx-auto`}>
                    <r.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold">Join as {r.role}</h3>
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                  <Link to="/register">
                    <Button variant="outline" className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Get Started <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">What Our Community Says</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <Quote className="h-8 w-8 text-primary/30" />
                  <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Map Teaser */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="relative rounded-2xl overflow-hidden bg-card border aspect-video flex items-center justify-center">
              <MapPin className="h-16 w-16 text-primary/20" />
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground animate-pulse-slow">
                🔴 Live Map
              </Badge>
              <p className="absolute bottom-6 text-muted-foreground text-sm">Interactive map coming soon — see food rescues happening in real time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Leaf className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">FoodBridge</span>
              </div>
              <p className="text-sm text-muted-foreground">From Surplus to Smiles — connecting communities to reduce food waste across India.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><Link to="/register" className="hover:text-foreground transition-colors">Join as Donor</Link></p>
                <p><Link to="/register" className="hover:text-foreground transition-colors">Join as Collector</Link></p>
                <p><Link to="/register" className="hover:text-foreground transition-colors">Volunteer</Link></p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></p>
                <p><a href="#impact" className="hover:text-foreground transition-colors">Impact Report</a></p>
                <p><a href="#" className="hover:text-foreground transition-colors">Blog</a></p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></p>
                <p><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></p>
                <p><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></p>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2025 FoodBridge. Built with ❤️ for a hunger-free India.
          </div>
        </div>
      </footer>
    </div>
  );
}
