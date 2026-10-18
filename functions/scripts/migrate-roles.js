const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { validateUserDocument } = require("../migrationAudit");

initializeApp({ credential: applicationDefault() });

async function migrateRoles() {
  const apply = process.argv.includes("--apply");
  const db = getFirestore();
  const auth = getAuth();
  const users = await db.collection("users").get();
  const candidates = [];
  const unresolved = [];
  let existingAdmins = 0;

  for (const user of users.docs) {
    const data = user.data();
    const issues = validateUserDocument(user.id, data);
    let authUser;
    try {
      authUser = await auth.getUser(user.id);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        issues.push("Firebase Auth account is missing");
      } else {
        throw error;
      }
    }

    const hasAdminClaim = authUser?.customClaims?.admin === true;
    if ((data.role === "admin") !== hasAdminClaim) {
      issues.push("admin profile role and Auth custom claim do not match");
    }
    if (issues.length) {
      unresolved.push(`${user.id}: ${issues.join(", ")}`);
      continue;
    }
    if (hasAdminClaim) {
      existingAdmins += 1;
      continue;
    }
    if (["collector", "volunteer"].includes(data.role)) {
      candidates.push({ ref: user.ref, role: data.role, userId: user.id });
    }
  }

  console.log(`Scanned ${users.size} user profiles.`);
  console.log(`Admin accounts retained: ${existingAdmins}.`);
  for (const candidate of candidates) {
    console.log(
      `${apply ? "Will migrate" : "Candidate"} ${candidate.userId}: `
      + `${candidate.role} -> donor (requestedRole=${candidate.role}).`
    );
  }
  for (const entry of unresolved) {
    console.error(`Manual resolution required: ${entry}`);
  }

  if (apply) {
    for (let offset = 0; offset < candidates.length; offset += 450) {
      const batch = db.batch();
      for (const candidate of candidates.slice(offset, offset + 450)) {
        batch.update(candidate.ref, {
          role: "donor",
          requestedRole: candidate.role,
        });
      }
      await batch.commit();
    }
    console.log(`Migrated ${candidates.length} role profiles.`);
  } else {
    console.log(
      `Dry run: ${candidates.length} valid profiles would be migrated. `
      + "No records were changed. Use --apply only after review."
    );
  }

  if (unresolved.length) process.exitCode = 1;
}

migrateRoles().catch((error) => {
  console.error("Role migration failed:", error);
  process.exitCode = 1;
});
