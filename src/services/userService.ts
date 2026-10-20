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
  const profile = await getUserProfile(userId);
  if (
    profile?.role === "donor" &&
    profile.requestedRole === "collector"
  ) {
    return selectUserRole(userId, "collector");
  }
  return profile;
}

export async function selectUserRole(
  userId: string,
  role: Exclude<User["role"], "admin">
): Promise<User> {
  const profile = await getUserProfile(userId);
  if (!profile) throw new Error("User profile not found");
  if (profile.role !== "donor") return profile;

  if (role === "collector") {
    if (profile.requestedRole !== "collector") {
      await updateUserProfile(userId, { requestedRole: "collector" });
    }
    await updateDoc(doc(db, "users", userId), {
      role: "collector",
      requestedRole: deleteField(),
    });
  } else if (role === "volunteer") {
    await updateUserProfile(userId, { requestedRole: "volunteer" });
    return (await getUserProfile(userId)) || profile;
  } else {
    if (profile.requestedRole) {
      await updateDoc(doc(db, "users", userId), {
        requestedRole: deleteField(),
      });
    }
  }

  const updatedProfile = await getUserProfile(userId);
  if (!updatedProfile || updatedProfile.role !== role) {
    throw new Error(`Could not activate the ${role} role`);
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