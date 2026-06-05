const { setGlobalOptions } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

setGlobalOptions({ region: "asia-southeast1", maxInstances: 10 });

initializeApp();

// ---------------------------------------------------------------------------
// checkEmailExists
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// upgradeVerifiedUser
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// cleanupGuestAccounts — runs every 24 hours
// Deletes anonymous Auth accounts whose guestSessions document has expired
// or anonymous accounts older than 30 days with no document at all.
// This is the backstop for sessions that survived crashes / mobile kills.
// The primary cleanup is deleteUser() in signOutUser (authUtils.js).
// ---------------------------------------------------------------------------
const BATCH_SIZE = 100;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

exports.cleanupGuestAccounts = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "UTC",
    timeoutSeconds: 300,
  },
  async () => {
    const auth = getAuth();
    const db = getFirestore();
    const now = Date.now();

    let deletedCount = 0;
    let pageToken = undefined;

    console.log("Starting guest account cleanup...");

    do {
      const listResult = await auth.listUsers(BATCH_SIZE, pageToken);

      const deletePromises = listResult.users
        .filter((user) => user.providerData.length === 0) // anonymous = no providers
        .map(async (user) => {
          const createdAt = new Date(user.metadata.creationTime).getTime();
          const ageMs = now - createdAt;

          if (ageMs < THIRTY_DAYS_MS) {
            // Account is fresh — check for an explicit expiry in Firestore
            const sessionDoc = await db
              .collection("guestSessions")
              .doc(user.uid)
              .get();

            if (sessionDoc.exists) {
              const expiresAt = sessionDoc.data().expiresAt;
              const expireMs =
                expiresAt instanceof Timestamp
                  ? expiresAt.toMillis()
                  : new Date(expiresAt).getTime();

              if (now < expireMs) {
                return; // Not yet expired — leave it alone
              }
            } else {
              return; // No document and account is < 30 days old — skip
            }
          }

          // Delete from Firebase Auth
          try {
            await auth.deleteUser(user.uid);
            deletedCount++;
            console.log(`Deleted anonymous user: ${user.uid}`);
          } catch (err) {
            console.error(`Failed to delete user ${user.uid}:`, err.message);
          }

          // Clean up the Firestore document if it exists
          try {
            await db.collection("guestSessions").doc(user.uid).delete();
          } catch (err) {
            console.warn(`Could not delete guestSessions/${user.uid}:`, err.message);
          }
        });

      await Promise.allSettled(deletePromises);
      pageToken = listResult.pageToken;
    } while (pageToken);

    console.log(`Guest account cleanup complete. Deleted ${deletedCount} accounts.`);
  }
);
