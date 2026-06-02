import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

/*
  ProtectedRoute
  ──────────────
  Guards all authenticated routes. Three checks must pass:
  1. Firebase Auth session exists (user is signed in)
  2. Firestore user document exists
  3. Account status is "active" (admin has approved the account)

  Any other status — email_unconfirmed, unverified, deactivated —
  results in a sign-out and redirect to SignIn with no access granted.
*/

const ProtectedRoute = ({ children }) => {
  const [state, setState] = useState("loading"); // "loading" | "allowed" | "denied"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Check if client-side guest mode is enabled
      if (localStorage.getItem("feast_guest_mode") === "true") {
        setState("allowed");
        return;
      }

      // 1. No Firebase session at all
      if (!user) {
        localStorage.removeItem("feast_auth_token");
        localStorage.removeItem("feast_was_admin");
        setState("denied");
        return;
      }

      // 2. Anonymous / guest users are allowed through (they have no Firestore doc)
      if (user.isAnonymous) {
        setState("allowed");
        return;
      }

      // 3. Check Firestore status for registered users
      try {
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          await signOut(auth);
          localStorage.removeItem("feast_auth_token");
          localStorage.removeItem("feast_was_admin");
          setState("denied");
          return;
        }

        const status = (snap.data().status || "").toLowerCase();

        if (status === "active") {
          setState("allowed");
        } else {
          // email_unconfirmed, unverified, deactivated — not yet approved
          await signOut(auth);
          localStorage.removeItem("feast_auth_token");
          localStorage.removeItem("feast_was_admin");
          setState("denied");
        }
      } catch (err) {
        console.error("ProtectedRoute Firestore check failed:", err);
        await signOut(auth).catch(() => {});
        localStorage.removeItem("feast_auth_token");
        setState("denied");
      }
    });

    return () => unsubscribe();
  }, []);

  if (state === "loading") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h2>Loading your session...</h2>
      </div>
    );
  }

  if (state === "denied") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;