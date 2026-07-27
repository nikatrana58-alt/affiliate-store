"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalErrorBoundary] Captured runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell flex items-center justify-center" style={{ padding: "60px 20px" }}>
        <div style={{ maxWidth: "500px", textAlign: "center" }} className="panel">
          <p className="eyebrow" style={{ color: "var(--danger)" }}>System Exception</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", margin: "8px 0 16px" }}>
            Something Went Wrong
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "24px" }}>
            An unexpected error occurred. Our team has been notified. You can retry the operation or return home.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="button primary" onClick={reset} type="button" style={{ padding: "10px 20px" }}>
              Try Again
            </button>
            <Link href="/" className="button secondary" style={{ padding: "10px 20px", textDecoration: "none" }}>
              Back to Store
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
