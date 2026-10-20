import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  runTransaction,
  where,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { FoodListing, User } from "@/types";
import { synchronizeListingAddress } from "@/services/listingUpdate";

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
  listingId: string,
  collector: User
): Promise<FoodListing> {
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== collector.id || collector.role !== "collector") {
    throw new Error("An authenticated collector is required to claim food.");
  }

  const listingRef = doc(db, COL, listingId);
  const deliveryRef = doc(db, "deliveries", `listing_${listingId}`);
  const claimRef = doc(db, "listingClaims", listingId);
  const createdAt = new Date().toISOString();

  return runTransaction(db, async (transaction) => {
    const [listingSnapshot, deliverySnapshot, claimSnapshot] = await Promise.all([
      transaction.get(listingRef),
      transaction.get(deliveryRef),
      transaction.get(claimRef),
    ]);
    if (!listingSnapshot.exists()) throw new Error("Food listing was not found.");

    const listing = { id: listingSnapshot.id, ...listingSnapshot.data() } as FoodListing;
    if (listing.status !== "active" || listing.claimedBy) {
      throw new Error("This food listing is no longer available.");
    }
    if (deliverySnapshot.exists() || claimSnapshot.exists()) {
      throw new Error("This food listing already has an active claim.");
    }

    const distanceKm = calculateDistanceKm(listing.location, collector.location);
    transaction.update(listingRef, { status: "claimed", claimedBy: uid });
    transaction.set(deliveryRef, {
      listingId,
      volunteerId: "unassigned",
      donorId: listing.donorId,
      status: "assigned",
      pickupAddress: listing.address,
      dropAddress: collector.location.address || "NGO Location",
      estimatedTime: "30 mins",
      distanceKm,
      foodDetails: listing.foodType,
      createdAt,
    });
    transaction.set(claimRef, {
      listingId,
      collectorId: uid,
      collectorName: collector.name,
      donorId: listing.donorId,
      dropAddress: collector.location.address || "NGO Location",
      foodType: listing.foodType,
      description: listing.description,
      quantity: listing.quantity,
      unit: listing.unit,
      pickupAddress: listing.address,
      pickupWindowStart: listing.pickupWindowStart,
      pickupWindowEnd: listing.pickupWindowEnd,
      createdAt,
    });

    return { ...listing, status: "claimed", claimedBy: uid };
  });
}

function calculateDistanceKm(
  from: FoodListing["location"],
  to: User["location"]
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const factor =
    Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(from.lat))
    * Math.cos(radians(to.lat))
    * Math.sin(lngDelta / 2) ** 2;
  const bounded = Math.max(0, Math.min(1, factor));
  return Math.round(
    6371 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded)) * 10
  ) / 10;
}

export async function unclaimListing(listingId: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in to release this food listing.");

  const listingRef = doc(db, COL, listingId);
  const deliveryRef = doc(db, "deliveries", `listing_${listingId}`);
  const claimRef = doc(db, "listingClaims", listingId);

  await runTransaction(db, async (transaction) => {
    const [listingSnapshot, deliverySnapshot, claimSnapshot] = await Promise.all([
      transaction.get(listingRef),
      transaction.get(deliveryRef),
      transaction.get(claimRef),
    ]);
    if (!listingSnapshot.exists()) throw new Error("Food listing was not found.");
    if (listingSnapshot.data().status !== "claimed"
      || listingSnapshot.data().claimedBy !== uid) {
      throw new Error("You do not own this food claim.");
    }
    if (!deliverySnapshot.exists()
      || deliverySnapshot.data().status !== "assigned"
      || deliverySnapshot.data().volunteerId !== "unassigned"
      || !claimSnapshot.exists()) {
      throw new Error("This food can no longer be released because delivery has started.");
    }

    transaction.update(listingRef, { status: "active", claimedBy: null });
    transaction.delete(deliveryRef);
    transaction.delete(claimRef);
  });
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