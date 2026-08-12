import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export const metadata: Metadata = {
  title: "Terms of Service | RA2Z",
  description: "Review the terms and conditions governing store usage, order placement, pricing, and fulfillment for RA2Z.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "120px 22px 100px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#FFFFFF" }}>Terms of Service</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)", margin: "0 0 8px", letterSpacing: "2px" }}>
            TERMS & CONDITIONS
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 700, margin: 0 }}>
            Terms of Service
          </h1>
          <div style={{ width: "60px", height: "2px", background: "var(--gold)", marginTop: "16px", borderRadius: "2px" }} />
        </div>

        <div style={{ display: "grid", gap: "28px", lineHeight: "1.7", color: "rgba(255, 255, 255, 0.85)", fontSize: "15px" }}>
          {/* Store Acceptance */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              General Store Terms
            </h2>
            <p style={{ margin: 0 }}>
              By accessing RA2Z or placing an order, you agree to these Terms of Service. RA2Z is an online retail platform offering curated consumer goods. All orders placed are subject to product availability and payment verification.
            </p>
          </div>

          {/* Pricing & Order Acceptance */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Pricing & Order Acceptance
            </h2>
            <p style={{ marginBottom: "16px" }}>
              Product prices displayed are determined by RA2Z server-authoritative pricing logic. Total order amounts (including item price, dynamic shipping freight, and validated promo discounts) are presented prior to checkout completion.
            </p>
            <p style={{ margin: 0 }}>
              An order is formally accepted upon successful payment authorization through Stripe Hosted Checkout and confirmation via automated order processing.
            </p>
          </div>

          {/* Shipping & Freight */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Shipping Availability & International Fees
            </h2>
            <p style={{ marginBottom: "16px" }}>
              Shipping freight rates and delivery transit estimates are calculated dynamically from supplier logistics channels based on destination. Checkout blocks order placement for unsupported destination countries.
            </p>
            <p style={{ margin: 0 }}>
              Applicable taxes, customs duties, import charges, and destination fees are the responsibility of the party legally responsible for them under applicable international regulations.
            </p>
          </div>

          {/* Cancellations & After-Sales */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Cancellations & After-Sales
            </h2>
            <p style={{ marginBottom: "16px" }}>
              Order cancellations are state-based and permitted only while the supplier order remains in a cancellable state. If supplier fulfillment processing has commenced, cancellation cannot be accepted.
            </p>
            <p style={{ margin: 0 }}>
              After-sales resolutions (returns, refunds, replacements) follow the supplier-aligned dispute resolution process outlined in our{" "}
              <Link href="/returns" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
                Returns & Refunds Policy
              </Link>.
            </p>
          </div>

          {/* Governing Law */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Governing Law
            </h2>
            <p style={{ margin: 0 }}>
              These Terms of Service and any transactions conducted through RA2Z shall be governed by and construed in accordance with the <strong>Laws of India</strong>. Specific court jurisdiction is pending formal legal review.
            </p>
          </div>

          {/* Contact Information */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Contact Information
            </h2>
            <p style={{ margin: 0 }}>
              Questions regarding these Terms of Service should be directed to{" "}
              <a href="mailto:ra2z.support@gmail.com" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
                ra2z.support@gmail.com
              </a>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
