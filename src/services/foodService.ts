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
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { FoodListing } from "@/types";

const COL = "listings";

export async function createListing(
  data: Omit<FoodListing, "id" | "createdAt" | "status">
): Promise<FoodListing> {
  const listing = {
    ...data,
    status: "active",
    claimedBy: data.claimedBy ?? null, // ← undefined → null
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, COL), listing);
  return { ...listing, id: docRef.id } as FoodListing;
}

export async function getAllListings(): Promise<FoodListing[]> {
  try {
    const snap = await getDocs(
      query(collection(db, COL), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing));
  } catch {
    // Fallback without orderBy while index is building
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing));
  }
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
  await updateDoc(doc(db, COL, id), data);
  const updated = await getListingById(id);
  if (!updated) throw new Error("Listing not found");
  return updated;
}

export async function deleteListing(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function claimListing(
  id: string,
  collectorId: string
): Promise<FoodListing> {
  return updateListing(id, { status: "claimed", claimedBy: collectorId });
}

export async function getListingsByDonor(donorId: string): Promise<FoodListing[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, COL),
        where("donorId", "==", donorId),
        orderBy("createdAt", "desc")
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing));
  } catch {
    // Fallback without orderBy while index is building
    const snap = await getDocs(
      query(collection(db, COL), where("donorId", "==", donorId))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing));
  }
}