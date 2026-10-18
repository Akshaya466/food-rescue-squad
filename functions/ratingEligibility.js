function eligibleRatingTargets(role, userId, listing, delivery) {
  if (listing.status !== "delivered"
    || delivery.status !== "delivered"
    || delivery.listingId !== listing.id
    || delivery.donorId !== listing.donorId) {
    return [];
  }

  let targets = [];
  if (role === "donor" && listing.donorId === userId) {
    targets = [listing.claimedBy, delivery.volunteerId];
  } else if (role === "collector" && listing.claimedBy === userId) {
    targets = [listing.donorId, delivery.volunteerId];
  } else if (role === "volunteer" && delivery.volunteerId === userId) {
    targets = [listing.donorId, listing.claimedBy];
  }

  return [...new Set(targets)]
    .filter((targetId) => typeof targetId === "string"
      && targetId
      && targetId !== "unassigned"
      && targetId !== userId);
}

function ratingDocumentId(listingId, fromUserId, toUserId) {
  return `r_${Buffer
    .from(JSON.stringify([listingId, fromUserId, toUserId]))
    .toString("base64url")}`;
}

function hasExistingRatingRelationship(ratings, listingId, fromUserId, toUserId) {
  return ratings.some((rating) => (
    rating.listingId === listingId
    && rating.fromUserId === fromUserId
    && rating.toUserId === toUserId
  ));
}

module.exports = {
  eligibleRatingTargets,
  hasExistingRatingRelationship,
  ratingDocumentId,
};
