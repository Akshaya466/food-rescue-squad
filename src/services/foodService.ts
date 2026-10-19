import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { FoodListing } from "@/types";
import { synchronizeListingAddress } from "@/services/listingUpdate";
import { throwSparkUnavailable } from "@/services/sparkUnavailable";

const COL = "listings";

// Strip undefined values
function clean<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value: unknown) => value === undefined ? null : value)
  ) as T;
}

export async function createListing(
  data: Omit<FoodListing, "id" | "createdAt" | "status">
): Promise<FoodListing> {
  const listing = clean({
    ...data,
    status: "active",
    claimedBy: null,
    createdAt: new Date().toISOString(),
  });
  const docRef = await addDoc(collection(db, COL), listing);
  return { ...listing, id: docRef.id } as FoodListing;
}

export async function getAllListings(): Promise<FoodListing[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing));
}

export async function getListingById(id: string): Promise<FoodListing | undefined> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return undefined;
  return { id: snap.id, ...snap.data() } as FoodListing;
}

export async function updateListing(
  id: string,
  data: Partial<FoodListing>
): Promise<FoodListing> {
  let updates = data;
  if (typeof data.address === "string") {
    const current = await getListingById(id);
    if (!current) throw new Error("Listing not found");
    updates = synchronizeListingAddress(current.location, data);
  }
  await updateDoc(doc(db, COL, id), clean(updates));
  const updated = await getListingById(id);
  if (!updated) throw new Error("Listing not found");
  return updated;
}

export async function deleteListing(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function claimListing(
  _id: string
): Promise<FoodListing> {
  return throwSparkUnavailable("Claiming food");
}

export async function unclaimListing(_id: string): Promise<void> {
  return throwSparkUnavailable("Unclaiming food");
}

export async function getListingsByDonor(donorId: string): Promise<FoodListing[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("donorId", "==", donorId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing));
}

export function subscribeToListings(
  callback: (listings: FoodListing[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(db, COL),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing)));
    },
    (error) => {
      console.error("subscribeToListings error:", error);
      onError?.(error);
    }
  );
}

export function subscribeToListingsByDonor(
  donorId: string,
  callback: (listings: FoodListing[]) => void
): () => void {
  const q = query(collection(db, COL), where("donorId", "==", donorId));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing)));
    },
    (error) => {
      console.error("subscribeToListingsByDonor error:", error);
      // Fallback to one-time fetch on error
      getDocs(q).then((snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing)));
      });
    }
  );
}