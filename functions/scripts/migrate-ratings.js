const {
  duplicateGroups,
  validateRatingDocument,
} = require("../migrationAudit");

async function runRatingsMigration({ db, apply, log = console.log, error = console.error }) {
  const [ratings, users, listings] = await Promise.all([
    db.collection("ratings").get(),
    db.collection("users").get(),
    db.collection("listings").get(),
  ]);
  const userIds = new Set(users.docs.map((user) => user.id));
  const listingIds = new Set(listings.docs.map((listing) => listing.id));
  const references = { users: userIds, listings: listingIds };
  const malformedRatings = [];
  const malformedUsers = [];

  for (const rating of ratings.docs) {
    const issues = validateRatingDocument(rating.data(), references);
    if (issues.length) {
      malformedRatings.push(`${rating.id}: ${issues.join(", ")}`);
    }
  }
  for (const user of users.docs) {
    const data = user.data();
    const issues = [];
    if (data.id !== user.id) issues.push("profile id does not match document ID");
    if (typeof data.trustScore !== "number" || !Number.isFinite(data.trustScore)) {
      issues.push("trustScore is missing or invalid");
    }
    if (issues.length) malformedUsers.push(`${user.id}: ${issues.join(", ")}`);
  }
  const duplicates = duplicateGroups(ratings.docs.map((rating) => ({
    id: rating.id,
    data: rating.data(),
  })), ({ data }) => (
    typeof data.listingId === "string"
    && typeof data.fromUserId === "string"
    && typeof data.toUserId === "string"
      ? JSON.stringify([data.listingId, data.fromUserId, data.toUserId])
      : null
  ));

  log(`Scanned ${ratings.size} ratings and ${users.size} user profiles.`);
  log(
    `Planned effect: mark all existing ratings untrusted and reset profile trust scores to 5.0.`
  );
  for (const entry of malformedRatings) {
    error(`Manual rating review required: ${entry}`);
  }
  for (const entry of malformedUsers) {
    error(`Manual profile review required: ${entry}`);
  }
  for (const duplicate of duplicates) {
    error(
      `Duplicate rating relationship requires review (${duplicate.key}): `
      + duplicate.ids.join(", ")
    );
  }

  const hasReviewIssues =
    malformedRatings.length > 0
    || malformedUsers.length > 0
    || duplicates.length > 0;

  if (apply && hasReviewIssues) {
    error(
      "Apply aborted: resolve malformed records and duplicate rating relationships before migrating."
    );
    return 1;
  }

  if (apply) {
    const writes = [
      ...ratings.docs.map((rating) => ({
        ref: rating.ref,
        data: { trusted: false },
      })),
      ...users.docs.map((user) => ({
        ref: user.ref,
        data: { trustScore: 5.0 },
      })),
    ];
    for (let offset = 0; offset < writes.length; offset += 450) {
      const batch = db.batch();
      for (const write of writes.slice(offset, offset + 450)) {
        batch.set(write.ref, write.data, { merge: true });
      }
      await batch.commit();
    }
    log(
      `Marked ${ratings.size} ratings untrusted and reset ${users.size} trust scores. `
      + "No rating or profile documents were deleted."
    );
  } else {
    log(
      `Dry run only: ${ratings.size} ratings and ${users.size} trust scores `
      + "would be updated. No records were changed."
    );
  }

  return hasReviewIssues ? 1 : 0;
}

if (require.main === module) {
  const { initializeApp, applicationDefault } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  initializeApp({ credential: applicationDefault() });
  runRatingsMigration({
    db: getFirestore(),
    apply: process.argv.includes("--apply"),
  })
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((migrationError) => {
      console.error("Rating migration failed:", migrationError);
      process.exitCode = 1;
    });
}

module.exports = { runRatingsMigration };
