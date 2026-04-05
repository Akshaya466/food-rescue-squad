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
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { FoodListing } from "@/types";

const COL = "listings";

export async function createListing(
  data: Omit<FoodListing, "id" | "createdAt" | "status">
): Promise<FoodListing> {
  const clean = JSON.parse(JSON.stringify({
    ...data,
    status: "active",
    claimedBy: data.claimedBy ?? null,
    createdAt: new Date().toISOString(),
  }));
  const docRef = await addDoc(collection(db, COL), clean);
  return { ...clean, id: docRef.id } as FoodListing;
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
  const clean = JSON.parse(JSON.stringify(data));
  await updateDoc(doc(db, COL, id), clean);
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
    query(collection(db, COL), where("donorId", "==", donorId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing));
}

export function subscribeToListings(
  callback: (listings: FoodListing[]) => void
): () => void {
  return onSnapshot(collection(db, COL), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing)));
  });
}

export function subscribeToListingsByDonor(
  donorId: string,
  callback: (listings: FoodListing[]) => void
): () => void {
  const q = query(collection(db, COL), where("donorId", "==", donorId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodListing)));
  });
}