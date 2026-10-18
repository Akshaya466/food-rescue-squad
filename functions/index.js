const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const {
  eligibleRatingTargets,
  hasExistingRatingRelationship,
  ratingDocumentId,
} = require("./ratingEligibility");

initializeApp();
const db = getFirestore();

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in is required.");
  }
  return request.auth.uid;
}

async function requireRole(uid, role) {
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists || user.get("role") !== role) {
    throw new HttpsError("permission-denied", `A ${role} account is required.`);
  }
  return user;
}

function listingDeliveryId(listingId) {
  return `listing_${listingId}`;
}

function distanceKm(from, to) {
  const validPoint = (point) => point
    && Number.isFinite(point.lat)
    && point.lat >= -90
    && point.lat <= 90
    && Number.isFinite(point.lng)
    && point.lng >= -180
    && point.lng <= 180;
  if (!validPoint(from) || !validPoint(to)) {
    throw new HttpsError("failed-precondition", "A valid listing and collector location are required.");
  }
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(from.lat))
    * Math.cos(radians(to.lat))
    * Math.sin(lngDelta / 2) ** 2;
  const bounded = Math.max(0, Math.min(1, a));
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded)) * 10) / 10;
}

exports.claimListing = onCall(async (request) => {
  const uid = requireAuth(request);
  const user = await requireRole(uid, "collector");
  const listingId = request.data?.listingId;
  if (typeof listingId !== "string"
    || !listingId
    || listingId.length > 128
    || listingId.includes("/")) {
    throw new HttpsError("invalid-argument", "A listing ID is required.");
  }

  const listingRef = db.doc(`listings/${listingId}`);
  const deliveryRef = db.doc(`deliveries/${listingDeliveryId(listingId)}`);
  const notificationRef = db.collection("notifications").doc();

  await db.runTransaction(async (transaction) => {
    const [listing, delivery] = await Promise.all([
      transaction.get(listingRef),
      transaction.get(deliveryRef),
    ]);
    if (!listing.exists
      || listing.get("status") !== "active"
      || listing.get("claimedBy") !== null) {
      throw new HttpsError("failed-precondition", "This listing is no longer available.");
    }
    if (delivery.exists) {
      throw new HttpsError("already-exists", "This listing already has a claim workflow.");
    }

    const data = listing.data();
    const donor = await transaction.get(db.doc(`users/${data.donorId}`));
    if (!donor.exists) {
      throw new HttpsError("failed-precondition", "The listing donor profile is missing.");
    }

    const createdAt = new Date().toISOString();
    transaction.update(listingRef, { status: "claimed", claimedBy: uid });
    transaction.create(deliveryRef, {
      listingId,
      volunteerId: "unassigned",
      donorId: data.donorId,
      status: "assigned",
      pickupAddress: data.address,
      dropAddress: user.get("location")?.address || "NGO Location",
      estimatedTime: "30 mins",
      distanceKm: distanceKm(data.location, user.get("location")),
      foodDetails: `${data.foodType} — ${data.quantity} ${data.unit}`,
      createdAt,
    });
    transaction.create(notificationRef, {
      userId: data.donorId,
      type: "claim",
      title: "Food Claimed!",
      message: `${user.get("name")} claimed your ${data.foodType} listing.`,
      isRead: false,
      createdAt,
    });
  });

  return { listingId };
});

exports.unclaimListing = onCall(async (request) => {
  const uid = requireAuth(request);
  await requireRole(uid, "collector");
  const listingId = request.data?.listingId;
  if (typeof listingId !== "string"
    || !listingId
    || listingId.length > 128
    || listingId.includes("/")) {
    throw new HttpsError("invalid-argument", "A listing ID is required.");
  }

  const listingRef = db.doc(`listings/${listingId}`);
  const deliveryRef = db.doc(`deliveries/${listingDeliveryId(listingId)}`);

  await db.runTransaction(async (transaction) => {
    const [listing, delivery] = await Promise.all([
      transaction.get(listingRef),
      transaction.get(deliveryRef),
    ]);
    if (!listing.exists
      || listing.get("status") !== "claimed"
      || listing.get("claimedBy") !== uid) {
      throw new HttpsError("failed-precondition", "You do not own this active claim.");
    }
    if (!delivery.exists
      || delivery.get("status") !== "assigned"
      || delivery.get("volunteerId") !== "unassigned") {
      throw new HttpsError("failed-precondition", "A volunteer has started this delivery.");
    }

    transaction.update(listingRef, { status: "active", claimedBy: null });
    transaction.delete(deliveryRef);
  });

  return { listingId };
});

exports.advanceDelivery = onCall(async (request) => {
  const uid = requireAuth(request);
  await requireRole(uid, "volunteer");
  const { deliveryId, status } = request.data || {};
  if (typeof deliveryId !== "string"
    || !["en_route", "picked_up", "delivered"].includes(status)) {
    throw new HttpsError("invalid-argument", "Delivery status update is invalid.");
  }

  const deliveryRef = db.doc(`deliveries/${deliveryId}`);
  await db.runTransaction(async (transaction) => {
    const delivery = await transaction.get(deliveryRef);
    if (!delivery.exists) {
      throw new HttpsError("not-found", "Delivery does not exist.");
    }
    const listingId = delivery.get("listingId");
    if (typeof listingId !== "string"
      || deliveryRef.id !== listingDeliveryId(listingId)) {
      throw new HttpsError("failed-precondition", "Delivery is not linked to a trusted claim workflow.");
    }
    const listingRef = db.doc(`listings/${listingId}`);
    const listing = await transaction.get(listingRef);
    if (!listing.exists
      || listing.get("status") !== "claimed"
      || typeof listing.get("claimedBy") !== "string"
      || listing.get("donorId") !== delivery.get("donorId")) {
      throw new HttpsError("failed-precondition", "The delivery's listing is no longer active.");
    }

    const currentStatus = delivery.get("status");
    const currentVolunteerId = delivery.get("volunteerId");
    const validTransition = (
      currentStatus === "assigned"
      && currentVolunteerId === "unassigned"
      && status === "en_route"
    ) || (
      currentVolunteerId === uid
      && (
        (currentStatus === "en_route" && status === "picked_up")
        || (currentStatus === "picked_up" && status === "delivered")
      )
    );
    if (!validTransition) {
      throw new HttpsError("failed-precondition", "This delivery cannot make that status transition.");
    }

    let donor;
    if (status === "delivered") {
      const donorRef = db.doc(`users/${delivery.get("donorId")}`);
      donor = await transaction.get(donorRef);
      if (!donor.exists || typeof donor.get("totalRescues") !== "number") {
        throw new HttpsError("failed-precondition", "The listing or donor is no longer available.");
      }
    }

    transaction.update(deliveryRef, {
      status,
      volunteerId: uid,
    });
    if (status === "delivered") {
      const donorRef = db.doc(`users/${delivery.get("donorId")}`);
      transaction.update(listingRef, { status: "delivered" });
      transaction.update(donorRef, {
        totalRescues: (donor.get("totalRescues") || 0) + 1,
      });
    }
  });

  return { deliveryId, status, volunteerId: uid };
});

exports.approveRoleRequest = onCall(async (request) => {
  requireAuth(request);
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "An administrator account is required.");
  }

  const userId = request.data?.userId;
  if (typeof userId !== "string"
    || !userId
    || userId.length > 128
    || userId.includes("/")) {
    throw new HttpsError("invalid-argument", "A user ID is required.");
  }
  const userRef = db.doc(`users/${userId}`);
  await db.runTransaction(async (transaction) => {
    const user = await transaction.get(userRef);
    if (!user.exists) {
      throw new HttpsError("not-found", "The user profile does not exist.");
    }
    const requestedRole = user.get("requestedRole");
    if (!["collector", "volunteer"].includes(requestedRole)) {
      throw new HttpsError("failed-precondition", "No elevated role request is pending.");
    }
    transaction.update(userRef, {
      role: requestedRole,
      requestedRole: FieldValue.delete(),
    });
  });

  return { userId };
});

exports.setUserVerification = onCall(async (request) => {
  requireAuth(request);
  if (request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "An administrator account is required.");
  }

  const { userId, isVerified } = request.data || {};
  if (typeof userId !== "string"
    || !userId
    || userId.length > 128
    || userId.includes("/")
    || typeof isVerified !== "boolean") {
    throw new HttpsError("invalid-argument", "A user ID and verification state are required.");
  }

  const userRef = db.doc(`users/${userId}`);
  await db.runTransaction(async (transaction) => {
    const user = await transaction.get(userRef);
    if (!user.exists) {
      throw new HttpsError("not-found", "The user profile does not exist.");
    }
    transaction.update(userRef, { isVerified });
  });

  return { userId, isVerified };
});

exports.submitRating = onCall(async (request) => {
  const uid = requireAuth(request);
  const { listingId, toUserId, score, review = "" } = request.data || {};
  if (typeof listingId !== "string"
    || !listingId
    || listingId.length > 128
    || listingId.includes("/")
    || typeof toUserId !== "string"
    || !toUserId
    || toUserId.length > 128
    || toUserId.includes("/")
    || !Number.isInteger(score)
    || score < 1
    || score > 5
    || typeof review !== "string"
    || review.length > 2000) {
    throw new HttpsError("invalid-argument", "Rating details are invalid.");
  }
  if (toUserId === uid) {
    throw new HttpsError("invalid-argument", "Self-ratings are not allowed.");
  }

  const listingRef = db.doc(`listings/${listingId}`);
  const deliveryRef = db.doc(`deliveries/${listingDeliveryId(listingId)}`);
  const targetRef = db.doc(`users/${toUserId}`);
  const actorRef = db.doc(`users/${uid}`);
  const ratingId = ratingDocumentId(listingId, uid, toUserId);
  const ratingRef = db.doc(`ratings/${ratingId}`);
  const result = await db.runTransaction(async (transaction) => {
    const [listing, delivery, target, existing, actor] = await Promise.all([
      transaction.get(listingRef),
      transaction.get(deliveryRef),
      transaction.get(targetRef),
      transaction.get(ratingRef),
      transaction.get(actorRef),
    ]);
    if (!listing.exists
      || !delivery.exists
      || delivery.get("status") !== "delivered"
      || listing.get("status") !== "delivered"
      || delivery.get("donorId") !== listing.get("donorId")
      || !target.exists
      || !actor.exists
      || existing.exists) {
      throw new HttpsError("failed-precondition", "This rating is not eligible or was already submitted.");
    }

    const ratingListing = { ...listing.data(), id: listingId };
    if (!eligibleRatingTargets(
      actor.get("role"),
      uid,
      ratingListing,
      delivery.data()
    ).includes(toUserId)) {
      throw new HttpsError("permission-denied", "You are not a participant in this completed delivery.");
    }

    const previousRatings = await transaction.get(
      db.collection("ratings").where("toUserId", "==", toUserId)
    );
    if (hasExistingRatingRelationship(
      previousRatings.docs.map((rating) => rating.data()),
      listingId,
      uid,
      toUserId
    )) {
      throw new HttpsError("already-exists", "A rating for this relationship already exists.");
    }
    const trustedRatings = previousRatings.docs.filter(
      (rating) => rating.get("trusted") === true
    );
    const total = trustedRatings.reduce(
      (sum, rating) => sum + rating.get("score"),
      score
    );
    const count = trustedRatings.length + 1;
    transaction.create(ratingRef, {
      fromUserId: uid,
      toUserId,
      listingId,
      score,
      review,
      trusted: true,
      createdAt: new Date().toISOString(),
    });
    transaction.update(targetRef, {
      trustScore: Math.round((total / count) * 10) / 10,
    });
    return { ratingId: ratingRef.id };
  });
  return result;
});

exports.getRatingOpportunities = onCall(async (request) => {
  const uid = requireAuth(request);
  const actor = await db.doc(`users/${uid}`).get();
  if (!actor.exists
    || !["donor", "collector", "volunteer"].includes(actor.get("role"))) {
    throw new HttpsError("permission-denied", "A donor, collector, or volunteer account is required.");
  }
  const role = actor.get("role");
  let listings = [];

  if (role === "donor") {
    const ownedListings = await db.collection("listings")
      .where("donorId", "==", uid)
      .get();
    listings = ownedListings.docs;
  } else if (role === "collector") {
    const claimedListings = await db.collection("listings")
      .where("claimedBy", "==", uid)
      .get();
    listings = claimedListings.docs;
  } else {
    const volunteerDeliveries = await db.collection("deliveries")
      .where("volunteerId", "==", uid)
      .get();
    const listingIds = [...new Set(volunteerDeliveries.docs
      .filter((delivery) => delivery.get("status") === "delivered")
      .map((delivery) => delivery.get("listingId"))
      .filter((listingId) => typeof listingId === "string"))];
    const listingSnapshots = await Promise.all(
      listingIds.map((listingId) => db.doc(`listings/${listingId}`).get())
    );
    listings = listingSnapshots.filter((listing) => listing.exists);
  }

  const ratingOpportunities = [];
  for (const listingSnapshot of listings) {
    const listing = { ...listingSnapshot.data(), id: listingSnapshot.id };
    if (listing.status !== "delivered") continue;

    let deliverySnapshot = await db.doc(`deliveries/${listingDeliveryId(listing.id)}`).get();
    if (!deliverySnapshot.exists) {
      const legacyDeliveries = await db.collection("deliveries")
        .where("listingId", "==", listing.id)
        .get();
      if (legacyDeliveries.size !== 1) continue;
      [deliverySnapshot] = legacyDeliveries.docs;
    }
    const delivery = deliverySnapshot.data();
    const targetIds = eligibleRatingTargets(role, uid, listing, delivery);
    if (!targetIds.length) continue;

    const participants = [];
    for (const targetId of targetIds) {
      const existingRating = await db.doc(
        `ratings/${ratingDocumentId(listing.id, uid, targetId)}`
      ).get();
      if (existingRating.exists) continue;
      const participant = await db.doc(`users/${targetId}`).get();
      if (!participant.exists) continue;
      const participantRole = participant.get("role");
      if (!["donor", "collector", "volunteer", "admin"].includes(participantRole)) {
        continue;
      }
      participants.push({
        userId: targetId,
        name: participant.get("name") || "Participant",
        role: participantRole,
      });
    }
    if (participants.length) {
      ratingOpportunities.push({
        listingId: listing.id,
        foodDetails: delivery.foodDetails || listing.foodType || "Completed food delivery",
        participants,
      });
    }
  }

  return { opportunities: ratingOpportunities };
});
