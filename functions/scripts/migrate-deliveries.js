const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { validateDeliveryDocument } = require("../migrationAudit");

initializeApp({ credential: applicationDefault() });

async function migrateDeliveries() {
  const apply = process.argv.includes("--apply-reviewed");
  const db = getFirestore();
  const [deliveries, listings, users] = await Promise.all([
    db.collection("deliveries").get(),
    db.collection("listings").get(),
    db.collection("users").get(),
  ]);
  const listingsById = new Map(listings.docs.map((listing) => [listing.id, listing]));
  const userIds = new Set(users.docs.map((user) => user.id));
  const byListing = new Map();
  const unresolved = [];
  const candidates = [];

  for (const delivery of deliveries.docs) {
    const listingId = delivery.get("listingId");
    if (typeof listingId !== "string" || !listingId.trim()) {
      unresolved.push(`${delivery.id}: listingId is missing or invalid`);
      continue;
    }
    const group = byListing.get(listingId) || [];
    group.push(delivery);
    byListing.set(listingId, group);
  }

  for (const [listingId, records] of byListing) {
    if (records.length !== 1) {
      unresolved.push(
        `${listingId}: ${records.length} delivery documents conflict: `
        + records.map((record) => record.id).join(", ")
      );
      continue;
    }

    const source = records[0];
    const data = source.data();
    const destination = `listing_${listingId}`;
    const listing = listingsById.get(listingId);
    const issues = validateDeliveryDocument(data);
    if (!listing) {
      issues.push("referenced listing is missing");
    } else {
      const listingData = listing.data();
      if (!["claimed", "delivered"].includes(listingData.status)) {
        issues.push("listing is not claimed or delivered");
      }
      if (typeof listingData.claimedBy !== "string" || !listingData.claimedBy) {
        issues.push("listing claimant is missing or invalid");
      }
      if (listingData.donorId !== data.donorId) {
        issues.push("delivery donor does not match listing donor");
      }
      if (listingData.status === "delivered" && data.status !== "delivered") {
        issues.push("delivered listing has a non-delivered record");
      }
      if (data.status === "delivered" && listingData.status === "claimed") {
        const donor = users.docs.find((user) => user.id === data.donorId);
        if (typeof donor?.get("totalRescues") !== "number") {
          issues.push("completed delivery needs manual rescue-counter repair");
        }
      } else if (data.status === "delivered" && listingData.status !== "delivered") {
        issues.push("delivery and listing completion states conflict");
      }
    }
    if (!userIds.has(data.donorId)) issues.push("donor profile is missing");
    if (data.volunteerId !== "unassigned" && !userIds.has(data.volunteerId)) {
      issues.push("volunteer profile is missing");
    }

    const isAlreadyMigrated = source.id === destination;
    const target = await db.doc(`deliveries/${destination}`).get();
    if (!isAlreadyMigrated && target.exists) {
      issues.push(`deterministic destination already exists (${target.id})`);
    }
    if (issues.length) {
      unresolved.push(`${source.id}: ${issues.join(", ")}`);
      continue;
    }
    if (isAlreadyMigrated) continue;
    candidates.push({ listingId, source, destination });
  }

  console.log(
    `Scanned ${deliveries.size} delivery records, ${listings.size} listings, `
    + `and ${users.size} user profiles.`
  );
  for (const candidate of candidates) {
    console.log(
      `${apply ? "Will migrate" : "Candidate"} ${candidate.source.id} -> `
      + `deliveries/${candidate.destination} (listing ${candidate.listingId}).`
    );
  }
  for (const entry of unresolved) {
    console.error(`Manual resolution required: ${entry}`);
  }

  let migrated = 0;
  if (apply) {
    for (const candidate of candidates) {
      const sourceRef = candidate.source.ref;
      const listingRef = db.doc(`listings/${candidate.listingId}`);
      const destinationRef = db.doc(`deliveries/${candidate.destination}`);
      const moved = await db.runTransaction(async (transaction) => {
        const [source, listingSnapshot, target] = await Promise.all([
          transaction.get(sourceRef),
          transaction.get(listingRef),
          transaction.get(destinationRef),
        ]);
        if (!source.exists || !listingSnapshot.exists || target.exists) return false;
        const currentDelivery = source.data();
        const currentListing = listingSnapshot.data();
        if (validateDeliveryDocument(currentDelivery).length
          || !["claimed", "delivered"].includes(currentListing.status)
          || currentListing.donorId !== currentDelivery.donorId
          || typeof currentListing.claimedBy !== "string"
          || !currentListing.claimedBy
          || (currentListing.status === "delivered"
            && currentDelivery.status !== "delivered")
          || (currentDelivery.status === "delivered"
            && currentListing.status !== "claimed"
            && currentListing.status !== "delivered")) {
          return false;
        }

        const donorRef = db.doc(`users/${currentDelivery.donorId}`);
        const donor = await transaction.get(donorRef);
        if (!donor.exists
          || typeof donor.get("totalRescues") !== "number"
          || !Number.isFinite(donor.get("totalRescues"))) return false;
        if (currentDelivery.volunteerId !== "unassigned") {
          const volunteer = await transaction.get(
            db.doc(`users/${currentDelivery.volunteerId}`)
          );
          if (!volunteer.exists) return false;
        }
        if (currentDelivery.status === "delivered"
          && currentListing.status === "claimed") {
          transaction.update(listingRef, { status: "delivered" });
          transaction.update(donorRef, {
            totalRescues: donor.get("totalRescues") + 1,
          });
        }
        transaction.create(destinationRef, currentDelivery);
        transaction.delete(sourceRef);
        return true;
      });
      if (moved) migrated += 1;
      else unresolved.push(
        `${candidate.source.id}: records changed or linkage failed during apply`
      );
    }
    console.log(`Migrated ${migrated} delivery documents.`);
  } else {
    console.log(
      `Dry run only: ${candidates.length} delivery documents are candidates. `
      + "No records were changed."
    );
    console.log("Use --apply-reviewed only after reviewing every candidate.");
  }

  if (unresolved.length) process.exitCode = 1;
}

migrateDeliveries().catch((error) => {
  console.error("Delivery migration failed:", error);
  process.exitCode = 1;
});
