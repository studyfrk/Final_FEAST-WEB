const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

setGlobalOptions({ region: "asia-southeast1", maxInstances: 10 });

initializeApp();

exports.checkEmailExists = onCall({ invoker: "public" }, async (request) => {
  const email = (request.data?.email || "").trim().toLowerCase();

  if (!email) {
    throw new HttpsError("invalid-argument", "An email address is required.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new HttpsError("invalid-argument", "The email address is not valid.");
  }

  const auth = getAuth();

  try {
    await auth.getUserByEmail(email);
    return { exists: true };
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      throw new HttpsError(
        "not-found",
        "No account is associated with this email address. Please check and try again."
      );
    }
    console.error("getUserByEmail error:", err);
    throw new HttpsError("internal", "Unable to verify the email address. Please try again.");
  }
});

exports.syncUserRoleToAuthClaims = onDocumentWritten("users/{userId}", async (event) => {
  const userId = event.params.userId;
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();

  // If document was deleted
  if (!afterData) {
    try {
      await getAuth().setCustomUserClaims(userId, null);
      console.log(`Successfully removed claims for deleted user: ${userId}`);
    } catch (error) {
      console.error(`Failed to remove claims for deleted user ${userId}:`, error);
    }
    return;
  }

  const role = afterData.role || "";
  const beforeRole = beforeData ? (beforeData.role || "") : "";

  // If role hasn't changed, do nothing
  if (beforeData && role === beforeRole) {
    return;
  }

  try {
    if (role === "admin") {
      await getAuth().setCustomUserClaims(userId, { admin: true });
      console.log(`Successfully set admin claim for user: ${userId}`);
    } else {
      await getAuth().setCustomUserClaims(userId, null);
      console.log(`Successfully removed admin claim for user: ${userId}`);
    }
  } catch (error) {
    console.error(`Failed to set custom claims for user ${userId}:`, error);
  }
});

