import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { Delivery } from "@/types";

const COL = "deliveries";

export async function updateDeliveryStatus(
  id: string,
  status: Delivery["status"]
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid || !["en_route", "picked_up", "delivered"].includes(status)) {
    throw new Error("A signed-in delivery volunteer is required.");
  }

  const deliveryRef = doc(db, COL, id);
  await runTransaction(db, async (transaction) => {
    const deliverySnapshot = await transaction.get(deliveryRef);
    if (!deliverySnapshot.exists()) throw new Error("Delivery assignment was not found.");

    const delivery = deliverySnapshot.data() as Delivery;
    const isStarting = delivery.status === "assigned"
      && delivery.volunteerId === "unassigned"
      && status === "en_route";
    const isContinuing = delivery.volunteerId === uid && (
      (delivery.status === "en_route" && status === "picked_up")
      || (delivery.status === "picked_up" && status === "delivered")
    );
    if (!isStarting && !isContinuing) {
      throw new Error("This delivery cannot make that status change.");
    }

    transaction.update(deliveryRef, {
      status,
      volunteerId: uid,
    });
    if (status === "delivered") {
      const listingRef = doc(db, "listings", delivery.listingId);
      transaction.update(listingRef, { status: "delivered" });
    }
  });
}

export function subscribeToVolunteerDeliveries(
  volunteerId: string,
  callback: (deliveries: Delivery[]) => void,
  onError?: (error: Error) => void
): () => void {
  let unassigned: Delivery[] = [];
  let owned: Delivery[] = [];
  let unassignedReady = false;
  let ownedReady = false;
  const publish = () => {
    if (!unassignedReady || !ownedReady) return;
    const merged = new Map<string, Delivery>();
    [...unassigned, ...owned].forEach((delivery) => merged.set(delivery.id, delivery));
    callback([...merged.values()].filter((delivery) => delivery.status !== "delivered"));
  };

  const unassignedQuery = query(
    collection(db, COL),
    where("status", "==", "assigned")
  );
  const ownedQuery = query(
    collection(db, COL),
    where("volunteerId", "==", volunteerId)
  );
  const unsubscribeUnassigned = onSnapshot(
    unassignedQuery,
    (snapshot) => {
      unassigned = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery));
      unassignedReady = true;
      publish();
    },
    (error) => {
      console.error("subscribeToVolunteerDeliveries (unassigned) error:", error);
      onError?.(error);
    }
  );
  const unsubscribeOwned = onSnapshot(
    ownedQuery,
    (snapshot) => {
      owned = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery));
      ownedReady = true;
      publish();
    },
    (error) => {
      console.error("subscribeToVolunteerDeliveries (owned) error:", error);
      onError?.(error);
    }
  );
  return () => {
    unsubscribeUnassigned();
    unsubscribeOwned();
  };
}

export function subscribeToDeliveryHistory(
  volunteerId: string,
  callback: (deliveries: Delivery[]) => void
): () => void {
  const q = query(
    collection(db, COL),
    where("volunteerId", "==", volunteerId),
    where("status", "==", "delivered")
  );
  return onSnapshot(q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery)));
    },
    () => {
      // Fallback without compound query
      const q2 = query(collection(db, COL), where("volunteerId", "==", volunteerId));
      getDocs(q2).then((snap) => {
        callback(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Delivery))
            .filter((d) => d.status === "delivered")
        );
      });
    }
  );
}

export async function getUnassignedDeliveries(): Promise<Delivery[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("status", "==", "assigned"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery));
}

export async function getDeliveryHistory(volunteerId: string): Promise<Delivery[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("volunteerId", "==", volunteerId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Delivery))
    .filter((d) => d.status === "delivered");
}