import { User, Rating } from "@/types";

const mockRatings: Rating[] = [
  { id: "r1", fromUserId: "c1", toUserId: "u1", listingId: "fl5", score: 5, review: "Always on time, food quality is excellent!", createdAt: "2025-03-10" },
  { id: "r2", fromUserId: "v1", toUserId: "u1", listingId: "fl4", score: 4, review: "Well-packed food, easy pickup process.", createdAt: "2025-03-08" },
  { id: "r3", fromUserId: "u1", toUserId: "c1", listingId: "fl5", score: 5, review: "Quick and reliable collector. Great work!", createdAt: "2025-03-10" },
];

export async function getUserProfile(userId: string): Promise<User | null> {
  // TODO: Replace with Firestore doc read
  if (userId === "u1") {
    return {
      id: "u1", name: "Priya Sharma", email: "priya@greenplate.in", role: "donor",
      orgName: "GreenPlate Catering", phone: "+91 98765 43210",
      location: { lat: 13.0827, lng: 80.2707, address: "T. Nagar, Chennai" },
      trustScore: 4.8, totalRescues: 124, isVerified: true, createdAt: "2024-06-15",
    };
  }
  return null;
}

export async function updateUserProfile(_userId: string, _data: Partial<User>): Promise<User> {
  // TODO: Replace with Firestore doc update
  return {} as User;
}

export async function getUserRatings(userId: string): Promise<Rating[]> {
  return mockRatings.filter((r) => r.toUserId === userId);
}

export async function submitRating(rating: Omit<Rating, "id" | "createdAt">): Promise<Rating> {
  const newRating: Rating = { ...rating, id: "r_" + Date.now(), createdAt: new Date().toISOString() };
  mockRatings.push(newRating);
  return newRating;
}
