const USER_ROLES = ["donor", "collector", "volunteer", "admin"];
const REQUESTED_ROLES = ["donor", "collector", "volunteer"];
const DELIVERY_STATUSES = ["assigned", "en_route", "picked_up", "delivered"];
const NOTIFICATION_TYPES = [
  "claim",
  "pickup_reminder",
  "rating",
  "new_listing",
  "delivery_assigned",
];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateUserDocument(documentId, data) {
  const issues = [];
  if (data.id !== documentId) issues.push("profile id does not match document ID");
  if (!isNonEmptyString(data.name)) issues.push("name is missing or invalid");
  if (!isNonEmptyString(data.email)) issues.push("email is missing or invalid");
  if (!USER_ROLES.includes(data.role)) issues.push("role is missing or invalid");
  if (data.requestedRole !== undefined && !REQUESTED_ROLES.includes(data.requestedRole)) {
    issues.push("requestedRole is invalid");
  }
  if (typeof data.orgName !== "string" || data.orgName.length > 200) {
    issues.push("orgName is missing or invalid");
  }
  if (typeof data.email !== "string" || data.email.length > 255) {
    issues.push("email is missing or invalid");
  }
  if (typeof data.name !== "string" || data.name.length < 2 || data.name.length > 100) {
    if (!issues.includes("name is missing or invalid")) issues.push("name is outside allowed length");
  }
  if (typeof data.phone !== "string" || data.phone.length > 15) {
    issues.push("phone is missing or invalid");
  }
  if (!data.location
    || typeof data.location !== "object"
    || !Number.isFinite(data.location.lat)
    || data.location.lat < -90
    || data.location.lat > 90
    || !Number.isFinite(data.location.lng)
    || data.location.lng < -180
    || data.location.lng > 180
    || typeof data.location.address !== "string"
    || data.location.address.length > 500) {
    issues.push("location is missing or invalid");
  }
  if (typeof data.trustScore !== "number" || !Number.isFinite(data.trustScore)) {
    issues.push("trustScore is missing or invalid");
  }
  if (typeof data.totalRescues !== "number"
    || !Number.isFinite(data.totalRescues)
    || data.totalRescues < 0) {
    issues.push("totalRescues is missing or invalid");
  }
  if (typeof data.isVerified !== "boolean") issues.push("isVerified is missing or invalid");
  if (!isNonEmptyString(data.createdAt) || data.createdAt.length > 40) {
    issues.push("createdAt is missing or invalid");
  }
  return issues;
}

function validateRatingDocument(data, references) {
  const issues = [];
  if (!isNonEmptyString(data.fromUserId)
    || data.fromUserId.length > 128
    || data.fromUserId.includes("/")) {
    issues.push("fromUserId is missing or invalid");
  }
  if (!isNonEmptyString(data.toUserId)
    || data.toUserId.length > 128
    || data.toUserId.includes("/")) {
    issues.push("toUserId is missing or invalid");
  }
  if (data.fromUserId === data.toUserId) issues.push("self-rating requires manual review");
  if (!isNonEmptyString(data.listingId)
    || data.listingId.length > 128
    || data.listingId.includes("/")) {
    issues.push("listingId is missing or invalid");
  }
  if (!Number.isInteger(data.score) || data.score < 1 || data.score > 5) {
    issues.push("score is outside the integer range 1-5");
  }
  if (typeof data.review !== "string" || data.review.length > 2000) {
    issues.push("review is missing or exceeds 2000 characters");
  }
  if (!isNonEmptyString(data.createdAt) || data.createdAt.length > 40) {
    issues.push("createdAt is missing or invalid");
  }
  if (data.trusted !== undefined && typeof data.trusted !== "boolean") {
    issues.push("trusted is not boolean");
  }
  if (references) {
    if (!references.users.has(data.fromUserId)) issues.push("author profile is missing");
    if (!references.users.has(data.toUserId)) issues.push("recipient profile is missing");
    if (!references.listings.has(data.listingId)) issues.push("referenced listing is missing");
  }
  return issues;
}

function validateDeliveryDocument(data) {
  const issues = [];
  if (!isNonEmptyString(data.listingId)) issues.push("listingId is missing or invalid");
  if (!isNonEmptyString(data.donorId)) issues.push("donorId is missing or invalid");
  if (!isNonEmptyString(data.volunteerId)) issues.push("volunteerId is missing or invalid");
  if (!DELIVERY_STATUSES.includes(data.status)) issues.push("status is missing or invalid");
  for (const field of ["pickupAddress", "dropAddress", "estimatedTime", "foodDetails", "createdAt"]) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      issues.push(`${field} is missing or invalid`);
    }
  }
  if (typeof data.createdAt === "string" && data.createdAt.length > 40) {
    issues.push("createdAt exceeds 40 characters");
  }
  if (typeof data.distanceKm !== "number"
    || !Number.isFinite(data.distanceKm)
    || data.distanceKm < 0) {
    issues.push("distanceKm is missing or invalid");
  }
  if (data.status === "assigned" && data.volunteerId !== "unassigned") {
    issues.push("assigned delivery has a volunteer ID");
  }
  if (data.status !== "assigned" && data.volunteerId === "unassigned") {
    issues.push("started delivery has no volunteer ID");
  }
  return issues;
}

function validateNotificationDocument(data, userIds) {
  const issues = [];
  if (!isNonEmptyString(data.userId)) issues.push("userId is missing or invalid");
  if (userIds && !userIds.has(data.userId)) issues.push("recipient profile is missing");
  if (!NOTIFICATION_TYPES.includes(data.type)) issues.push("type is missing or invalid");
  if (!isNonEmptyString(data.title)) issues.push("title is missing or invalid");
  if (typeof data.message !== "string" || !data.message.trim()) {
    issues.push("message is missing or invalid");
  }
  if (typeof data.isRead !== "boolean") issues.push("isRead is missing or invalid");
  if (!isNonEmptyString(data.createdAt)) issues.push("createdAt is missing or invalid");
  return issues;
}

function duplicateGroups(documents, keyForDocument) {
  const groups = new Map();
  for (const document of documents) {
    const key = keyForDocument(document);
    if (!key) continue;
    const group = groups.get(key) || [];
    group.push(document.id);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids }));
}

module.exports = {
  DELIVERY_STATUSES,
  NOTIFICATION_TYPES,
  duplicateGroups,
  validateDeliveryDocument,
  validateNotificationDocument,
  validateRatingDocument,
  validateUserDocument,
};
