const test = require("node:test");
const assert = require("node:assert/strict");
const {
  duplicateGroups,
  validateDeliveryDocument,
  validateNotificationDocument,
  validateRatingDocument,
  validateUserDocument,
} = require("../migrationAudit");

test("validates role-migration user profiles and flags malformed authority fields", () => {
  const profile = {
    id: "user-1",
    name: "User",
    email: "user@example.test",
    role: "collector",
    orgName: "",
    phone: "",
    location: { lat: 12, lng: 77, address: "City" },
    trustScore: 5,
    totalRescues: 0,
    isVerified: false,
    createdAt: "2026-10-18",
  };
  assert.deepEqual(validateUserDocument("user-1", profile), []);
  assert.deepEqual(
    validateUserDocument("other-id", { ...profile, requestedRole: "admin" }),
    [
      "profile id does not match document ID",
      "requestedRole is invalid",
    ]
  );
});

test("detects malformed and self-referential legacy ratings", () => {
  const references = {
    users: new Set(["user-1"]),
    listings: new Set(["listing-1"]),
  };
  assert.deepEqual(
    validateRatingDocument({
      fromUserId: "user-1",
      toUserId: "user-1",
      listingId: "missing-listing",
      score: 7,
      review: "",
      createdAt: "2026-10-18",
    }, references),
    [
      "self-rating requires manual review",
      "score is outside the integer range 1-5",
      "referenced listing is missing",
    ]
  );
});

test("reports invalid delivery linkage fields without deleting records", () => {
  assert.deepEqual(
    validateDeliveryDocument({
      listingId: "",
      donorId: "donor-1",
      volunteerId: "unassigned",
      status: "delivered",
      pickupAddress: "A",
      dropAddress: "B",
      estimatedTime: "30 mins",
      foodDetails: "Food",
      createdAt: "2026-10-18",
      distanceKm: -1,
    }),
    [
      "listingId is missing or invalid",
      "distanceKm is missing or invalid",
      "started delivery has no volunteer ID",
    ]
  );
});

test("reports malformed notifications and groups duplicates for review", () => {
  assert.deepEqual(
    validateNotificationDocument({
      userId: "missing-user",
      type: "unknown",
      title: "",
      message: "  ",
      isRead: "false",
      createdAt: "",
    }, new Set()),
    [
      "recipient profile is missing",
      "type is missing or invalid",
      "title is missing or invalid",
      "message is missing or invalid",
      "isRead is missing or invalid",
      "createdAt is missing or invalid",
    ]
  );
  assert.deepEqual(
    duplicateGroups([
      { id: "one", key: "same" },
      { id: "two", key: "same" },
      { id: "three", key: "unique" },
    ], (document) => document.key),
    [{ key: "same", ids: ["one", "two"] }]
  );
});
