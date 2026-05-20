/* React & Firebase Imports */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, reload, signOut } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
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
    // Overall safety timeout (attempts * intervalMs + buffer = ~17s)
    const timeout = setTimeout(() => {
      setStatus(prev => (prev === "loading" ? "no_session" : prev));
    }, 18000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Don't clear the timeout yet — we may still be polling

      if (!user) {
        clearTimeout(timeout);
        // No session: user likely opened the link in a different browser/tab.
        // Firebase already verified the email server-side; show the success screen.
        // The Firestore status upgrade happens in SignIn.jsx on their next login.
        setStatus("no_session");
        return;
      }

      try {
        // Poll until emailVerified=true or we give up (~15s window)
        const verified = await waitForEmailVerified(user, { attempts: 10, intervalMs: 1500 });
        clearTimeout(timeout);

        if (!verified) {
          // User landed here without having clicked the link yet,
          // or Firebase propagation failed entirely.
          await signOut(auth).catch(() => {});
          setStatus("not_verified");
          return;
        }

        // Force token refresh so Firestore rules see email_verified=true
        await user.getIdToken(true);

        // Check + update Firestore status
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await signOut(auth).catch(() => {});
          setStatus("error");
          return;
        }

        const currentStatus = snap.data().status;

        if (currentStatus !== "email_unconfirmed") {
          // Already upgraded (link clicked twice, or admin already acted)
          await signOut(auth).catch(() => {});
          setStatus("already_done");
          return;
        }

        // Upgrade: email_unconfirmed → unverified (enters admin approval queue)
        await updateDoc(userRef, {
          status: "unverified",
          emailVerifiedAt: new Date().toISOString(),
        });

        setStatus("success");
        // Sign out now — account is pending admin approval, not yet active
        await signOut(auth).catch(() => {});

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

  // ✅ No session — email verified server-side, Firestore upgrade deferred to SignIn
  const NoSession = () => (
    <>
      <div className={styles.emailSentIcon} style={{ backgroundColor: "#f0faf0", borderColor: "#c8e6c9", color: "#2e7d32" }}>
        <CheckCircle2 size={40} strokeWidth={1.5} />
      </div>
      <h2 className={styles.welcomeMessage}>Email Verified!</h2>
      <p className={styles.emailSentBody}>
        Your email address has been confirmed. Your account is now awaiting
        administrator approval before you can sign in.
      </p>
      <p className={styles.emailSentNote}>
        You'll be notified once an administrator activates your account.
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
    no_session:   <NoSession />,
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
