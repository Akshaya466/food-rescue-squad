import { afterEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

const firebaseMocks = vi.hoisted(() => ({
  auth: {},
  db: {},
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/config/firebase", () => firebaseMocks);

import { createListing } from "@/services/foodService";
import {
  approveRoleRequest,
  setUserVerification,
} from "@/services/adminService";
import {
  getRatingOpportunities,
  getUserProfile,
  submitRating,
  updateUserProfile,
} from "@/services/userService";
import { markAllNotificationsRead } from "@/services/notificationService";
import { SparkUnavailableError } from "@/services/sparkUnavailable";

afterEach(() => {
  vi.clearAllMocks();
});

describe("Spark-only server operations", () => {
  it("fails all unavailable operations with a clear no-write error", async () => {
    const operations = [
      approveRoleRequest("user-1"),
      setUserVerification("user-1", true),
      submitRating({
        toUserId: "recipient-1",
        listingId: "listing-1",
        score: 5,
        review: "Good",
      }),
      getRatingOpportunities(),
    ];

    for (const operation of operations) {
      await expect(operation).rejects.toBeInstanceOf(SparkUnavailableError);
      await expect(operation).rejects.toThrow("No data was changed.");
    }

    expect(firestoreMocks.addDoc).not.toHaveBeenCalled();
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
    expect(firestoreMocks.deleteDoc).not.toHaveBeenCalled();
  });
});

describe("Spark-only permitted Firestore operations", () => {
  it("keeps profile reads and authorized self-profile updates available", async () => {
    firestoreMocks.getDoc.mockResolvedValue({
      id: "user-1",
      exists: () => true,
      data: () => ({ name: "Test User", role: "donor" }),
    });

    await expect(getUserProfile("user-1")).resolves.toEqual({
      id: "user-1",
      name: "Test User",
      role: "donor",
    });

    await updateUserProfile("user-1", { name: "Updated User" });
    expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
  });

  it("keeps listing creation and notification-read updates available", async () => {
    firestoreMocks.collection.mockReturnValue("collection-ref");
    firestoreMocks.doc.mockReturnValue("document-ref");
    firestoreMocks.addDoc.mockResolvedValue({ id: "listing-1" });
    firestoreMocks.where.mockReturnValue("where-clause");
    firestoreMocks.query.mockReturnValue("query-ref");
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [{ id: "notification-1" }],
    });

    await expect(createListing({
      donorId: "donor-1",
      donorName: "Community Kitchen",
      foodType: "Vegetables",
      description: "Fresh produce",
      quantity: 4,
      unit: "kg",
      category: "raw",
      pickupWindowStart: "2026-10-18T10:00",
      pickupWindowEnd: "2026-10-18T12:00",
      address: "Test address",
      location: { lat: 12.9, lng: 77.6, address: "Test address" },
      photos: [],
      claimedBy: null,
      dietaryTags: ["Veg"],
      urgencyLevel: "medium",
    })).resolves.toMatchObject({ id: "listing-1", foodType: "Vegetables" });

    await expect(markAllNotificationsRead("user-1")).resolves.toBeUndefined();
    expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
    expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
  });
});
