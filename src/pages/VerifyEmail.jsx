import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, reload, signOut } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { CheckCircle2, XCircle, Loader } from "lucide-react";
import styles from "../components/sign_up.module.css";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    // Give Firebase a moment to rehydrate the session from localStorage.
    // On a fresh tab there can be a slight delay before onAuthStateChanged fires.
    const timeout = setTimeout(() => {
      // If still loading after 10s, something is wrong
      setStatus(prev => prev === "loading" ? "not_verified" : prev);
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);

      if (!user) {
        // No session — user likely opened the link in a new tab/browser.
        // Firebase has already verified the email server-side, but we have
        // no session to confirm it with. Instruct them to sign in so the
        // session can be re-established, then re-check.
        setStatus("no_session");
        return;
      }

      try {
        // Force-refresh both the user object AND the ID token
        await reload(user);
        // Force token refresh so emailVerified is current in the token
        await user.getIdToken(true);

        if (!user.emailVerified) {
          setStatus("not_verified");
          await signOut(auth);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setStatus("error");
          await signOut(auth);
          return;
        }

        const currentStatus = snap.data().status;

        if (currentStatus !== "email_unconfirmed") {
          setStatus("already_done");
          await signOut(auth);
          return;
        }

        await updateDoc(userRef, {
          status: "unverified",
          emailVerifiedAt: new Date().toISOString(),
        });

        setStatus("success");
        await signOut(auth);
      } catch (err) {
        console.error("VerifyEmail error:", err);
        setStatus("error");
        try { await signOut(auth); } catch (_) {}
      }
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // --- UI States ---

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

  // NEW: Handles the case where user opened the link in a different browser/tab
  const NoSession = () => (
    <>
      <div className={styles.emailSentIcon} style={{ backgroundColor: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" }}>
        <CheckCircle2 size={40} strokeWidth={1.5} />
      </div>
      <h2 className={styles.welcomeMessage}>One More Step</h2>
      <p className={styles.emailSentBody}>
        Your email was verified, but we need you to sign in once so we can
        finish activating your account. Please sign in with the account you
        just registered, then come back to this page.
      </p>
      <button className={styles.authButton} onClick={() => navigate("/")}>
        Go to Sign In
      </button>
    </>
  );

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
      <h2 className={styles.welcomeMessage}>Link Expired or Invalid</h2>
      <p className={styles.emailSentBody}>
        This verification link has expired, already been used, or is invalid.
        Please sign up again or request a new verification email.
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
    no_session:   <NoSession />,   // new state
    success:      <Success />,
    already_done: <AlreadyDone />,
    not_verified: <NotVerified />,
    error:        <ErrorState />,
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authFormContainer}>
        <div className={styles.emailSentWrapper}>
          {screens[status]}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
