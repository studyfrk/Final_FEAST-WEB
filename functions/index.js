const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

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

exports.upgradeVerifiedUser = onCall({ invoker: "public" }, async (request) => {
  const email = (request.data?.email || "").trim().toLowerCase();

  if (!email) {
    throw new HttpsError("invalid-argument", "Email address is required.");
  }

  const auth = getAuth();
  const db = getFirestore();

  try {
    // 1. Verify that the user actually exists and has their email verified in Firebase Auth
    const userRecord = await auth.getUserByEmail(email);

    if (!userRecord.emailVerified) {
      throw new HttpsError("failed-precondition", "Email is not verified in Firebase Auth.");
    }

    // 2. Find the user in Firestore
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).get();

    if (snapshot.empty) {
      throw new HttpsError("not-found", "User document not found in Firestore.");
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // 3. Only upgrade if they are currently email_unconfirmed
    if (userData.status === "email_unconfirmed") {
      await userDoc.ref.update({
        status: "unverified",
        emailVerifiedAt: new Date().toISOString()
      });
      return { success: true, message: "User status upgraded to unverified." };
    } else {
      return { success: true, message: "User status is already upgraded." };
    }
  } catch (err) {
    console.error("upgradeVerifiedUser error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "Failed to upgrade user status.");
  }
});
