"use client";

import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

function getSignInErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "auth/invalid-credential"
  ) {
    return "Invalid email or password.";
  }

  return error instanceof Error ? error.message : "Unable to sign in.";
}

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function createAdminSession(idToken: string) {
    const response = await fetch("/api/admin/session", {
      body: JSON.stringify({ idToken }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(result.error || "Unable to sign in.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSigningIn(true);

    try {
      const auth = getFirebaseClientAuth();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      try {
        await createAdminSession(idToken);
      } catch (sessionError) {
        await auth.signOut();
        throw sessionError;
      }

      router.replace("/admin");
      router.refresh();
    } catch (signInError) {
      const message = getSignInErrorMessage(signInError);

      console.warn("[admin-auth] Sign in failed.", message);
      setError(message);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsSigningIn(true);

    try {
      const auth = getFirebaseClientAuth();
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();

      try {
        await createAdminSession(idToken);
      } catch (sessionError) {
        await auth.signOut();
        throw sessionError;
      }

      router.replace("/admin");
      router.refresh();
    } catch (signInError) {
      const message = getSignInErrorMessage(signInError);

      console.warn("[admin-auth] Sign in failed.", message);
      setError(message);
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <p className="eyebrow">Affiliate Store</p>
        <h1>Admin sign in</h1>
        <p className="muted">
          Use the Firebase account configured as the store administrator.
        </p>
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? <p className="notification error">{error}</p> : null}
          <button className="button primary" disabled={isSigningIn} type="submit">
            {isSigningIn ? "Signing in..." : "Sign in"}
          </button>
          <button
            className="button secondary"
            disabled={isSigningIn}
            onClick={handleGoogleSignIn}
            type="button"
          >
            Sign in with Google
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;

