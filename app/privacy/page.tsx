import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export const metadata: Metadata = {
  title: "Privacy Policy | RA2Z",
  description: "Learn how RA2Z collects, uses, and protects your personal information and transaction data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "120px 22px 100px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#FFFFFF" }}>Privacy Policy</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)", margin: "0 0 8px", letterSpacing: "2px" }}>
            DATA & PRIVACY
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 700, margin: 0 }}>
            Privacy Policy
          </h1>
          <div style={{ width: "60px", height: "2px", background: "var(--gold)", marginTop: "16px", borderRadius: "2px" }} />
        </div>

        <div style={{ display: "grid", gap: "28px", lineHeight: "1.7", color: "rgba(255, 255, 255, 0.85)", fontSize: "15px" }}>
          {/* Information We Collect */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Information We Collect
            </h2>
            <p style={{ marginBottom: "16px" }}>
              When you browse RA2Z or place an order, we collect information necessary to fulfill your purchase, manage your account, and provide customer support:
            </p>
            <ul style={{ paddingLeft: "20px", margin: 0, display: "grid", gap: "8px" }}>
              <li><strong>Contact & Shipping Data:</strong> First and last name, email address, telephone number, and physical shipping/billing address provided at checkout.</li>
              <li><strong>Order Data:</strong> Selected product items, variant options, pricing totals, and order reference identifiers.</li>
              <li><strong>Tracking & Communication Data:</strong> Delivery status updates and support correspondence sent to ra2z.support@gmail.com.</li>
            </ul>
          </div>

          {/* Payment Card Isolation */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Payment Card Protection
            </h2>
            <p style={{ margin: 0 }}>
              Payment card details (such as credit card numbers, CVVs, and expiration dates) are processed securely through <strong>Stripe Hosted Checkout</strong>. Payment card information is submitted directly to Stripe and <strong>does not pass through or store on RA2Z application servers</strong>.
            </p>
          </div>

          {/* Third-Party Service Relationships */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Third-Party Data Integrations
            </h2>
            <p style={{ marginBottom: "16px" }}>
              To complete order fulfillment and store operations, necessary data is shared strictly with authorized third-party service providers:
            </p>
            <ul style={{ paddingLeft: "20px", margin: 0, display: "grid", gap: "8px" }}>
              <li><strong>Stripe:</strong> Payment processing, fraud prevention, and session verification.</li>
              <li><strong>CJ Dropshipping / Logistics Carriers:</strong> Order shipping address, recipient contact details, and item details for package delivery.</li>
              <li><strong>Resend Email Service:</strong> Transmission of order confirmations, tracking alerts, and support communications.</li>
              <li><strong>Google Analytics (where active):</strong> Aggregated site usage measurement.</li>
            </ul>
          </div>

          {/* Order Tracking Security */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Order Tracking Authorization
            </h2>
            <p style={{ margin: 0 }}>
              Access to detailed order tracking information, items, and shipping addresses requires customer email verification matching the order record to prevent unauthorized access.
            </p>
          </div>

          {/* Contact Assistance */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Privacy Inquiries
            </h2>
            <p style={{ margin: 0 }}>
              For any questions regarding your data or privacy practices, please contact us at{" "}
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
