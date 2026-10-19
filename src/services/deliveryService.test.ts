import { afterEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/config/firebase", () => ({ db: {} }));

import { subscribeToUnassignedDeliveries } from "./deliveryService";

afterEach(() => {
  vi.clearAllMocks();
});

describe("subscribeToUnassignedDeliveries", () => {
  it("forwards authorized delivery snapshots to the dashboard", () => {
    let receiveSnapshot:
      | ((snapshot: { docs: { id: string; data: () => object }[] }) => void)
      | undefined;
    const unsubscribe = vi.fn();
    firestoreMocks.collection.mockReturnValue("deliveries");
    firestoreMocks.where.mockReturnValue("assigned-status");
    firestoreMocks.query.mockReturnValue("assigned-deliveries");
    firestoreMocks.onSnapshot.mockImplementation((_, onNext) => {
      receiveSnapshot = onNext;
      return unsubscribe;
    });
    const onDeliveries = vi.fn();

    const stop = subscribeToUnassignedDeliveries(onDeliveries);
    receiveSnapshot?.({
      docs: [
        {
          id: "delivery-1",
          data: () => ({ listingId: "listing-1", status: "assigned" }),
        },
      ],
    });

    expect(onDeliveries).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "delivery-1",
        listingId: "listing-1",
        status: "assigned",
      }),
    ]);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("reports real-time listener failures instead of showing success-shaped empty data", () => {
    const error = new Error("permission-denied");
    const onError = vi.fn();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    firestoreMocks.collection.mockReturnValue("deliveries");
    firestoreMocks.where.mockReturnValue("assigned-status");
    firestoreMocks.query.mockReturnValue("assigned-deliveries");
    firestoreMocks.onSnapshot.mockImplementation((_, __, onFailure) => {
      onFailure(error);
      return vi.fn();
    });

    subscribeToUnassignedDeliveries(vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith(error);
    logError.mockRestore();
  });
});
