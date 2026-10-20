import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  it,
} from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const projectId = "demo-anora-rules";

let testEnvironment: RulesTestEnvironment;

const userProfile = (uid: string) => ({
  id: uid,
  name: "Test Donor",
  email: `${uid}@example.test`,
  role: "donor",
  orgName: "Test Food Bank",
  phone: "5550100",
  location: { lat: 12.9, lng: 77.6, address: "Test address" },
  trustScore: 5,
  totalRescues: 0,
  isVerified: false,
  createdAt: "2026-10-18T00:00:00.000Z",
});

const listing = (donorId: string) => ({
  donorId,
  donorName: "Test Food Bank",
  foodType: "Vegetables",
  description: "Fresh surplus vegetables",
  quantity: 10,
  unit: "kg",
  category: "raw",
  pickupWindowStart: "2026-10-18T10:00",
  pickupWindowEnd: "2026-10-18T12:00",
  address: "Test address",
  location: { lat: 12.9, lng: 77.6, address: "Test address" },
  photos: [],
  status: "active",
  claimedBy: null,
  dietaryTags: ["Veg"],
  urgencyLevel: "medium",
  createdAt: "2026-10-18T08:00:00.000Z",
});

const listingClaim = (collectorId: string, listingId: string) => ({
  listingId,
  collectorId,
  collectorName: "Test Collector",
  donorId: "listing-donor",
  foodType: "Vegetables",
  description: "Fresh surplus vegetables",
  quantity: 10,
  unit: "kg",
  pickupAddress: "Test address",
  dropAddress: "Test address",
  pickupWindowStart: "2026-10-18T10:00",
  pickupWindowEnd: "2026-10-18T12:00",
  createdAt: "2026-10-18T08:00:00.000Z",
});

const delivery = (listingId: string) => ({
  listingId,
  volunteerId: "unassigned",
  donorId: "listing-donor",
  status: "assigned",
  pickupAddress: "Test address",
  dropAddress: "Test address",
  estimatedTime: "30 mins",
  distanceKm: 0,
  foodDetails: "Vegetables",
  createdAt: "2026-10-18T08:00:00.000Z",
});

async function seedUser(uid: string) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", uid), userProfile(uid));
  });
}

async function seedListingAndCollector(collectorId: string, listingId: string) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", collectorId), {
      ...userProfile(collectorId),
      name: "Test Collector",
      role: "collector",
    });
    await setDoc(doc(context.firestore(), "listings", listingId), listing("listing-donor"));
  });
}

describe("Firestore security rules", () => {
  beforeAll(async () => {
    const rules = readFileSync(
      resolve(process.cwd(), "firestore.rules"),
      "utf8"
    );

    testEnvironment = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: "127.0.0.1",
        port: 8080,
        rules,
      },
    });
  });

  afterEach(async () => {
    await testEnvironment.clearFirestore();
  });

  afterAll(async () => {
    if (testEnvironment) {
      await testEnvironment.cleanup();
    }
  });

  it("denies an unauthenticated user from reading a user profile", async () => {
    await seedUser("profile-owner");

    await assertFails(
      getDoc(doc(testEnvironment.unauthenticatedContext().firestore(), "users", "profile-owner"))
    );
  });

  it("denies a donor from changing their own role to admin", async () => {
    await seedUser("role-escalation-donor");
    const donorDb = testEnvironment
      .authenticatedContext("role-escalation-donor")
      .firestore();

    await assertFails(
      updateDoc(doc(donorDb, "users", "role-escalation-donor"), { role: "admin" })
    );
  });

  it("allows public roles at profile creation but never an admin profile", async () => {
    const collectorDb = testEnvironment
      .authenticatedContext("new-collector")
      .firestore();
    await assertSucceeds(
      setDoc(doc(collectorDb, "users", "new-collector"), {
        ...userProfile("new-collector"),
        role: "collector",
      })
    );

    const volunteerDb = testEnvironment
      .authenticatedContext("new-volunteer")
      .firestore();
    await assertSucceeds(
      setDoc(doc(volunteerDb, "users", "new-volunteer"), {
        ...userProfile("new-volunteer"),
        role: "volunteer",
      })
    );

    const adminDb = testEnvironment
      .authenticatedContext("self-admin")
      .firestore();
    await assertFails(
      setDoc(doc(adminDb, "users", "self-admin"), {
        ...userProfile("self-admin"),
        role: "admin",
      })
    );
  });

  it("allows a new volunteer role and preserves legacy pending volunteer profiles", async () => {
    const legacyApplicantDb = testEnvironment
      .authenticatedContext("volunteer-applicant")
      .firestore();
    await assertSucceeds(
      setDoc(doc(legacyApplicantDb, "users", "volunteer-applicant"), {
        ...userProfile("volunteer-applicant"),
        requestedRole: "volunteer",
      })
    );
    const activeVolunteerDb = testEnvironment
      .authenticatedContext("active-volunteer")
      .firestore();
    await assertSucceeds(
      setDoc(doc(activeVolunteerDb, "users", "active-volunteer"), {
        ...userProfile("active-volunteer"),
        role: "volunteer",
      })
    );
    await assertFails(
      updateDoc(doc(legacyApplicantDb, "users", "volunteer-applicant"), {
        role: "volunteer",
        requestedRole: deleteField(),
      })
    );
  });

  it("allows only the requested donor-to-collector role transition", async () => {
    const uid = "collector-transition";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", uid), {
        ...userProfile(uid),
        requestedRole: "collector",
      });
    });
    const collectorDb = testEnvironment.authenticatedContext(uid).firestore();

    await assertSucceeds(
      updateDoc(doc(collectorDb, "users", uid), {
        role: "collector",
        requestedRole: deleteField(),
      })
    );

    const updated = await getDoc(doc(collectorDb, "users", uid));
    if (!updated.exists()) throw new Error("Expected transitioned profile");
    if (updated.data().role !== "collector") {
      throw new Error("Expected collector role to be persisted");
    }
  });

  it("denies collector transition without a collector request or with unrelated field changes", async () => {
    const noRequestUid = "donor-no-collector-request";
    const extraChangeUid = "collector-transition-extra-change";
    await seedUser(noRequestUid);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", extraChangeUid), {
        ...userProfile(extraChangeUid),
        requestedRole: "collector",
      });
    });

    const noRequestDb = testEnvironment
      .authenticatedContext(noRequestUid)
      .firestore();
    const extraChangeDb = testEnvironment
      .authenticatedContext(extraChangeUid)
      .firestore();

    await assertFails(
      updateDoc(doc(noRequestDb, "users", noRequestUid), {
        role: "collector",
      })
    );
    await assertFails(
      updateDoc(doc(extraChangeDb, "users", extraChangeUid), {
        role: "collector",
        requestedRole: deleteField(),
        isVerified: true,
      })
    );
  });

  it("allows completion only for a missing or invalid public role", async () => {
    const rolelessUid = "roleless-profile";
    const donorUid = "valid-donor-role";
    const adminUid = "protected-admin-role";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const roleless = userProfile(rolelessUid) as Record<string, unknown>;
      delete roleless.role;
      await setDoc(doc(db, "users", rolelessUid), roleless);
      await setDoc(doc(db, "users", donorUid), userProfile(donorUid));
      await setDoc(doc(db, "users", adminUid), {
        ...userProfile(adminUid),
        role: "admin",
      });
    });

    const rolelessDb = testEnvironment.authenticatedContext(rolelessUid).firestore();
    const donorDb = testEnvironment.authenticatedContext(donorUid).firestore();
    const adminDb = testEnvironment.authenticatedContext(adminUid).firestore();

    await assertSucceeds(
      updateDoc(doc(rolelessDb, "users", rolelessUid), { role: "volunteer" })
    );
    await assertFails(
      updateDoc(doc(donorDb, "users", donorUid), { role: "volunteer" })
    );
    await assertFails(
      updateDoc(doc(adminDb, "users", adminUid), { role: "volunteer" })
    );
  });

  it("authorizes collector listing reads only after the active role is stored", async () => {
    const uid = "listing-collector";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", uid), {
        ...userProfile(uid),
        requestedRole: "collector",
      });
      await setDoc(
        doc(context.firestore(), "listings", "available-listing"),
        listing("listing-donor")
      );
    });
    const collectorDb = testEnvironment.authenticatedContext(uid).firestore();
    await assertFails(getDocs(collection(collectorDb, "listings")));

    await assertSucceeds(
      updateDoc(doc(collectorDb, "users", uid), {
        role: "collector",
        requestedRole: deleteField(),
      })
    );
    await assertSucceeds(getDocs(collection(collectorDb, "listings")));
  });

  it("does not allow a user to transition another user's profile", async () => {
    const ownerUid = "collector-role-owner";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", ownerUid), {
        ...userProfile(ownerUid),
        requestedRole: "collector",
      });
    });
    const otherUserDb = testEnvironment
      .authenticatedContext("different-role-user")
      .firestore();

    await assertFails(
      updateDoc(doc(otherUserDb, "users", ownerUid), {
        role: "collector",
        requestedRole: deleteField(),
      })
    );
  });

  it("denies a user from reading another user's profile", async () => {
    await seedUser("profile-owner");

    const otherUserDb = testEnvironment
      .authenticatedContext("different-user")
      .firestore();

    await assertFails(
      getDoc(doc(otherUserDb, "users", "profile-owner"))
    );
  });

  it("denies a donor from updating another donor's listing", async () => {
    await seedUser("listing-owner");
    await seedUser("different-donor");
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "listings", "another-donors-listing"),
        listing("listing-owner")
      );
    });

    const donorDb = testEnvironment
      .authenticatedContext("different-donor")
      .firestore();

    await assertFails(
      updateDoc(doc(donorDb, "listings", "another-donors-listing"), {
        description: "Unauthorized update",
      })
    );
  });

  it("denies a client from creating a rating directly", async () => {
    const clientDb = testEnvironment
      .authenticatedContext("rating-client")
      .firestore();

    await assertFails(
      setDoc(doc(clientDb, "ratings", "direct-rating"), {
        fromUserId: "rating-client",
        toUserId: "rating-recipient",
        score: 5,
      })
    );
  });

  it("allows a donor to create a listing matching the rules schema", async () => {
    const donorId = "valid-listing-donor";
    await seedUser(donorId);
    const donorDb = testEnvironment.authenticatedContext(donorId).firestore();

    await assertSucceeds(
      addDoc(collection(donorDb, "listings"), listing(donorId))
    );
  });

  it("allows an atomic collector claim and exposes the claim notification to volunteers", async () => {
    const collectorId = "claim-collector";
    const listingId = "claim-listing";
    await seedListingAndCollector(collectorId, listingId);
    const collectorDb = testEnvironment.authenticatedContext(collectorId).firestore();

    const batch = writeBatch(collectorDb);
    batch.update(doc(collectorDb, "listings", listingId), {
      status: "claimed",
      claimedBy: collectorId,
    });
    batch.set(doc(collectorDb, "deliveries", `listing_${listingId}`), delivery(listingId));
    batch.set(doc(collectorDb, "listingClaims", listingId), listingClaim(collectorId, listingId));
    await assertSucceeds(batch.commit());

    const volunteerId = "claim-volunteer";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", volunteerId), {
        ...userProfile(volunteerId),
        role: "volunteer",
      });
    });
    const volunteerDb = testEnvironment.authenticatedContext(volunteerId).firestore();
    await assertSucceeds(getDoc(doc(volunteerDb, "listingClaims", listingId)));
    await assertSucceeds(getDocs(collection(volunteerDb, "listingClaims")));
    await assertSucceeds(
      getDocs(query(collection(volunteerDb, "deliveries"), where("status", "==", "assigned")))
    );
  });

  it("keeps volunteer access limited to delivery and claim data", async () => {
    const volunteerId = "delivery-only-volunteer";
    const listingId = "delivery-only-listing";
    await seedListingAndCollector("delivery-only-collector", listingId);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", volunteerId), {
        ...userProfile(volunteerId),
        role: "volunteer",
      });
    });
    const volunteerDb = testEnvironment.authenticatedContext(volunteerId).firestore();

    await assertFails(getDocs(collection(volunteerDb, "listings")));
    await assertFails(
      addDoc(collection(volunteerDb, "listings"), listing(volunteerId))
    );
  });

  it("allows collectors to read absent claim documents before starting a claim", async () => {
    const collectorId = "claim-read-collector";
    const listingId = "claim-read-listing";
    await seedListingAndCollector(collectorId, listingId);
    const collectorDb = testEnvironment.authenticatedContext(collectorId).firestore();

    await assertSucceeds(
      getDoc(doc(collectorDb, "deliveries", `listing_${listingId}`))
    );
    await assertSucceeds(
      getDoc(doc(collectorDb, "listingClaims", listingId))
    );
  });

  it("denies partial, forged, and non-collector claims", async () => {
    const collectorId = "claim-security-collector";
    const listingId = "claim-security-listing";
    await seedListingAndCollector(collectorId, listingId);
    const collectorDb = testEnvironment.authenticatedContext(collectorId).firestore();

    await assertFails(
      updateDoc(doc(collectorDb, "listings", listingId), {
        status: "claimed",
        claimedBy: collectorId,
      })
    );

    const forgedBatch = writeBatch(collectorDb);
    forgedBatch.update(doc(collectorDb, "listings", listingId), {
      status: "claimed",
      claimedBy: collectorId,
    });
    forgedBatch.set(doc(collectorDb, "deliveries", `listing_${listingId}`), delivery(listingId));
    forgedBatch.set(doc(collectorDb, "listingClaims", listingId), {
      ...listingClaim(collectorId, listingId),
      pickupAddress: "Forged address",
    });
    await assertFails(forgedBatch.commit());

    await seedUser("claim-security-donor");
    const donorDb = testEnvironment.authenticatedContext("claim-security-donor").firestore();
    await assertFails(
      updateDoc(doc(donorDb, "listings", listingId), {
        status: "claimed",
        claimedBy: "claim-security-donor",
      })
    );
  });

  it("allows unclaim only before volunteer delivery starts", async () => {
    const collectorId = "unclaim-collector";
    const listingId = "unclaim-listing";
    await seedListingAndCollector(collectorId, listingId);
    const collectorDb = testEnvironment.authenticatedContext(collectorId).firestore();
    const claimBatch = writeBatch(collectorDb);
    claimBatch.update(doc(collectorDb, "listings", listingId), {
      status: "claimed",
      claimedBy: collectorId,
    });
    claimBatch.set(doc(collectorDb, "deliveries", `listing_${listingId}`), delivery(listingId));
    claimBatch.set(doc(collectorDb, "listingClaims", listingId), listingClaim(collectorId, listingId));
    await assertSucceeds(claimBatch.commit());

    const unclaimBatch = writeBatch(collectorDb);
    unclaimBatch.update(doc(collectorDb, "listings", listingId), {
      status: "active",
      claimedBy: null,
    });
    unclaimBatch.delete(doc(collectorDb, "deliveries", `listing_${listingId}`));
    unclaimBatch.delete(doc(collectorDb, "listingClaims", listingId));
    await assertSucceeds(unclaimBatch.commit());
  });

  it("lets a volunteer advance an assigned delivery and mark its listing delivered atomically", async () => {
    const collectorId = "delivery-collector";
    const volunteerId = "delivery-volunteer";
    const listingId = "delivery-listing";
    await seedListingAndCollector(collectorId, listingId);
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", volunteerId), {
        ...userProfile(volunteerId),
        role: "volunteer",
      });
    });
    const collectorDb = testEnvironment.authenticatedContext(collectorId).firestore();
    const claimBatch = writeBatch(collectorDb);
    claimBatch.update(doc(collectorDb, "listings", listingId), {
      status: "claimed",
      claimedBy: collectorId,
    });
    claimBatch.set(doc(collectorDb, "deliveries", `listing_${listingId}`), delivery(listingId));
    claimBatch.set(doc(collectorDb, "listingClaims", listingId), listingClaim(collectorId, listingId));
    await assertSucceeds(claimBatch.commit());

    const volunteerDb = testEnvironment.authenticatedContext(volunteerId).firestore();
    const deliveryRef = doc(volunteerDb, "deliveries", `listing_${listingId}`);
    const startBatch = writeBatch(volunteerDb);
    startBatch.update(deliveryRef, {
      status: "en_route",
      volunteerId,
    });
    await assertSucceeds(startBatch.commit());

    const forbiddenUnclaim = writeBatch(collectorDb);
    forbiddenUnclaim.update(doc(collectorDb, "listings", listingId), {
      status: "active",
      claimedBy: null,
    });
    forbiddenUnclaim.delete(doc(collectorDb, "deliveries", `listing_${listingId}`));
    forbiddenUnclaim.delete(doc(collectorDb, "listingClaims", listingId));
    await assertFails(forbiddenUnclaim.commit());

    const pickupBatch = writeBatch(volunteerDb);
    pickupBatch.update(deliveryRef, { status: "picked_up" });
    await assertSucceeds(pickupBatch.commit());

    const deliveredBatch = writeBatch(volunteerDb);
    deliveredBatch.update(deliveryRef, { status: "delivered" });
    deliveredBatch.update(doc(volunteerDb, "listings", listingId), {
      status: "delivered",
    });
    await assertSucceeds(deliveredBatch.commit());
  });
});
