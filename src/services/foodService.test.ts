import { afterEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/config/firebase", () => ({ db: {} }));

import { claimListing, createListing, subscribeToListings } from "./foodService";
import { SparkUnavailableError } from "./sparkUnavailable";

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
  it("fails closed without a trusted backend and performs no client-side writes", async () => {
    await expect(claimListing("listing-1")).rejects.toBeInstanceOf(
      SparkUnavailableError
    );
    expect(firestoreMocks.addDoc).not.toHaveBeenCalled();
    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });
});
