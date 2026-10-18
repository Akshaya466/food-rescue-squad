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
  doc,
  getDoc,
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

async function seedUser(uid: string) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", uid), userProfile(uid));
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
});
