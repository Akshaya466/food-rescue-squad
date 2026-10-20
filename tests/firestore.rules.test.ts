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
  serverTimestamp,
  setDoc,
  updateDoc,
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

const listingAccessEvent = (collectorId: string, listingId: string) => ({
  collectorId,
  collectorName: "Test Collector",
  listingId,
  foodType: "Vegetables",
  description: "Fresh surplus vegetables",
  quantity: 10,
  unit: "kg",
  address: "Test address",
  pickupWindowStart: "2026-10-18T10:00",
  pickupWindowEnd: "2026-10-18T12:00",
  createdAt: serverTimestamp(),
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

  it("allows a user to create an active collector profile but never an admin profile", async () => {
    const collectorDb = testEnvironment
      .authenticatedContext("new-collector")
      .firestore();
    await assertSucceeds(
      setDoc(doc(collectorDb, "users", "new-collector"), {
        ...userProfile("new-collector"),
        role: "collector",
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

  it("keeps volunteer registration pending as a donor profile", async () => {
    const volunteerApplicantDb = testEnvironment
      .authenticatedContext("volunteer-applicant")
      .firestore();
    await assertSucceeds(
      setDoc(doc(volunteerApplicantDb, "users", "volunteer-applicant"), {
        ...userProfile("volunteer-applicant"),
        requestedRole: "volunteer",
      })
    );
    await assertFails(
      setDoc(doc(volunteerApplicantDb, "users", "volunteer-applicant-active"), {
        ...userProfile("volunteer-applicant-active"),
        role: "volunteer",
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

  it("allows a collector to record one valid listing access event for volunteers", async () => {
    const collectorId = "event-collector";
    const listingId = "event-listing";
    await seedListingAndCollector(collectorId, listingId);
    const collectorDb = testEnvironment.authenticatedContext(collectorId).firestore();

    await assertSucceeds(
      setDoc(
        doc(collectorDb, "listingAccessEvents", `${listingId}_${collectorId}`),
        listingAccessEvent(collectorId, listingId)
      )
    );

    const volunteerId = "event-volunteer";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", volunteerId), {
        ...userProfile(volunteerId),
        role: "volunteer",
      });
    });
    const volunteerDb = testEnvironment.authenticatedContext(volunteerId).firestore();
    await assertSucceeds(
      getDoc(doc(volunteerDb, "listingAccessEvents", `${listingId}_${collectorId}`))
    );
    await assertSucceeds(getDocs(collection(volunteerDb, "listingAccessEvents")));
  });

  it("denies forged, duplicate, and non-collector listing access events", async () => {
    const collectorId = "event-owner";
    const listingId = "event-listed-food";
    await seedListingAndCollector(collectorId, listingId);
    const collectorDb = testEnvironment.authenticatedContext(collectorId).firestore();
    const eventRef = doc(
      collectorDb,
      "listingAccessEvents",
      `${listingId}_${collectorId}`
    );

    await assertFails(
      setDoc(eventRef, {
        ...listingAccessEvent(collectorId, listingId),
        address: "Forged pickup address",
      })
    );
    await assertSucceeds(setDoc(eventRef, listingAccessEvent(collectorId, listingId)));
    await assertFails(setDoc(eventRef, listingAccessEvent(collectorId, listingId)));

    await seedUser("event-donor");
    const donorDb = testEnvironment.authenticatedContext("event-donor").firestore();
    await assertFails(
      setDoc(
        doc(donorDb, "listingAccessEvents", `${listingId}_event-donor`),
        listingAccessEvent("event-donor", listingId)
      )
    );
  });

  it("denies volunteers from creating listing access events and donors from reading them", async () => {
    const collectorId = "event-read-collector";
    const listingId = "event-read-listing";
    await seedListingAndCollector(collectorId, listingId);
    const collectorDb = testEnvironment.authenticatedContext(collectorId).firestore();
    await assertSucceeds(
      setDoc(
        doc(collectorDb, "listingAccessEvents", `${listingId}_${collectorId}`),
        listingAccessEvent(collectorId, listingId)
      )
    );

    const volunteerId = "event-read-volunteer";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", volunteerId), {
        ...userProfile(volunteerId),
        role: "volunteer",
      });
    });
    const volunteerDb = testEnvironment.authenticatedContext(volunteerId).firestore();
    await assertFails(
      setDoc(
        doc(volunteerDb, "listingAccessEvents", `${listingId}_${volunteerId}`),
        listingAccessEvent(volunteerId, listingId)
      )
    );

    await seedUser("event-read-donor");
    const donorDb = testEnvironment.authenticatedContext("event-read-donor").firestore();
    await assertFails(
      getDocs(collection(donorDb, "listingAccessEvents"))
    );
  });
});
