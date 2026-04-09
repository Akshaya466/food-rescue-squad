import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Delivery } from "@/types";

const COL = "deliveries";

export async function createDelivery(
  data: Omit<Delivery, "id" | "createdAt">
): Promise<Delivery> {
  const clean = JSON.parse(JSON.stringify({
    ...data,
    createdAt: new Date().toISOString(),
  }));
  const docRef = await addDoc(collection(db, COL), clean);
  return { ...clean, id: docRef.id };
}

export async function updateDeliveryStatus(
  id: string,
  status: Delivery["status"],
  volunteerId?: string
): Promise<void> {
  const update: any = { status };
  if (volunteerId) update.volunteerId = volunteerId;
  await updateDoc(doc(db, COL, id), update);
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