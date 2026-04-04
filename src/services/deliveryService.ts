import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Delivery } from "@/types";

const COL = "deliveries";

export async function createDelivery(
  data: Omit<Delivery, "id" | "createdAt">
): Promise<Delivery> {
  const docRef = await addDoc(collection(db, COL), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return { ...data, id: docRef.id, createdAt: new Date().toISOString() };
}

export async function getActiveDeliveries(volunteerId: string): Promise<Delivery[]> {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("volunteerId", "==", volunteerId),
      where("status", "!=", "delivered")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery));
}

export async function getUnassignedDeliveries(): Promise<Delivery[]> {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("status", "==", "assigned")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery));
}

export async function getDeliveryHistory(volunteerId: string): Promise<Delivery[]> {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("volunteerId", "==", volunteerId),
      where("status", "==", "delivered")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Delivery));
}

export async function updateDeliveryStatus(
  id: string,
  status: Delivery["status"]
): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}