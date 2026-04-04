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
  const docRef = await addDoc(collection(db, COL), {
    ...data,
    status: "active",
    createdAt: new Date().toISOString(),
  });
  return { ...data, id: docRef.id, status: "active", createdAt: new Date().toISOString() };
}

export async function getAllListings(): Promise<FoodListing[]> {
  const snap = await getDocs(
    query(collection(db, COL), orderBy("createdAt", "desc"))
  );
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
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("donorId", "==", donorId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing));
}