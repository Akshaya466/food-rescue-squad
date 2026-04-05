import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Leaf } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginUser, signInWithGoogle } from "@/services/authService";
import { updateUserProfile } from "@/services/userService";
import { User } from "@/types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [role, setRole] = useState<string>("donor");
  const [roleModal, setRoleModal] = useState(false);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("donor");
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const routes: Record<string, string> = {
    donor: "/donor/dashboard",
    collector: "/collector/dashboard",
    volunteer: "/volunteer/dashboard",
    admin: "/admin/dashboard",
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      const user = await loginUser(data.email, data.password);
      if (user.role !== role) {
        toast.error(`This account is registered as a ${user.role}, not a ${role}.`);
        return;
      }
      toast.success(`Welcome back, ${user.name}!`);
      navigate(routes[user.role] || "/donor/dashboard");
    } catch (error: any) {
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message || "Login failed. Please try again.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (!user.role || user.role === "donor") {
        setGoogleUser(user);
        setRoleModal(true);
      } else {
        toast.success(`Welcome, ${user.name}!`);
        navigate(routes[user.role] || "/donor/dashboard");
      }
    } catch (error: any) {
      toast.error("Google sign-in failed. Please try again.");
    }
  };

  const handleRoleConfirm = async () => {
    if (!googleUser) return;
    await updateUserProfile(googleUser.id, { role: selectedRole as any });
    const updated = { ...googleUser, role: selectedRole as any };
    setRoleModal(false);
    toast.success(`Welcome, ${googleUser.name}!`);
    navigate(routes[selectedRole] || "/donor/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <Link to="/" className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
          </Link>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your FoodBridge account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Tabs value={role} onValueChange={setRole}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="donor">Donor</TabsTrigger>
              <TabsTrigger value="collector">Collector</TabsTrigger>
              <TabsTrigger value="volunteer">Volunteer</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm font-normal">Remember me</Label>
              </div>
              <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>

      {/* Role Selection Modal for Google Users */}
      <Dialog open={roleModal} onOpenChange={setRoleModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select your role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">How will you use FoodBridge?</p>
          <div className="space-y-2">
            {["donor", "collector", "volunteer"].map((r) => (
              <button
                key={r}
                className={`w-full p-3 rounded-lg border text-left capitalize font-medium transition-colors ${
                  selectedRole === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted hover:bg-muted"
                }`}
                onClick={() => setSelectedRole(r)}
              >
                {r === "donor" ? "🍱 Donor — Restaurant / Canteen" :
                 r === "collector" ? "🏢 Collector — NGO / Community Kitchen" :
                 "🛵 Volunteer — Delivery Partner"}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleRoleConfirm}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}