import { FoodListing, Location } from "@/types";

export function synchronizeListingAddress(
  currentLocation: Location,
  updates: Partial<FoodListing>
): Partial<FoodListing> {
  if (typeof updates.address !== "string") return updates;

  return {
    ...updates,
    location: {
      ...currentLocation,
      address: updates.address,
    },
  };
}
