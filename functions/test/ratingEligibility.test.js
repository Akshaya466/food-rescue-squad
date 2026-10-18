const test = require("node:test");
const assert = require("node:assert/strict");
const {
  eligibleRatingTargets,
  hasExistingRatingRelationship,
  ratingDocumentId,
} = require("../ratingEligibility");

const listing = {
  id: "listing-1",
  donorId: "donor-1",
  claimedBy: "collector-1",
  status: "delivered",
};
const delivery = {
  listingId: "listing-1",
  donorId: "donor-1",
  volunteerId: "volunteer-1",
  status: "delivered",
};

test("lists only counterparties for each completed-delivery role", () => {
  assert.deepEqual(
    eligibleRatingTargets("donor", "donor-1", listing, delivery),
    ["collector-1", "volunteer-1"]
  );
  assert.deepEqual(
    eligibleRatingTargets("collector", "collector-1", listing, delivery),
    ["donor-1", "volunteer-1"]
  );
  assert.deepEqual(
    eligibleRatingTargets("volunteer", "volunteer-1", listing, delivery),
    ["donor-1", "collector-1"]
  );
});

test("rejects incomplete or mismatched delivery records", () => {
  assert.deepEqual(
    eligibleRatingTargets("donor", "donor-1", listing, {
      ...delivery,
      status: "picked_up",
    }),
    []
  );
  assert.deepEqual(
    eligibleRatingTargets("donor", "donor-1", listing, {
      ...delivery,
      listingId: "different-listing",
    }),
    []
  );
  assert.deepEqual(
    eligibleRatingTargets("collector", "other-user", listing, delivery),
    []
  );
});

test("deduplicates participants and produces stable per-participant rating IDs", () => {
  assert.deepEqual(
    eligibleRatingTargets("donor", "donor-1", {
      ...listing,
      claimedBy: "volunteer-1",
    }, delivery),
    ["volunteer-1"]
  );
  assert.equal(
    ratingDocumentId("listing-1", "donor-1", "collector-1"),
    ratingDocumentId("listing-1", "donor-1", "collector-1")
  );
  assert.notEqual(
    ratingDocumentId("listing-1", "donor-1", "collector-1"),
    ratingDocumentId("listing-1", "donor-1", "volunteer-1")
  );
});

test("detects an existing rating relationship with a legacy document ID", () => {
  const ratings = [{
    id: "legacy-rating-document-id",
    listingId: "listing-1",
    fromUserId: "donor-1",
    toUserId: "collector-1",
  }];

  assert.notEqual(
    ratings[0].id,
    ratingDocumentId("listing-1", "donor-1", "collector-1")
  );
  assert.equal(
    hasExistingRatingRelationship(
      ratings,
      "listing-1",
      "donor-1",
      "collector-1"
    ),
    true
  );
});

test("does not treat another listing or author as the same rating relationship", () => {
  const ratings = [{
    listingId: "listing-1",
    fromUserId: "donor-1",
    toUserId: "collector-1",
  }];

  assert.equal(
    hasExistingRatingRelationship(
      ratings,
      "listing-2",
      "donor-1",
      "collector-1"
    ),
    false
  );
  assert.equal(
    hasExistingRatingRelationship(
      ratings,
      "listing-1",
      "another-donor",
      "collector-1"
    ),
    false
  );
});
