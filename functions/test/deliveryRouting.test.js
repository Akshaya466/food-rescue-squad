const test = require("node:test");
const assert = require("node:assert/strict");
const {
  notifyNextEligiblePartner,
  rankEligiblePartners,
  selectNextRecipient,
} = require("../deliveryRouting");

const now = Date.parse("2026-10-19T12:00:00.000Z");
const pickup = { lat: 13.0, lng: 80.0 };
const partner = (id, lat, lng, overrides = {}) => ({
  id,
  role: "volunteer",
  isAvailable: true,
  location: { lat, lng },
  locationUpdatedAt: new Date(now - 60_000).toISOString(),
  ...overrides,
});

test("ranks eligible partners by distance and excludes unavailable or stale locations", () => {
  const ranked = rankEligiblePartners(
    [
      partner("far", 13.2, 80.2),
      partner("near", 13.01, 80.01),
      partner("offline", 13.001, 80.001, { isAvailable: false }),
      partner("stale", 13.001, 80.001, {
        locationUpdatedAt: new Date(now - 16 * 60_000).toISOString(),
      }),
    ],
    pickup,
    { now }
  );

  assert.deepEqual(ranked.map(({ id }) => id), ["near", "far"]);
});

test("selects the nearest recipient not already attempted", () => {
  const ranked = rankEligiblePartners(
    [partner("first", 13.01, 80.01), partner("second", 13.02, 80.02)],
    pickup,
    { now }
  );

  assert.equal(selectNextRecipient(ranked)?.id, "first");
  assert.equal(selectNextRecipient(ranked, ["first"])?.id, "second");
  assert.equal(selectNextRecipient(ranked, ["first", "second"]), null);
});

test("returns no candidates when pickup or partner location data is missing", () => {
  assert.deepEqual(rankEligiblePartners([partner("valid", 13.01, 80.01)], null, { now }), []);
  assert.deepEqual(
    rankEligiblePartners([partner("missing", null, null)], pickup, { now }),
    []
  );
});

test("tries the next recipient after a notification failure and reports total failure", async () => {
  const ranked = rankEligiblePartners(
    [partner("first", 13.01, 80.01), partner("second", 13.02, 80.02)],
    pickup,
    { now }
  );
  const sendNotification = async ({ id }) => {
    if (id === "first") throw new Error("temporary notification failure");
  };

  assert.deepEqual(
    await notifyNextEligiblePartner(ranked, [], sendNotification),
    {
      status: "notified",
      recipientId: "second",
      failures: [
        { recipientId: "first", message: "temporary notification failure" },
      ],
    }
  );

  const failAll = async () => {
    throw new Error("offline");
  };
  const failed = await notifyNextEligiblePartner(ranked, [], failAll);
  assert.equal(failed.status, "failed");
  assert.deepEqual(failed.failures.map(({ recipientId }) => recipientId), [
    "first",
    "second",
  ]);
});
