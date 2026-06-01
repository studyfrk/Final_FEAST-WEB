/* React & Firebase Imports */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, reload, signOut, applyActionCode, checkActionCode } from "firebase/auth";
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { CheckCircle2, XCircle, Loader } from "lucide-react";

/* Style Imports */
import styles from "../components/sign_up.module.css";

/*
  HOW THIS WORKS
  ──────────────
  1. User registers → session kept alive (no signOut in SignUp.jsx).
  2. Firebase sends verification email. The link goes to firebaseapp.com/__/auth/action,
     Firebase verifies the oobCode there, sets emailVerified=true on the Auth session,
     then redirects the same tab back to /verify-email (the continueUrl).
  3. Because we never signed out, onAuthStateChanged fires here with the same user.
     We poll reload() in a loop (up to ~10s) until emailVerified=true propagates,
     then write the Firestore status upgrade from "email_unconfirmed" → "unverified".

  WHY POLLING
  ───────────
  Firebase Auth's emailVerified flag can take a few seconds to propagate after the
  firebaseapp.com redirect. A single reload() call immediately after the redirect
  often still returns false. Polling with short delays solves this reliably.

  EDGE CASES
  ──────────
  • User opens the link in a different browser/tab (no session) → "no_session":
    show a success-like "awaiting admin approval" screen.
    SignIn.jsx will complete the Firestore upgrade on their next login.
  • Poll exhausted and emailVerified never became true → "not_verified".
*/

/** Poll reload() until emailVerified=true or maxAttempts is exhausted. */
const waitForEmailVerified = async (user, { attempts = 10, intervalMs = 1500 } = {}) => {
  for (let i = 0; i < attempts; i++) {
    await reload(user);
    if (user.emailVerified) return true;
    if (i < attempts - 1) {
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }
  return false;
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    /*
      TWO PATHS:
      A) Session present  → poll reload() until emailVerified=true, then upgrade Firestore.
      B) No session       → user clicked the link in a different browser/tab.
                            Use the oobCode in the URL: applyActionCode() confirms the email
                            server-side, checkActionCode() gives us the email address, then
                            we query Firestore by email and upgrade the status directly —
                            no sign-in required.
    */

    /** Upgrade a Firestore user doc from email_unconfirmed → unverified. */
    const upgradeStatus = async (userRef) => {
      const snap = await getDoc(userRef);
      if (!snap.exists()) throw new Error("user_not_found");
      const currentStatus = snap.data().status;
      if (currentStatus !== "email_unconfirmed") return "already_done";
      await updateDoc(userRef, {
        status: "unverified",
        emailVerifiedAt: new Date().toISOString(),
      });
      return "success";
    };

    // Overall safety timeout
    const timeout = setTimeout(() => {
      setStatus(prev => (prev === "loading" ? "error" : prev));
    }, 20000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // ── PATH B: No session ───────────────────────────────────────────
        // Try to use the oobCode from the URL to apply + look up the user.
        const params = new URLSearchParams(window.location.search);
        const oobCode = params.get("oobCode");

        if (!oobCode) {
          // No code and no session — nothing we can do
          clearTimeout(timeout);
          setStatus("not_verified");
          return;
        }

        try {
          // Get the email address from the action code before applying it
          const info = await checkActionCode(auth, oobCode);
          const email = info.data.email;

          // Apply the action code to mark the email as verified in Firebase Auth
          await applyActionCode(auth, oobCode);

          // Look up the Firestore user doc by email
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", email.toLowerCase()));
          const snapshot = await getDocs(q);

          if (snapshot.empty) {
            clearTimeout(timeout);
            setStatus("error");
            return;
          }

          const userDoc = snapshot.docs[0];
          const result = await upgradeStatus(userDoc.ref);
          clearTimeout(timeout);
          setStatus(result); // "success" or "already_done"
        } catch (err) {
          clearTimeout(timeout);
          console.error("VerifyEmail no-session error:", err);
          // oobCode already used or expired
          if (err.code === "auth/invalid-action-code" || err.code === "auth/expired-action-code") {
            setStatus("already_done");
          } else {
            setStatus("error");
          }
        }
        return;
      }

      // ── PATH A: Session present ──────────────────────────────────────────
      try {
        const verified = await waitForEmailVerified(user, { attempts: 10, intervalMs: 1500 });
        clearTimeout(timeout);

        if (!verified) {
          await signOut(auth).catch(() => {});
          setStatus("not_verified");
          return;
        }

        // Force token refresh so Firestore rules see email_verified=true
        await user.getIdToken(true);

        const userRef = doc(db, "users", user.uid);
        const result = await upgradeStatus(userRef);

        setStatus(result); // "success" or "already_done"
        await signOut(auth).catch(() => {}); // sign out — pending admin approval

      } catch (err) {
        clearTimeout(timeout);
        console.error("VerifyEmail error:", err);
        setStatus("error");
        await signOut(auth).catch(() => {});
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // ── UI States ────────────────────────────────────────────────────────────

  const Loading = () => (
    <>
      <div className={styles.emailSentIcon} style={{ borderColor: "#d1d5db", color: "#6b7280" }}>
        <Loader size={40} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
      </div>
      <h2 className={styles.welcomeMessage}>Verifying your email…</h2>
      <p className={styles.emailSentBody}>Please wait a moment.</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  // ✅ Session present, Firestore updated successfully
  const Success = () => (
    <>
      <div className={styles.emailSentIcon} style={{ backgroundColor: "#f0faf0", borderColor: "#c8e6c9", color: "#2e7d32" }}>
        <CheckCircle2 size={40} strokeWidth={1.5} />
      </div>
      <h2 className={styles.welcomeMessage}>Email Verified!</h2>
      <p className={styles.emailSentBody}>
        Your email has been confirmed. Your registration request has been
        forwarded to an administrator for approval.
      </p>
      <p className={styles.emailSentNote}>
        You'll be able to sign in once an administrator activates your account.
        This typically takes 1–2 business days.
      </p>
      <button className={styles.authButton} onClick={() => navigate("/")}>
        Go to Sign In
      </button>
    </>
  );

  const AlreadyDone = () => (
    <>
      <div className={styles.emailSentIcon} style={{ backgroundColor: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" }}>
        <CheckCircle2 size={40} strokeWidth={1.5} />
      </div>
      <h2 className={styles.welcomeMessage}>Already Verified</h2>
      <p className={styles.emailSentBody}>
        Your email was already confirmed. Your account is pending administrator
        approval — you'll be notified once it's active.
      </p>
      <button className={styles.authButton} onClick={() => navigate("/")}>
        Go to Sign In
      </button>
    </>
  );

  const NotVerified = () => (
    <>
      <div className={styles.emailSentIcon} style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" }}>
        <XCircle size={40} strokeWidth={1.5} />
      </div>
      <h2 className={styles.welcomeMessage}>Email Not Yet Verified</h2>
      <p className={styles.emailSentBody}>
        Please check your inbox and click the verification link we sent you.
        If you didn't receive it, check your spam folder or sign up again.
      </p>
      <button className={styles.authButton} onClick={() => navigate("/signup")}>
        Back to Sign Up
      </button>
    </>
  );

  const ErrorState = () => (
    <>
      <div className={styles.emailSentIcon} style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" }}>
        <XCircle size={40} strokeWidth={1.5} />
      </div>
      <h2 className={styles.welcomeMessage}>Something Went Wrong</h2>
      <p className={styles.emailSentBody}>
        We couldn't complete the verification. Please try again or contact support.
      </p>
      <button className={styles.authButton} onClick={() => navigate("/signup")}>
        Back to Sign Up
      </button>
    </>
  );

  const screens = {
    loading:      <Loading />,
    success:      <Success />,
    already_done: <AlreadyDone />,
    not_verified: <NotVerified />,
    error:        <ErrorState />,
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authFormContainer}>
        <div className={styles.emailSentWrapper}>
          {screens[status] ?? <ErrorState />}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;