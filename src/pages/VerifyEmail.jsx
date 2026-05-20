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
  2. Firebase sends verification email. Link goes to firebaseapp.com/__/auth/action,
     Firebase verifies the oobCode there, sets emailVerified=true on the Auth session,
     then redirects the SAME tab to /verify-email (the continueUrl).
  3. Because we never signed out, onAuthStateChanged fires here with the same user —
     now with emailVerified=true — and we update Firestore status to "unverified".

  EDGE CASES
  ──────────
  • User opens link in a different browser/tab (no session) → "no_session" state:
    show success-like UI telling them their email is confirmed and to await admin approval.
    SignIn.jsx will complete the Firestore upgrade on their next login.
  • Link already used / expired → Firebase never redirects here; they'd land on the
    Firebase error page. But if they navigate here manually with no session and their
    status is already "unverified" or beyond → "already_done".
*/

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    // Safety timeout: if onAuthStateChanged never fires within 10s, bail out
    const timeout = setTimeout(() => {
      setStatus(prev => (prev === "loading" ? "no_session" : prev));
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);

      if (!user) {
        // No session in this tab. Two sub-cases:
        // a) They opened the link in a different browser (email IS verified in Auth).
        // b) They manually navigated here.
        // We can't distinguish without a session, so show the friendly pending screen.
        // SignIn.jsx handles the Firestore upgrade on next login.
        setStatus("no_session");
        return;
      }

      try {
        // Force-refresh the user object so emailVerified reflects the latest state
        await reload(user);
        // Force token refresh so Firestore rules see email_verified=true immediately
        await user.getIdToken(true);

        if (!user.emailVerified) {
          // Session exists but email not yet verified — user arrived here without
          // clicking the link (e.g. redirect from SignIn for email_unconfirmed accounts).
          // Just sign them out and show the "not verified" screen.
          await signOut(auth).catch(() => {});
          setStatus("not_verified");
          return;
        }

        // Email IS verified — now update Firestore
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
        // Sign out now — the account is pending admin approval, not yet active
        await signOut(auth).catch(() => {});

      } catch (err) {
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

  // ✅ Main success — session was present, Firestore updated
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

  // ✅ No session but email was verified server-side — show same success message.
  //    Firestore upgrade will happen on next SignIn via SignIn.jsx fallback.
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

  // Shown when the user lands here without having clicked the email link
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