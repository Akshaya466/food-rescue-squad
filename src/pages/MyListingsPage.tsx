import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, UrgencyDot } from "@/components/FoodBadges";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Eye, PlusCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getListingsByDonor, deleteListing, updateListing } from "@/services/foodService";
import { FoodListing, User } from "@/types";
import { auth } from "@/config/firebase";
import { getUserProfile } from "@/services/userService";
import { onAuthStateChanged } from "firebase/auth";
import { subscribeToListingsByDonor } from "@/services/foodService";

export default function MyListingsPage() {
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<FoodListing | null>(null);
  const [editTarget, setEditTarget] = useState<FoodListing | null>(null);
  const [viewTarget, setViewTarget] = useState<FoodListing | null>(null);
  const [editForm, setEditForm] = useState<Partial<FoodListing>>({});
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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteListing(deleteTarget.id);
    setListings((p) => p.filter((l) => l.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Listing deleted successfully");
  };

  const handleEdit = (listing: FoodListing) => {
    setEditTarget(listing);
    setEditForm({
      foodType: listing.foodType,
      description: listing.description,
      quantity: listing.quantity,
      unit: listing.unit,
      category: listing.category,
      urgencyLevel: listing.urgencyLevel,
      address: listing.address,
    });
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    const updated = await updateListing(editTarget.id, editForm);
    setListings((p) => p.map((l) => l.id === editTarget.id ? updated : l));
    setEditTarget(null);
    toast.success("Listing updated successfully");
  };

  return (
    <DashboardLayout role="donor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Listings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {listings.length} total · {listings.filter(l => l.status === "active").length} active
            </p>
          </div>
          <Link to="/donor/new-listing">
            <Button className="gap-2"><PlusCircle className="h-4 w-4" /> New Listing</Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <PlusCircle className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground font-medium">No listings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Post your first surplus food listing to get started</p>
              <Link to="/donor/new-listing">
                <Button className="mt-4">Create First Listing</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground bg-muted/50">
                      <th className="p-4 font-medium">Food Item</th>
                      <th className="p-4 font-medium">Qty</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Urgency</th>
                      <th className="p-4 font-medium">Pickup Window</th>
                      <th className="p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium">{l.foodType}</p>
                          <p className="text-xs text-muted-foreground capitalize">{l.category}</p>
                        </td>
                        <td className="p-4 text-muted-foreground">{l.quantity} {l.unit}</td>
                        <td className="p-4"><StatusBadge status={l.status} /></td>
                        <td className="p-4"><UrgencyDot level={l.urgencyLevel} /></td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {new Date(l.pickupWindowStart).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                          {" - "}
                          {new Date(l.pickupWindowEnd).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={() => setViewTarget(l)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => handleEdit(l)}
                              disabled={l.status === "claimed" || l.status === "delivered"}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => setDeleteTarget(l)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Modal */}
        <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{viewTarget?.foodType}</DialogTitle>
            </DialogHeader>
            {viewTarget && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-muted-foreground">Category</p><p className="font-medium capitalize">{viewTarget.category}</p></div>
                  <div><p className="text-muted-foreground">Quantity</p><p className="font-medium">{viewTarget.quantity} {viewTarget.unit}</p></div>
                  <div><p className="text-muted-foreground">Status</p><StatusBadge status={viewTarget.status} /></div>
                  <div><p className="text-muted-foreground">Urgency</p><UrgencyDot level={viewTarget.urgencyLevel} /></div>
                </div>
                <div><p className="text-muted-foreground">Address</p><p className="font-medium">{viewTarget.address}</p></div>
                <div><p className="text-muted-foreground">Description</p><p>{viewTarget.description || "—"}</p></div>
                <div><p className="text-muted-foreground">Dietary Tags</p><p className="font-medium">{viewTarget.dietaryTags.join(", ") || "None"}</p></div>
                <div><p className="text-muted-foreground">Pickup Window</p>
                  <p className="font-medium">
                    {new Date(viewTarget.pickupWindowStart).toLocaleString("en-IN")} — {new Date(viewTarget.pickupWindowEnd).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Food Name</Label>
                <Input value={editForm.foodType || ""} onChange={(e) => setEditForm(p => ({ ...p, foodType: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={editForm.quantity || ""} onChange={(e) => setEditForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={editForm.unit} onValueChange={(v) => setEditForm(p => ({ ...p, unit: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="portions">Portions</SelectItem>
                      <SelectItem value="packets">Packets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm(p => ({ ...p, category: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cooked">Cooked</SelectItem>
                    <SelectItem value="raw">Raw</SelectItem>
                    <SelectItem value="packaged">Packaged</SelectItem>
                    <SelectItem value="beverages">Beverages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select value={editForm.urgencyLevel} onValueChange={(v) => setEditForm(p => ({ ...p, urgencyLevel: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={editForm.address || ""} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editForm.description || ""} onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Listing</DialogTitle>
            </DialogHeader>
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