import { afterEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
const authMock = vi.hoisted(() => ({
  currentUser: { uid: "collector-1" } as { uid: string } | null,
}));
vi.mock("@/config/firebase", () => ({ db: {}, auth: authMock }));

import { claimListing, createListing, subscribeToListings, unclaimListing } from "./foodService";
import { User } from "@/types";

const collector: User = {
  id: "collector-1",
  name: "Test Collector",
  email: "collector@example.test",
  role: "collector",
  phone: "5550100",
  location: { lat: 12.9, lng: 77.6, address: "Collector location" },
  trustScore: 5,
  totalRescues: 0,
  isVerified: false,
  createdAt: "2026-10-20T08:00:00.000Z",
};

const listingInput = {
  donorId: "donor-1",
  donorName: "Community Kitchen",
  foodType: "Vegetables",
  description: "Fresh surplus vegetables",
  quantity: 10,
  unit: "kg" as const,
  category: "raw" as const,
  pickupWindowStart: "2026-10-20T10:00",
  pickupWindowEnd: "2026-10-20T12:00",
  address: "12 Market Road",
  location: { lat: 12.9, lng: 77.6, address: "12 Market Road" },
  photos: [],
  claimedBy: null,
  dietaryTags: ["Veg"],
  urgencyLevel: "medium" as const,
};

afterEach(() => {
  vi.clearAllMocks();
  authMock.currentUser = { uid: "collector-1" };
});

describe("createListing", () => {
  it("publishes donor and pickup details as an active listing", async () => {
    firestoreMocks.collection.mockReturnValue("listings");
    firestoreMocks.addDoc.mockResolvedValue({ id: "listing-1" });

    const created = await createListing(listingInput);

    expect(created).toMatchObject({
      id: "listing-1",
      ...listingInput,
      status: "active",
      claimedBy: null,
    });
    expect(created.createdAt).toEqual(expect.any(String));
    expect(firestoreMocks.addDoc).toHaveBeenCalledWith("listings", expect.objectContaining({
      donorId: "donor-1",
      donorName: "Community Kitchen",
      address: "12 Market Road",
      location: { lat: 12.9, lng: 77.6, address: "12 Market Road" },
      status: "active",
      claimedBy: null,
    }));
  });

  it("propagates Firestore write failures instead of reporting success", async () => {
    firestoreMocks.collection.mockReturnValue("listings");
    firestoreMocks.addDoc.mockRejectedValue(new Error("permission-denied"));

    await expect(createListing(listingInput)).rejects.toThrow("permission-denied");
  });
});

describe("subscribeToListings", () => {
  it("forwards each real-time listing snapshot to the collector feed", () => {
    let receiveSnapshot: ((snapshot: { docs: { id: string; data: () => object }[] }) => void) | undefined;
    const unsubscribe = vi.fn();
    firestoreMocks.collection.mockReturnValue("listings");
    firestoreMocks.onSnapshot.mockImplementation((_, onNext) => {
      receiveSnapshot = onNext;
      return unsubscribe;
    });
    const onListings = vi.fn();

    const stop = subscribeToListings(onListings);
    receiveSnapshot?.({
      docs: [{ id: "listing-1", data: () => ({ ...listingInput, status: "active" }) }],
    });
    receiveSnapshot?.({
      docs: [{ id: "listing-1", data: () => ({ ...listingInput, status: "active" }) }],
    });

    expect(onListings).toHaveBeenCalledTimes(2);
    expect(onListings).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: "listing-1", donorId: "donor-1" }),
    ]);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("surfaces listener errors without falling back to an unauthorized read", () => {
    const error = new Error("permission-denied");
    const onError = vi.fn();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    firestoreMocks.collection.mockReturnValue("listings");
    firestoreMocks.onSnapshot.mockImplementation((_, __, onFailure) => {
      onFailure(error);
      return vi.fn();
    });

    subscribeToListings(vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith(error);
    expect(firestoreMocks.getDocs).not.toHaveBeenCalled();
    logError.mockRestore();
  });
});

describe("claimListing", () => {
  it("atomically claims a listing, creates a delivery, and creates a volunteer alert", async () => {
    const listingData = {
      ...listingInput,
      status: "active",
      createdAt: "2026-10-20T08:00:00.000Z",
    };
    const transaction = {
      get: vi.fn(async (ref: string) => {
        if (ref === "listings/listing-1") {
          return { id: "listing-1", exists: () => true, data: () => listingData };
        }
        return { exists: () => false };
      }),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    firestoreMocks.doc.mockImplementation((_, collectionName, id) =>
      `${collectionName}/${id}`
    );
    firestoreMocks.runTransaction.mockImplementation(async (_, callback) => callback(transaction));

    await expect(claimListing("listing-1", collector)).resolves.toMatchObject({
      id: "listing-1",
      status: "claimed",
      claimedBy: collector.id,
    });

    expect(transaction.update).toHaveBeenCalledWith("listings/listing-1", {
      status: "claimed",
      claimedBy: collector.id,
    });
    expect(transaction.set).toHaveBeenCalledWith(
      "deliveries/listing_listing-1",
      expect.objectContaining({
        listingId: "listing-1",
        volunteerId: "unassigned",
        status: "assigned",
        pickupAddress: listingInput.address,
      })
    );
    expect(transaction.set).toHaveBeenCalledWith(
      "listingClaims/listing-1",
      expect.objectContaining({
        listingId: "listing-1",
        collectorId: collector.id,
        foodType: listingInput.foodType,
      })
    );
  });

  it("rejects unavailable listings without changing any document", async () => {
    const transaction = {
      get: vi.fn(async (ref: string) => ref === "listings/listing-1"
        ? {
            id: "listing-1",
            exists: () => true,
            data: () => ({ ...listingInput, status: "claimed", claimedBy: "other" }),
          }
        : { exists: () => false }),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    firestoreMocks.doc.mockImplementation((_, collectionName, id) =>
      `${collectionName}/${id}`
    );
    firestoreMocks.runTransaction.mockImplementation(async (_, callback) => callback(transaction));

    await expect(claimListing("listing-1", collector)).rejects.toThrow(
      "This food listing is no longer available."
    );
    expect(transaction.update).not.toHaveBeenCalled();
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it("releases a claim and removes its pending delivery and volunteer alert", async () => {
    const transaction = {
      get: vi.fn(async (ref: string) => {
        if (ref === "listings/listing-1") {
          return {
            exists: () => true,
            data: () => ({ status: "claimed", claimedBy: collector.id }),
          };
        }
        if (ref === "deliveries/listing_listing-1") {
          return {
            exists: () => true,
            data: () => ({ status: "assigned", volunteerId: "unassigned" }),
          };
        }
        return { exists: () => true };
      }),
      update: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    firestoreMocks.doc.mockImplementation((_, collectionName, id) =>
      `${collectionName}/${id}`
    );
    firestoreMocks.runTransaction.mockImplementation(async (_, callback) => callback(transaction));

    await expect(unclaimListing("listing-1")).resolves.toBeUndefined();

    expect(transaction.update).toHaveBeenCalledWith("listings/listing-1", {
      status: "active",
      claimedBy: null,
    });
    expect(transaction.delete).toHaveBeenCalledWith("deliveries/listing_listing-1");
    expect(transaction.delete).toHaveBeenCalledWith("listingClaims/listing-1");
  });
});
