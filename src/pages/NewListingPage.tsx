import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import { createListing } from "@/services/foodService";
import { User } from "@/types";

const dietaryOptions = ["Veg", "Vegan", "Halal", "Jain", "Contains Allergens"];

export default function NewListingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    foodType: "",
    category: "cooked" as const,
    description: "",
    quantity: "",
    unit: "kg" as const,
    dietaryTags: [] as string[],
    address: "",
    pickupDate: "",
    pickupStart: "",
    pickupEnd: "",
    specialInstructions: "",
    urgencyLevel: "medium" as const,
  });

  const update = (field: string, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));

  const toggleTag = (tag: string) => {
    setForm((p) => ({
      ...p,
      dietaryTags: p.dietaryTags.includes(tag)
        ? p.dietaryTags.filter((t) => t !== tag)
        : [...p.dietaryTags, tag],
    }));
  };

  const handleSubmit = async () => {
    const stored = localStorage.getItem("foodbridge_user");
    const user: User | null = stored ? JSON.parse(stored) : null;
    await createListing({
      donorId: user?.id || "guest_" + Date.now(),
      donorName: user?.orgName || user?.name || "Anonymous Donor",
      foodType: form.foodType,
      description: form.description,
      quantity: Number(form.quantity),
      unit: form.unit,
      category: form.category,
      pickupWindowStart: `${form.pickupDate}T${form.pickupStart}`,
      pickupWindowEnd: `${form.pickupDate}T${form.pickupEnd}`,
      address: form.address,
      location: { lat: 13.0827, lng: 80.2707, address: form.address },
      photos: [],
      dietaryTags: form.dietaryTags,
      urgencyLevel: form.urgencyLevel,
      claimedBy: null,
    });
    toast.success("Listing posted successfully!");
    navigate("/donor/listings");
  };

  const urgencyColors: Record<string, string> = {
    low: "border-success text-success",
    medium: "border-warning text-warning",
    high: "border-destructive text-destructive",
  };

  return (
    <DashboardLayout role="donor">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Post New Surplus</h1>

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
          <span className="text-sm text-muted-foreground ml-2">
            {step === 1 ? "Food Details" : step === 2 ? "Pickup Info" : "Review & Post"}
          </span>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Food Name</Label>
                  <Input placeholder="e.g. Vegetable Biryani" value={form.foodType} onChange={(e) => update("foodType", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => update("category", v)}>
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
                    <Label>Unit</Label>
                    <Select value={form.unit} onValueChange={(v) => update("unit", v)}>
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
                  <Label>Quantity</Label>
                  <Input type="number" placeholder="e.g. 15" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the food, how it's stored, etc." value={form.description} onChange={(e) => update("description", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Dietary Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {dietaryOptions.map((tag) => (
                      <Badge key={tag} variant={form.dietaryTags.includes(tag) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleTag(tag)}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Photos</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    <p className="text-sm">Drag & drop photos or click to upload</p>
                    <p className="text-xs mt-1">PNG, JPG up to 5MB each</p>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Pickup Address</Label>
                  <div className="flex gap-2">
                    <Input className="flex-1" placeholder="Enter full pickup address" value={form.address} onChange={(e) => update("address", e.target.value)} />
                    <Button variant="outline" size="icon" type="button"><MapPin className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Google Maps location picker — coming soon</p>
                </div>
                <div className="space-y-2">
                  <Label>Pickup Date</Label>
                  <Input type="date" value={form.pickupDate} onChange={(e) => update("pickupDate", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={form.pickupStart} onChange={(e) => update("pickupStart", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={form.pickupEnd} onChange={(e) => update("pickupEnd", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Urgency Level</Label>
                  <div className="flex gap-3">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <Button key={level} type="button" variant="outline"
                        className={`capitalize flex-1 ${form.urgencyLevel === level ? urgencyColors[level] + " border-2" : ""}`}
                        onClick={() => update("urgencyLevel", level)}>
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Special Instructions</Label>
                  <Textarea placeholder="Any special handling or access instructions..." value={form.specialInstructions} onChange={(e) => update("specialInstructions", e.target.value)} />
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Review Your Listing</h3>
                <div className="space-y-3 divide-y">
                  <div className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Food Details</h4>
                      <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Edit</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <p><span className="text-muted-foreground">Name:</span> {form.foodType}</p>
                      <p><span className="text-muted-foreground">Category:</span> {form.category}</p>
                      <p><span className="text-muted-foreground">Quantity:</span> {form.quantity} {form.unit}</p>
                      <p><span className="text-muted-foreground">Tags:</span> {form.dietaryTags.join(", ") || "None"}</p>
                    </div>
                    {form.description && <p className="text-sm mt-2 text-muted-foreground">{form.description}</p>}
                  </div>
                  <div className="pt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Pickup Info</h4>
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)}>Edit</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <p className="col-span-2"><span className="text-muted-foreground">Address:</span> {form.address}</p>
                      <p><span className="text-muted-foreground">Date:</span> {form.pickupDate}</p>
                      <p><span className="text-muted-foreground">Window:</span> {form.pickupStart} - {form.pickupEnd}</p>
                      <p><span className="text-muted-foreground">Urgency:</span> <span className="capitalize">{form.urgencyLevel}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              ) : <div />}
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>Post Listing</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}