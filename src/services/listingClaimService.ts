import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { FoodListing } from "@/types";

export interface ListingClaimNotification {
  id: string;
  listingId: string;
  collectorId: string;
  collectorName: string;
  donorId: string;
  foodType: string;
  description: string;
  quantity: number;
  unit: FoodListing["unit"];
  pickupAddress: string;
  dropAddress: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  createdAt: string;
}

export function subscribeToListingClaims(
  callback: (claims: ListingClaimNotification[]) => void,
  onError?: (error: Error) => void
): () => void {
  const claimsQuery = query(
    collection(db, "listingClaims"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(
    claimsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((claim) => ({
        id: claim.id,
        ...claim.data(),
      } as ListingClaimNotification)));
    },
    (error) => {
      console.error("subscribeToListingClaims error:", error);
      onError?.(error);
    }
  );
}
