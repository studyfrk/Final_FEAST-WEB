import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

/*
  PublicRoute
  ───────────
  Allows access to pages like SignIn and SignUp.
  Redirects away only if the user is fully authenticated AND their
  account status is "active" — preventing a verified+approved user
  from landing on the sign-in page again.

  Does NOT redirect if status is anything other than "active", so
  users whose accounts are pending or unverified can still see the
  sign-in page with the appropriate error message.

  Anonymous/guest users are also allowed through.
*/

const PublicRoute = ({ children }) => {
  const [state, setState] = useState("loading"); // "loading" | "redirect" | "allow"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || user.isAnonymous) {
        setState("allow");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const status = snap.exists() ? (snap.data().status || "").toLowerCase() : "";

        if (status === "active") {
          setState("redirect_active");
        } else if (status === "rejected") {
          setState("redirect_rejected");
        } else {
          setState("allow");
        }
      } catch {
        setState("allow");
      }
    });

    return () => unsubscribe();
  }, []);

  if (state === "loading") return null; // Blank while checking — avoids flash

  if (state === "redirect_active") {
    const isAdmin = localStorage.getItem("feast_was_admin") === "true";
    return <Navigate to={isAdmin ? "/admin/users" : "/home"} replace />;
  }

  if (state === "redirect_rejected") {
    return <Navigate to="/rejected" replace />;
  }

  return children;
};

export default PublicRoute;