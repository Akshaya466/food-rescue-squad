import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Star, CheckCircle, Award, Package, Heart, Shield, Pencil } from "lucide-react";
import { getUserProfile, getUserRatings, updateUserProfile } from "@/services/userService";
import { useState, useEffect } from "react";
import { Rating, User } from "@/types";
import { toast } from "sonner";
import { auth } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { SparkUnavailableNotice } from "@/components/SparkUnavailableNotice";

export default function ProfilePage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", orgName: "", address: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await getUserProfile(firebaseUser.uid);
      setUser(profile);
      if (profile) {
        setEditForm({
          name: profile.name || "",
          phone: profile.phone || "",
          orgName: profile.orgName || "",
          address: profile.location?.address || "",
        });
        getUserRatings(firebaseUser.uid).then(setRatings).catch(() => setRatings([]));
      }
    }
  });
  return () => unsubscribeAuth();
}, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.id, {
        name: editForm.name,
        phone: editForm.phone,
        orgName: editForm.orgName,
        location: { ...user.location, address: editForm.address },
      });
      setUser((p) => p ? {
        ...p,
        name: editForm.name,
        phone: editForm.phone,
        orgName: editForm.orgName,
        location: { ...p.location, address: editForm.address },
      } : p);
      setEditOpen(false);
      toast.success("Profile updated successfully!");
    } catch (e) {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  const badges = [
    { label: "Top Donor", icon: Award, color: "bg-warning/15 text-warning", show: (user?.totalRescues ?? 0) >= 10 },
    { label: "Verified", icon: Shield, color: "bg-success/15 text-success", show: user?.isVerified },
    { label: "100+ Rescues", icon: Heart, color: "bg-secondary/15 text-secondary", show: (user?.totalRescues ?? 0) >= 100 },
    { label: "Active Member", icon: Package, color: "bg-primary/15 text-primary", show: true },
  ];

  return (
    <DashboardLayout role={user?.role || "donor"}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Profile Card */}
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
                    <span className="text-muted-foreground text-sm">({ratings.length} ratings)</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" /> {user?.totalRescues ?? 0} rescues
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-sm text-muted-foreground">{user?.phone}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Badges & Achievements</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {badges.filter(b => b.show).map((b) => (
              <div key={b.label} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${b.color}`}>
                <b.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Reviews ({ratings.length})</CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled
              title="Rating opportunities and submissions require a trusted Cloud Functions backend."
            >
              Rating unavailable
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <SparkUnavailableNotice operation="Loading rating opportunities and submitting ratings" />
            {ratings.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No reviews yet.
              </p>
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
                  {r.review && <p className="text-sm mt-1">{r.review}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Edit Profile Modal */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Organization / NGO Name</Label>
                <Input value={editForm.orgName} onChange={(e) => setEditForm(p => ({ ...p, orgName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>City / Address</Label>
                <Input value={editForm.address} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}