const test = require("node:test");
const assert = require("node:assert/strict");
const { runRatingsMigration } = require("../scripts/migrate-ratings");

const validRating = {
  fromUserId: "donor-1",
  toUserId: "collector-1",
  listingId: "listing-1",
  score: 5,
  review: "Helpful collection",
  createdAt: "2026-10-18T10:00:00.000Z",
};

const validUser = {
  id: "donor-1",
  trustScore: 5,
};
const validRecipient = {
  id: "collector-1",
  trustScore: 5,
};

function createDb({
  ratings = [validRating],
  users = [validUser, validRecipient],
} = {}) {
  const commits = [];
  const collections = {
    ratings: ratings.map((data, index) => ({
      id: `rating-${index}`,
      data: () => data,
      ref: `ratings/rating-${index}`,
    })),
    users: users.map((data, index) => ({
      id: data.id || `user-${index}`,
      data: () => data,
      ref: `users/${data.id || `user-${index}`}`,
    })),
    listings: [{
      id: "listing-1",
      data: () => ({}),
      ref: "listings/listing-1",
    }],
  };

  const db = {
    collection(name) {
      const docs = collections[name];
      return {
        get: async () => ({ docs, size: docs.length }),
      };
    },
    batch() {
      const writes = [];
      return {
        set: (...args) => writes.push(args),
        commit: async () => commits.push(writes),
      };
    },
  };

  return { db, commits };
}

async function assertApplyAbortsWithoutWrites(options) {
  const { db, commits } = createDb(options);
  const errors = [];

  const exitCode = await runRatingsMigration({
    db,
    apply: true,
    log: () => {},
    error: (message) => errors.push(message),
  });

  assert.equal(exitCode, 1, "CLI should exit with an error code");
  assert.equal(commits.length, 0, "no write batch should be committed");
  assert.ok(
    errors.some((message) => message.startsWith("Apply aborted:")),
    "the migration should report that apply was aborted"
  );
}

test("--apply aborts without committing when ratings fail validation", async () => {
  await assertApplyAbortsWithoutWrites({
    ratings: [{ ...validRating, score: 6 }],
  });
});

test("--apply aborts without committing when duplicate relationships exist", async () => {
  await assertApplyAbortsWithoutWrites({
    ratings: [
      validRating,
      { ...validRating, score: 4, createdAt: "2026-10-18T11:00:00.000Z" },
    ],
  });
});
