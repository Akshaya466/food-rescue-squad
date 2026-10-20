import { afterEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  currentUser: { uid: "collector-1" } as { uid: string } | null,
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/config/firebase", () => ({ db: {}, auth: authMock }));

import {
  recordListingAccess,
  subscribeToListingAccessEvents,
} from "./listingAccessService";
import { FoodListing, User } from "@/types";

const listing: FoodListing = {
  id: "listing-1",
  donorId: "donor-1",
  donorName: "Community Kitchen",
  foodType: "Vegetables",
  description: "Fresh vegetables",
  quantity: 10,
  unit: "kg",
  category: "raw",
  pickupWindowStart: "2026-10-20T10:00",
  pickupWindowEnd: "2026-10-20T12:00",
  address: "12 Market Road",
  location: { lat: 12.9, lng: 77.6, address: "12 Market Road" },
  photos: [],
  status: "active",
  claimedBy: null,
  dietaryTags: ["Veg"],
  urgencyLevel: "medium",
  createdAt: "2026-10-20T08:00:00.000Z",
};

const collector: User = {
  id: "collector-1",
  name: "Test Collector",
  email: "collector@example.test",
  role: "collector",
  phone: "5550100",
  location: { lat: 12.9, lng: 77.6, address: "Test address" },
  trustScore: 5,
  totalRescues: 0,
  isVerified: false,
  createdAt: "2026-10-20T08:00:00.000Z",
};

afterEach(() => {
  vi.clearAllMocks();
  authMock.currentUser = { uid: "collector-1" };
});

describe("recordListingAccess", () => {
  it("creates a deterministic access event with the actual listing details", async () => {
    const serverTimestampValue = { serverTimestamp: true };
    firestoreMocks.doc.mockReturnValue("event-ref");
    firestoreMocks.serverTimestamp.mockReturnValue(serverTimestampValue);
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => false });

    await expect(recordListingAccess(listing, collector)).resolves.toBe(true);

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      {},
      "listingAccessEvents",
      "listing-1_collector-1"
    );
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      "event-ref",
      expect.objectContaining({
        collectorId: collector.id,
        collectorName: collector.name,
        listingId: listing.id,
        foodType: listing.foodType,
        address: listing.address,
        pickupWindowStart: listing.pickupWindowStart,
        pickupWindowEnd: listing.pickupWindowEnd,
        createdAt: serverTimestampValue,
      })
    );
  });

  it("does not create a duplicate event for the same collector and listing", async () => {
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => true });

    await expect(recordListingAccess(listing, collector)).resolves.toBe(false);

    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });

  it("rejects calls for a different signed-in user", async () => {
    authMock.currentUser = { uid: "another-user" };

    await expect(recordListingAccess(listing, collector)).rejects.toThrow(
      "An authenticated collector is required"
    );
    expect(firestoreMocks.getDoc).not.toHaveBeenCalled();
  });
});

describe("subscribeToListingAccessEvents", () => {
  it("forwards new access events and listener errors", () => {
    let receiveSnapshot:
      | ((snapshot: { docs: { id: string; data: () => object }[] }) => void)
      | undefined;
    let reportError: ((error: Error) => void) | undefined;
    const unsubscribe = vi.fn();
    firestoreMocks.collection.mockReturnValue("listingAccessEvents");
    firestoreMocks.orderBy.mockReturnValue("createdAt-desc");
    firestoreMocks.limit.mockReturnValue("limit-20");
    firestoreMocks.query.mockReturnValue("query");
    firestoreMocks.onSnapshot.mockImplementation((_, onNext, onError) => {
      receiveSnapshot = onNext;
      reportError = onError;
      return unsubscribe;
    });
    const onEvents = vi.fn();
    const onError = vi.fn();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    const stop = subscribeToListingAccessEvents(onEvents, onError);
    receiveSnapshot?.({
      docs: [{
        id: "listing-1_collector-1",
        data: () => ({ listingId: "listing-1", collectorName: "Test Collector" }),
      }],
    });
    const error = new Error("permission-denied");
    reportError?.(error);

    expect(onEvents).toHaveBeenCalledWith([
      expect.objectContaining({ id: "listing-1_collector-1", listingId: "listing-1" }),
    ]);
    expect(onError).toHaveBeenCalledWith(error);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
    logError.mockRestore();
  });
});
