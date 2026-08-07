"use client";

import React, { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-context";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalTab } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">(authModalTab || "signin");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    setTab(authModalTab);
    setError(null);
    setSuccess(null);
  }, [authModalTab, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseClientAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      closeAuthModal();
    } catch (err: any) {
      console.error("[auth-modal] Google sign in failed:", err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseClientAuth();
      await signInWithEmailAndPassword(auth, email, password);
      closeAuthModal();
    } catch (err: any) {
      console.error("[auth-modal] Email sign in failed:", err);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const auth = getFirebaseClientAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name || email.split("@")[0],
        });
      }

      closeAuthModal();
    } catch (err: any) {
      console.error("[auth-modal] Sign up failed:", err);
      setError(err.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const auth = getFirebaseClientAuth();
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset link has been sent to your email.");
    } catch (err: any) {
      console.error("[auth-modal] Reset password failed:", err);
      setError(err.message || "Unable to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={closeAuthModal}
    >
      <div
        className="auth-modal-card"
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "linear-gradient(145deg, #111116 0%, #0A0A0E 100%)",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          borderRadius: "24px",
          boxShadow: "0 32px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(212, 175, 55, 0.15)",
          padding: "32px",
          position: "relative",
          color: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          aria-label="Close Authentication Modal"
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            color: "#aaa",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: "24px", color: "var(--gold)", marginBottom: "6px" }}>
            {tab === "signin" && "Welcome Back to RA2Z"}
            {tab === "signup" && "Create Your RA2Z Account"}
            {tab === "forgot" && "Reset Password"}
          </h2>
          <p style={{ fontSize: "13px", color: "#888" }}>
            {tab === "signin" && "Sign in to access your luxury profile, wishlist, and orders."}
            {tab === "signup" && "Join our elite member circle for bespoke luxury access."}
            {tab === "forgot" && "Enter your email to receive a password reset link."}
          </p>
        </div>

        {/* Tab Selector */}
        {tab !== "forgot" && (
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: "12px",
              padding: "4px",
              marginBottom: "24px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <button
              onClick={() => { setTab("signin"); setError(null); }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: tab === "signin" ? "var(--gold)" : "transparent",
                color: tab === "signin" ? "#000" : "#aaa",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab("signup"); setError(null); }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: tab === "signup" ? "var(--gold)" : "transparent",
                color: tab === "signup" ? "#000" : "#aaa",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Google Sign In Button */}
        {tab !== "forgot" && (
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.2.0 10.04.0 12s.47 3.8 1.29 5.42l3.99-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "20px 0", color: "#555", fontSize: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
              <span style={{ padding: "0 12px" }}>OR EMAIL</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
            </div>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(255, 68, 68, 0.12)", border: "1px solid rgba(255, 68, 68, 0.3)", borderRadius: "8px", color: "#ff6b6b", fontSize: "13px", marginBottom: "16px" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: "10px 14px", background: "rgba(76, 175, 80, 0.12)", border: "1px solid rgba(76, 175, 80, 0.3)", borderRadius: "8px", color: "#66bb6a", fontSize: "13px", marginBottom: "16px" }}>
            {success}
          </div>
        )}

        {/* Sign In Form */}
        {tab === "signin" && (
          <form onSubmit={handleEmailSignIn} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "6px" }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "6px" }}>Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "35px",
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                onClick={() => { setTab("forgot"); setError(null); setSuccess(null); }}
                style={{ background: "none", border: "none", color: "var(--gold)", fontSize: "12px", cursor: "pointer" }}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "var(--gold)",
                color: "#000",
                fontWeight: 700,
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
                marginTop: "8px",
              }}
            >
              {loading ? "Signing In…" : "Sign In to Account"}
            </button>
          </form>
        )}

        {/* Create Account Form */}
        {tab === "signup" && (
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alexander Wright"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>Phone Number (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "30px",
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                }}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>Confirm Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                style={{
                  width: "100%",
                  padding: "10px 42px 10px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "30px",
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                }}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: "var(--gold)",
                color: "#000",
                fontWeight: 700,
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
                marginTop: "6px",
              }}
            >
              {loading ? "Creating Account…" : "Create RA2Z Account"}
            </button>
          </form>
        )}

        {/* Forgot Password Form */}
        {tab === "forgot" && (
          <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#aaa", marginBottom: "6px" }}>Your Registered Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fff",
                  outline: "none",
                  fontSize: "14px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "var(--gold)",
                color: "#000",
                fontWeight: 700,
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {loading ? "Sending Link…" : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => { setTab("signin"); setError(null); setSuccess(null); }}
              style={{ background: "none", border: "none", color: "#aaa", fontSize: "13px", cursor: "pointer", marginTop: "8px" }}
            >
              ← Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
