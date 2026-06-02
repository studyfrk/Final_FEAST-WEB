/**
 * authUtils.js
 * ─────────────────────────────────────────────────────────────
 * Guest-aware sign-out utility.
 *
 * Regular users  → signOut() as normal.
 * Anonymous users → deleteUser() to permanently remove the
 *                   anonymous Auth record, preventing ghost
 *                   data from accumulating in Firebase Auth.
 *
 * Import and call signOutUser(auth) anywhere a sign-out button
 * exists (ProfileModal, header, etc.) instead of calling
 * signOut(auth) directly.
 * ─────────────────────────────────────────────────────────────
 */
import { signOut, deleteUser } from "firebase/auth";

/**
 * Signs out the current user.
 * If the user is anonymous, their Auth account is deleted entirely.
 *
 * @param {import("firebase/auth").Auth} auth  - Firebase Auth instance
 * @param {Function} [onComplete]              - Optional callback after sign-out
 */
export const signOutUser = async (auth, onComplete) => {
  const user = auth.currentUser;
  try {
    if (user?.isAnonymous) {
      // Permanently delete the anonymous account so it doesn't
      // pile up as ghost data in Firebase Authentication.
      await deleteUser(user);
    } else {
      await signOut(auth);
    }
  } catch (err) {
    console.error("Sign-out error:", err);
    // Fall back to a plain sign-out if deletion fails
    await signOut(auth).catch(() => {});
  } finally {
    localStorage.removeItem("feast_auth_token");
    localStorage.removeItem("feast_was_admin");
    localStorage.removeItem("feast_guest_mode");
    if (typeof onComplete === "function") onComplete();
  }
};
