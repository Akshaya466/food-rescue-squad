import { afterEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/config/firebase", () => ({ db: {} }));

import { subscribeToListingClaims } from "./listingClaimService";

afterEach(() => {
  vi.clearAllMocks();
});

describe("subscribeToListingClaims", () => {
  it("delivers live claim notifications and reports listener failures", () => {
    let receiveSnapshot:
      | ((snapshot: { docs: { id: string; data: () => object }[] }) => void)
      | undefined;
    let reportError: ((error: Error) => void) | undefined;
    const unsubscribe = vi.fn();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    firestoreMocks.collection.mockReturnValue("listingClaims");
    firestoreMocks.orderBy.mockReturnValue("createdAt-desc");
    firestoreMocks.limit.mockReturnValue("limit-20");
    firestoreMocks.query.mockReturnValue("claim-query");
    firestoreMocks.onSnapshot.mockImplementation((_, onNext, onError) => {
      receiveSnapshot = onNext;
      reportError = onError;
      return unsubscribe;
    });
    const onClaims = vi.fn();
    const onError = vi.fn();

    const stop = subscribeToListingClaims(onClaims, onError);
    receiveSnapshot?.({
      docs: [{
        id: "listing-1",
        data: () => ({
          listingId: "listing-1",
          foodType: "Vegetables",
          pickupAddress: "12 Market Road",
        }),
      }],
    });
    const error = new Error("permission-denied");
    reportError?.(error);

    expect(onClaims).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "listing-1",
        listingId: "listing-1",
        pickupAddress: "12 Market Road",
      }),
    ]);
    expect(onError).toHaveBeenCalledWith(error);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
    logError.mockRestore();
  });
});
