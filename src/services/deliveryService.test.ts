import { afterEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(),
  where: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  currentUser: { uid: "volunteer-1" } as { uid: string } | null,
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/config/firebase", () => ({ db: {}, auth: authMock }));

import {
  subscribeToVolunteerDeliveries,
  updateDeliveryStatus,
} from "./deliveryService";

afterEach(() => {
  vi.clearAllMocks();
  authMock.currentUser = { uid: "volunteer-1" };
});

describe("subscribeToVolunteerDeliveries", () => {
  it("merges unassigned deliveries and the volunteer's own work", () => {
    const snapshotHandlers: ((snapshot: { docs: { id: string; data: () => object }[] }) => void)[] = [];
    const unsubscribeUnassigned = vi.fn();
    const unsubscribeOwned = vi.fn();
    firestoreMocks.collection.mockReturnValue("deliveries");
    firestoreMocks.where.mockReturnValue("filter");
    firestoreMocks.query.mockReturnValueOnce("unassigned-query").mockReturnValueOnce("owned-query");
    firestoreMocks.onSnapshot
      .mockImplementationOnce((_, onNext) => {
        snapshotHandlers.push(onNext);
        return unsubscribeUnassigned;
      })
      .mockImplementationOnce((_, onNext) => {
        snapshotHandlers.push(onNext);
        return unsubscribeOwned;
      });
    const onDeliveries = vi.fn();

    const stop = subscribeToVolunteerDeliveries("volunteer-1", onDeliveries);
    snapshotHandlers[0]({
      docs: [{
        id: "delivery-unassigned",
        data: () => ({ status: "assigned", volunteerId: "unassigned" }),
      }],
    });
    snapshotHandlers[1]({
      docs: [{
        id: "delivery-owned",
        data: () => ({ status: "en_route", volunteerId: "volunteer-1" }),
      }],
    });

    expect(onDeliveries).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: "delivery-unassigned", status: "assigned" }),
      expect.objectContaining({ id: "delivery-owned", status: "en_route" }),
    ]);
    stop();
    expect(unsubscribeUnassigned).toHaveBeenCalledOnce();
    expect(unsubscribeOwned).toHaveBeenCalledOnce();
  });

  it("reports listener failures", () => {
    const error = new Error("permission-denied");
    const onError = vi.fn();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    firestoreMocks.collection.mockReturnValue("deliveries");
    firestoreMocks.where.mockReturnValue("filter");
    firestoreMocks.query.mockReturnValue("query");
    firestoreMocks.onSnapshot.mockImplementation((_, __, onFailure) => {
      onFailure(error);
      return vi.fn();
    });

    subscribeToVolunteerDeliveries("volunteer-1", vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(error);
    logError.mockRestore();
  });
});

describe("updateDeliveryStatus", () => {
  it("marks the delivery and its listing delivered in one transaction", async () => {
    const transaction = {
      get: vi.fn(async (reference: string) => {
        if (reference === "deliveries/listing_listing-1") {
          return {
            exists: () => true,
            data: () => ({
              listingId: "listing-1",
              status: "picked_up",
              volunteerId: "volunteer-1",
            }),
          };
        }
        return {
          exists: () => true,
          data: () => ({ status: "claimed" }),
        };
      }),
      update: vi.fn(),
    };
    firestoreMocks.doc.mockImplementation((_, collectionName, id) =>
      `${collectionName}/${id}`
    );
    firestoreMocks.runTransaction.mockImplementation(async (_, callback) => callback(transaction));

    await expect(
      updateDeliveryStatus("listing_listing-1", "delivered")
    ).resolves.toBeUndefined();

    expect(transaction.update).toHaveBeenCalledWith(
      "deliveries/listing_listing-1",
      { status: "delivered", volunteerId: "volunteer-1" }
    );
    expect(transaction.update).toHaveBeenCalledWith(
      "listings/listing-1",
      { status: "delivered" }
    );
  });

  it("rejects invalid delivery transitions without writing", async () => {
    const transaction = {
      get: vi.fn(async () => ({
        exists: () => true,
        data: () => ({
          listingId: "listing-1",
          status: "assigned",
          volunteerId: "another-volunteer",
        }),
      })),
      update: vi.fn(),
    };
    firestoreMocks.doc.mockImplementation((_, collectionName, id) =>
      `${collectionName}/${id}`
    );
    firestoreMocks.runTransaction.mockImplementation(async (_, callback) => callback(transaction));

    await expect(
      updateDeliveryStatus("listing_listing-1", "delivered")
    ).rejects.toThrow("This delivery cannot make that status change.");
    expect(transaction.update).not.toHaveBeenCalled();
  });
});
