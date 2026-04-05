import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { User, Rating } from "@/types";

export async function getUserProfile(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<User>
): Promise<void> {
  await updateDoc(doc(db, "users", userId), data);
  // Update localStorage too
  const stored = localStorage.getItem("Annora_user");
  if (stored) {
    const user = JSON.parse(stored);
    localStorage.setItem("Annora_user", JSON.stringify({ ...user, ...data }));
  }
}

export async function getUserRatings(userId: string): Promise<Rating[]> {
  const snap = await getDocs(
    query(
      collection(db, "ratings"),
      where("toUserId", "==", userId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rating));
}

export async function submitRating(data: Omit<Rating, "id">): Promise<Rating> {
  const docRef = await addDoc(collection(db, "ratings"), data);

  // Update user trust score
  const ratings = await getUserRatings(data.toUserId);
  const avg = ratings.reduce((s, r) => s + r.score, data.score) / (ratings.length + 1);
  await updateDoc(doc(db, "users", data.toUserId), { trustScore: Math.round(avg * 10) / 10 });

  return { ...data, id: docRef.id };
}