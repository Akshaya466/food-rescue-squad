const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const {
  duplicateGroups,
  validateNotificationDocument,
} = require("../migrationAudit");

initializeApp({ credential: applicationDefault() });

async function auditNotifications() {
  const db = getFirestore();
  const [notifications, users] = await Promise.all([
    db.collection("notifications").get(),
    db.collection("users").get(),
  ]);
  const userIds = new Set(users.docs.map((user) => user.id));
  const malformed = [];
  for (const notification of notifications.docs) {
    const issues = validateNotificationDocument(notification.data(), userIds);
    if (issues.length) malformed.push(`${notification.id}: ${issues.join(", ")}`);
  }

  const duplicates = duplicateGroups(notifications.docs.map((notification) => ({
    id: notification.id,
    data: notification.data(),
  })), ({ data }) => (
    ["userId", "type", "title", "message", "createdAt"]
      .every((field) => typeof data[field] === "string")
      ? JSON.stringify([
          data.userId,
          data.type,
          data.title,
          data.message,
          data.createdAt,
        ])
      : null
  ));

  console.log(
    `Read-only audit scanned ${notifications.size} notifications and `
    + `${users.size} user profiles. No documents will be changed.`
  );
  for (const entry of malformed) {
    console.error(`Manual notification review required: ${entry}`);
  }
  for (const duplicate of duplicates) {
    console.error(
      `Exact-content duplicate group requires review (${duplicate.key}): `
      + duplicate.ids.join(", ")
    );
  }
  if (malformed.length || duplicates.length) process.exitCode = 1;
}

auditNotifications().catch((error) => {
  console.error("Notification audit failed:", error);
  process.exitCode = 1;
});
