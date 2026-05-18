const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

setGlobalOptions({ region: "asia-southeast1", maxInstances: 10 });

initializeApp();

exports.requestPasswordReset = onCall(async (request) => {
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

  try {
    await auth.generatePasswordResetLink(email);
    return { success: true };
  } catch (err) {
    console.error("generatePasswordResetLink error:", err);
    throw new HttpsError("internal", "Failed to generate the reset link. Please try again.");
  }
});
