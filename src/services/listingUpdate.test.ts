import { describe, expect, it } from "vitest";
import { FoodListing } from "@/types";
import { synchronizeListingAddress } from "./listingUpdate";

describe("synchronizeListingAddress", () => {
  it("updates both address fields and preserves coordinates and other listing fields", () => {
    const current: FoodListing = {
      id: "listing-1",
      donorId: "donor-1",
      donorName: "Community Kitchen",
      foodType: "Vegetables",
      description: "Fresh vegetables",
      quantity: 10,
      unit: "kg",
      category: "raw",
      pickupWindowStart: "2026-10-18T10:00",
      pickupWindowEnd: "2026-10-18T12:00",
      address: "Old address",
      location: { lat: 12.9, lng: 77.6, address: "Old address" },
      photos: [],
      status: "active",
      claimedBy: null,
      dietaryTags: ["Veg"],
      urgencyLevel: "medium",
      createdAt: "2026-10-18T08:00:00.000Z",
    };
    const updates = synchronizeListingAddress(current.location, {
      address: "New address",
      description: "Updated description",
    });
    const updated = { ...current, ...updates };

    expect(updated.address).toBe("New address");
    expect(updated.location).toEqual({
      lat: current.location.lat,
      lng: current.location.lng,
      address: "New address",
    });
    expect(updated.description).toBe("Updated description");
    expect(updated.foodType).toBe(current.foodType);
    expect(updated.donorId).toBe(current.donorId);
    expect(updated.status).toBe(current.status);
  });

  it("leaves updates without an address unchanged", () => {
    const updates: Partial<FoodListing> = { description: "Updated description" };

    expect(
      synchronizeListingAddress(
        { lat: 12.9, lng: 77.6, address: "Current address" },
        updates
      )
    ).toBe(updates);
  });
});
