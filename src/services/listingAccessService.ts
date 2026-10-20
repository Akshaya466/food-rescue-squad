import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { FoodListing, User } from "@/types";

export interface ListingAccessEvent {
  id: string;
  collectorId: string;
  collectorName: string;
  listingId: string;
  foodType: string;
  description: string;
  quantity: number;
  unit: FoodListing["unit"];
  address: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
}

const COLLECTION = "listingAccessEvents";

export async function recordListingAccess(
  listing: FoodListing,
  collector: User
): Promise<boolean> {
  if (
    !auth.currentUser
    || auth.currentUser.uid !== collector.id
    || collector.role !== "collector"
  ) {
    throw new Error("An authenticated collector is required to report listing access.");
  }

  const eventRef = doc(db, COLLECTION, `${listing.id}_${collector.id}`);
  const existingEvent = await getDoc(eventRef);
  if (existingEvent.exists()) return false;

  await setDoc(eventRef, {
    collectorId: collector.id,
    collectorName: collector.name,
    listingId: listing.id,
    foodType: listing.foodType,
    description: listing.description,
    quantity: listing.quantity,
    unit: listing.unit,
    address: listing.address,
    pickupWindowStart: listing.pickupWindowStart,
    pickupWindowEnd: listing.pickupWindowEnd,
    createdAt: serverTimestamp(),
  });
  return true;
}

export function subscribeToListingAccessEvents(
  callback: (events: ListingAccessEvent[]) => void,
  onError?: (error: Error) => void
): () => void {
  const eventsQuery = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
      } as ListingAccessEvent)));
    },
    (error) => {
      console.error("subscribeToListingAccessEvents error:", error);
      onError?.(error);
    }
  );
}
