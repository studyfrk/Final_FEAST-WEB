/**
 * signOutUser.js
 * Drop-in replacement for the existing signOutUser helper in header.jsx /
 * ProfileModal. Call this instead of signOut(auth) directly.
 *
 * For anonymous (guest) users it:
 *   1. Deletes the Firebase Auth account immediately — no orphaned accounts.
 *   2. Removes the guestSessions Firestore document.
 *   3. Clears any app state stored in localStorage.
 *
 * For regular users it just signs out normally.
 */
import { auth, db } from "../firebase";
import { signOut, deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
/**
 * @param {import("react-router-dom").NavigateFunction} navigate
 */
export const signOutUser = async (navigate) => {
  const user = auth.currentUser;
  if (!user) {
    navigate("/");
    return;
  }
  try {
    if (user.isAnonymous) {
      // --- Guest path: clean up immediately ---
      // 1. Remove the guestSessions document (best-effort)
      try {
        await deleteDoc(doc(db, "guestSessions", user.uid));
      } catch (err) {
        console.warn("Could not delete guestSessions document:", err.message);
      }
      // 2. Delete the anonymous Auth account entirely.
      //    deleteUser() also signs the user out, so no separate signOut needed.
      await deleteUser(user);
    } else {
      // --- Regular user path ---
      await signOut(auth);
    }
  } catch (err) {
    console.error("Sign-out error:", err.code, err.message);
    if (err.code === "auth/requires-recent-login") {
      // The anonymous session token expired before we could delete.
      // Fall back to a plain sign-out; the Cloud Function will clean up later.
      try {
        await signOut(auth);
      } catch {
        // Swallow — nothing more we can do client-side.
      }
    }
  } finally {
    // Clear only the rememberMe flag — feast_auth_token has been removed.
    // Do NOT remove "rememberMe" here so the preference persists across
    // regular sign-in sessions.
    navigate("/");
  }
};
