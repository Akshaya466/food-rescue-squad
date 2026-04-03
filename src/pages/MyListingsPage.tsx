import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, UrgencyDot } from "@/components/FoodBadges";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Eye, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getListingsByDonor, deleteListing } from "@/services/foodService";
import { FoodListing } from "@/types";

export default function MyListingsPage() {
  const [listings, setListings] = useState(getListingsByDonor("u1"));
  const [deleteTarget, setDeleteTarget] = useState<FoodListing | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteListing(deleteTarget.id);
    setListings((p) => p.filter((l) => l.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success("Listing deleted");
  };

  return (
    <DashboardLayout role="donor">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Listings</h1>
          <Link to="/donor/new-listing">
            <Button className="gap-2"><PlusCircle className="h-4 w-4" /> New Listing</Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No listings yet. Post your first surplus food listing!</p>
              <Link to="/donor/new-listing"><Button className="mt-4">Create Listing</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(l)}>
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

        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Listing</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{deleteTarget?.foodType}"? This action cannot be undone.
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
