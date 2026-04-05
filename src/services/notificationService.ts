import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Notification } from "@/types";

const COL = "notifications";

export async function createNotification(
  data: Omit<Notification, "id">
): Promise<void> {
  await addDoc(collection(db, COL), data);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, COL), where("userId", "==", userId), where("isRead", "==", false))
  );
  const updates = snap.docs.map((d) => updateDoc(doc(db, COL, d.id), { isRead: true }));
  await Promise.all(updates);
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, COL),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
    callback(notifications);
  });
}