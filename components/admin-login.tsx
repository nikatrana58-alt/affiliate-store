"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getFirebaseClientAuth } from "@/lib/firebase/client";

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSigningIn(true);

    try {
      const auth = getFirebaseClientAuth();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/admin/session", {
        body: JSON.stringify({ idToken }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        await auth.signOut();
        throw new Error(result.error || "Unable to sign in.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (signInError) {
      console.error("[admin-auth] Sign in failed.", signInError);
      setError(
        signInError instanceof Error ? signInError.message : "Unable to sign in.",
      );
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
        </form>
      </section>
    </main>
  );
}
