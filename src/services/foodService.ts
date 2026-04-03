import { FoodListing } from "@/types";

const mockListings: FoodListing[] = [
  {
    id: "fl1", donorId: "u1", donorName: "GreenPlate Catering", foodType: "Vegetable Biryani",
    description: "Freshly prepared veg biryani from a corporate event. Packed in hygienic containers.",
    quantity: 15, unit: "kg", category: "cooked",
    pickupWindowStart: new Date(Date.now() + 3600000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 10800000).toISOString(),
    address: "45, Anna Salai, T. Nagar, Chennai", location: { lat: 13.0418, lng: 80.2341, address: "T. Nagar, Chennai" },
    photos: [], status: "active", dietaryTags: ["Veg"], urgencyLevel: "medium", createdAt: new Date().toISOString(),
  },
  {
    id: "fl2", donorId: "u1", donorName: "Annapurna Mess", foodType: "Idli & Sambar",
    description: "50 portions of fresh idli with sambar and chutney. Morning batch, best consumed within 4 hours.",
    quantity: 50, unit: "portions", category: "cooked",
    pickupWindowStart: new Date(Date.now() + 1800000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 5400000).toISOString(),
    address: "12, Mylapore High Rd, Chennai", location: { lat: 13.0339, lng: 80.2676, address: "Mylapore, Chennai" },
    photos: [], status: "active", dietaryTags: ["Veg", "Vegan"], urgencyLevel: "high", createdAt: new Date().toISOString(),
  },
  {
    id: "fl3", donorId: "u2", donorName: "FreshBasket Supermarket", foodType: "Mixed Vegetables",
    description: "Assorted fresh vegetables nearing sell-by date. Includes carrots, beans, tomatoes, potatoes.",
    quantity: 25, unit: "kg", category: "raw",
    pickupWindowStart: new Date(Date.now() + 7200000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 18000000).toISOString(),
    address: "Adyar, Chennai", location: { lat: 13.0067, lng: 80.2565, address: "Adyar, Chennai" },
    photos: [], status: "active", dietaryTags: ["Veg", "Vegan"], urgencyLevel: "low", createdAt: new Date().toISOString(),
  },
  {
    id: "fl4", donorId: "u3", donorName: "Taj Banquets", foodType: "Paneer Butter Masala",
    description: "Rich paneer curry leftover from a wedding reception. Stored in chilled containers.",
    quantity: 8, unit: "kg", category: "cooked",
    pickupWindowStart: new Date(Date.now() + 600000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 3600000).toISOString(),
    address: "Mount Road, Chennai", location: { lat: 13.0604, lng: 80.2496, address: "Mount Road, Chennai" },
    photos: [], status: "claimed", claimedBy: "c1", dietaryTags: ["Veg"], urgencyLevel: "high", createdAt: new Date().toISOString(),
  },
  {
    id: "fl5", donorId: "u1", donorName: "GreenPlate Catering", foodType: "Dal Tadka & Rice",
    description: "Wholesome dal with steamed rice, serves approximately 30 people.",
    quantity: 30, unit: "portions", category: "cooked",
    pickupWindowStart: new Date(Date.now() - 7200000).toISOString(),
    pickupWindowEnd: new Date(Date.now() - 3600000).toISOString(),
    address: "Guindy, Chennai", location: { lat: 13.0067, lng: 80.2206, address: "Guindy, Chennai" },
    photos: [], status: "delivered", claimedBy: "c2", dietaryTags: ["Veg", "Vegan"], urgencyLevel: "low", createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "fl6", donorId: "u4", donorName: "Bombay Bakers", foodType: "Assorted Bread & Buns",
    description: "Day-old bread rolls, burger buns, and sandwich bread. Still fresh and consumable.",
    quantity: 40, unit: "packets", category: "packaged",
    pickupWindowStart: new Date(Date.now() + 1800000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 14400000).toISOString(),
    address: "Nungambakkam, Chennai", location: { lat: 13.0569, lng: 80.2425, address: "Nungambakkam, Chennai" },
    photos: [], status: "active", dietaryTags: ["Veg"], urgencyLevel: "medium", createdAt: new Date().toISOString(),
  },
];

let listings = [...mockListings];

export async function createListing(data: Omit<FoodListing, "id" | "createdAt" | "status">): Promise<FoodListing> {
  const listing: FoodListing = { ...data, id: "fl_" + Date.now(), status: "active", createdAt: new Date().toISOString() };
  listings.unshift(listing);
  return listing;
}

export async function getAllListings(): Promise<FoodListing[]> {
  return [...listings];
}

export async function getListingById(id: string): Promise<FoodListing | undefined> {
  return listings.find((l) => l.id === id);
}

export async function updateListing(id: string, data: Partial<FoodListing>): Promise<FoodListing> {
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Listing not found");
  listings[idx] = { ...listings[idx], ...data };
  return listings[idx];
}

export async function deleteListing(id: string): Promise<void> {
  listings = listings.filter((l) => l.id !== id);
}

export async function claimListing(id: string, collectorId: string): Promise<FoodListing> {
  return updateListing(id, { status: "claimed", claimedBy: collectorId });
}

export function getListingsByDonor(donorId: string): FoodListing[] {
  return listings.filter((l) => l.donorId === donorId);
}
