import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Delivery } from "@/types";
import { throwSparkUnavailable } from "@/services/sparkUnavailable";

const COL = "deliveries";

export async function updateDeliveryStatus(
  _id: string,
  _status: Delivery["status"]
): Promise<void> {
  return throwSparkUnavailable("Advancing deliveries");
}

export function subscribeToUnassignedDeliveries(
  callback: (deliveries: Delivery[]) => void
): () => void {
  const q = query(collection(db, COL), where("status", "==", "assigned"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery)));
  });
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