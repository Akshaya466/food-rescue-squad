import {
  doc,
  deleteField,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { User, Rating, RatingOpportunity } from "@/types";
import { throwSparkUnavailable } from "@/services/sparkUnavailable";

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
  
}

export async function resolveActiveUserProfile(
  userId: string
): Promise<User | null> {
  return getUserProfile(userId);
}

export async function completeUserRoleSelection(
  userId: string,
  role: Exclude<User["role"], "admin">
): Promise<User> {
  const profile = await getUserProfile(userId);
  if (!profile) throw new Error("User profile not found");
  if (["donor", "collector", "volunteer", "admin"].includes(profile.role)) {
    if (profile.role === role) return profile;
    throw new Error("This account already has a valid role. Its role was not changed.");
  }

  await updateDoc(doc(db, "users", userId), {
    role,
    requestedRole: deleteField(),
  });
  const updatedProfile = await getUserProfile(userId);
  if (!updatedProfile || updatedProfile.role !== role) {
    throw new Error(`Could not save the ${role} role`);
  }
  return updatedProfile;
}

export async function getUserRatings(userId: string): Promise<Rating[]> {
  const snap = await getDocs(
    query(
      collection(db, "ratings"),
      where("toUserId", "==", userId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs
    .filter((d) => d.data().trusted === true)
    .map((d) => ({ id: d.id, ...d.data() } as Rating));
}

export async function submitRating(
  _data: Pick<Rating, "toUserId" | "listingId" | "score" | "review">
): Promise<Rating> {
  return throwSparkUnavailable("Submitting ratings");
}

export async function getRatingOpportunities(): Promise<RatingOpportunity[]> {
  return throwSparkUnavailable("Loading rating opportunities");
}