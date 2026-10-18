const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const userId = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
if (!userId) {
  throw new Error("Usage: node scripts/set-admin.js <firebase-auth-uid>");
}

initializeApp({ credential: applicationDefault() });

async function grantAdmin() {
  const auth = getAuth();
  const user = await auth.getUser(userId);
  const profileRef = getFirestore().doc(`users/${userId}`);
  const profile = await profileRef.get();
  if (!profile.exists) {
    throw new Error("Create the user's application profile before granting admin access.");
  }
  await auth.setCustomUserClaims(userId, {
    ...user.customClaims,
    admin: true,
  });
  await profileRef.update({ role: "admin" });
  console.log(`Granted admin access to ${userId}. The user must sign in again to refresh their token.`);
}

grantAdmin().catch((error) => {
  console.error("Failed to grant admin access:", error);
  process.exitCode = 1;
});
