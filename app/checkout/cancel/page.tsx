import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "../checkout.css";

export const metadata: Metadata = {
  title: "Payment Cancelled | RA2Z",
  description: "Your payment session was cancelled.",
};

export default function CancelPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell">
        <div className="co-success">
          <div
            className="co-success-icon"
            style={{
              background: "rgba(255, 107, 107, 0.10)",
              borderColor: "rgba(255, 107, 107, 0.25)",
              color: "var(--danger)",
            }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="40"
              height="40"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <h1 className="co-success-title">Payment Cancelled</h1>

          <p className="co-success-note">
            Your payment session was cancelled. No charges were made, and your shopping
            cart items are still saved.
          </p>

          <div className="flex gap-4 mt-6">
            <Link href="/checkout" className="co-empty-cta">
              Return to Checkout
            </Link>
            <Link
              href="/"
              className="co-back-link"
              style={{
                background: "var(--glass-bg-3)",
                padding: "12px 20px",
                borderRadius: "14px",
                border: "1px solid var(--glass-border)",
              }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
