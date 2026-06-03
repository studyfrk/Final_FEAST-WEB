/* React & Firebase Imports */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, reload, signOut, applyActionCode, checkActionCode } from "firebase/auth";
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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
  • Users opens the link in a different browser/tab (no session) → "no_session":
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
      HOW THIS WORKS WITH handleCodeInApp: true
      ──────────────────────────────────────────
      With handleCodeInApp: true in SignUp.jsx, Firebase NO LONGER pre-processes
      the verification at firebaseapp.com. Instead, the user is sent directly to
      /verify-email with the raw oobCode in the URL query string.

      This page must call applyActionCode(oobCode) itself to mark the email as
      verified in Firebase Auth, then upgrade Firestore status.

      TWO PATHS — determined by whether a session exists:

      A) Session present (same browser/tab as signup):
         - oobCode is in the URL → applyActionCode() → reload() confirms emailVerified
         - Look up user by uid → upgrade Firestore → sign out

      B) No session (link opened in a different browser/device):
         - oobCode is in the URL → checkActionCode() for email → applyActionCode()
         - Look up user in Firestore by email → upgrade Firestore directly
         - No sign-in required
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

    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get("oobCode");

    // Overall safety timeout
    const timeout = setTimeout(() => {
      setStatus(prev => (prev === "loading" ? "error" : prev));
    }, 20000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // ── PATH B: No session ───────────────────────────────────────────────
        if (!oobCode) {
          clearTimeout(timeout);
          setStatus("not_verified");
          return;
        }

        try {
          // Get the email from the code before consuming it
          const info = await checkActionCode(auth, oobCode);
          const email = info.data.email;

          // Mark the email as verified in Firebase Auth
          await applyActionCode(auth, oobCode);

          // Use the Cloud Function to securely bypass Firestore rules and upgrade the user
          const functions = getFunctions(undefined, "asia-southeast1");
          const upgradeVerifiedUser = httpsCallable(functions, 'upgradeVerifiedUser');

          try {
            await upgradeVerifiedUser({ email: email });
            clearTimeout(timeout);
            setStatus("success");
          } catch (funcErr) {
            clearTimeout(timeout);
            console.error("Cloud function error:", funcErr);
            setStatus(funcErr.code === "already_done" || funcErr.message.includes("already upgraded") ? "already_done" : "error");
          }
        } catch (err) {
          clearTimeout(timeout);
          console.error("VerifyEmail no-session error:", err);
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
        if (oobCode) {
          // Apply the code ourselves (required with handleCodeInApp: true)
          await applyActionCode(auth, oobCode);
        }

        // Reload the user so emailVerified reflects the change
        const verified = await waitForEmailVerified(user, { attempts: 8, intervalMs: 1000 });
        clearTimeout(timeout);

        if (!verified) {
          await signOut(auth).catch(() => { });
          setStatus("not_verified");
          return;
        }

        // Force token refresh so Firestore rules see email_verified=true
        await user.getIdToken(true);

        const userRef = doc(db, "users", user.uid);
        const result = await upgradeStatus(userRef);

        setStatus(result);
        await signOut(auth).catch(() => { }); // sign out — pending admin approval

      } catch (err) {
        clearTimeout(timeout);
        console.error("VerifyEmail session error:", err);
        // Code already used (e.g. page refreshed) — check if already upgraded
        if (oobCode && (err.code === "auth/invalid-action-code" || err.code === "auth/expired-action-code")) {
          try {
            await user.getIdToken(true);
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            const st = snap.data()?.status;
            await signOut(auth).catch(() => { });
            setStatus(st !== "email_unconfirmed" ? "already_done" : "error");
          } catch {
            await signOut(auth).catch(() => { });
            setStatus("already_done");
          }
        } else {
          try {
            await user.getIdToken(true);
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            const st = snap.data()?.status;
            await signOut(auth).catch(() => { });
            if (st && st !== "email_unconfirmed") {
              setStatus("already_done");
            } else {
              setStatus("error");
            }
          } catch {
            await signOut(auth).catch(() => { });
            setStatus("error");
          }
        }
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
        approval — you'll have access once it's active.
      </p>
      <button className={styles.authButton} onClick={() => navigate("/")}>
        Go to Sign In
      </button>
    </>
  );

  const NotVerified = () => (
    <>
      <div className={styles.emailSentIcon} style={{ backgroundColor: "#fefce8", borderColor: "#f7eaa6", color: "#fde047" }}>
        <CheckCircle2 size={40} strokeWidth={1.5} />
      </div>
      <h2 className={styles.welcomeMessage}>Your Account is Pending Admin Approval</h2>
      <p className={styles.emailSentBody}>
        Please bare with us as this is a precautionary measure in securing your account.
        Your security is always our priority!
        Please try logging in again later.
      </p>
      <button className={styles.authButton} onClick={() => navigate("/signin")}>
        Back to Sign In
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
    loading: <Loading />,
    success: <Success />,
    already_done: <AlreadyDone />,
    not_verified: <NotVerified />,
    error: <ErrorState />,
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