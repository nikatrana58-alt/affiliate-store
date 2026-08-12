import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export const metadata: Metadata = {
  title: "Returns & Refunds Policy | RA2Z",
  description: "Understand the supplier-aligned return, refund, and cancellation policies for RA2Z orders.",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "120px 22px 100px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#FFFFFF" }}>Returns & Refunds</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)", margin: "0 0 8px", letterSpacing: "2px" }}>
            AFTER-SALES & RESOLUTION
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 700, margin: 0 }}>
            Returns & Refunds Policy
          </h1>
          <div style={{ width: "60px", height: "2px", background: "var(--gold)", marginTop: "16px", borderRadius: "2px" }} />
        </div>

        <div style={{ display: "grid", gap: "28px", lineHeight: "1.7", color: "rgba(255, 255, 255, 0.85)", fontSize: "15px" }}>
          {/* Supplier-Aligned After-Sales Model */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Supplier-Aligned Return & Resolution Model
            </h2>
            <p style={{ marginBottom: "16px" }}>
              RA2Z follows a supplier-aligned after-sales resolution framework. Return, refund, replacement, or reshipment resolutions are provided where the applicable supplier (CJ Dropshipping) after-sales or dispute process supports the corresponding resolution.
            </p>
            <p style={{ margin: 0 }}>
              General change-of-mind returns are not automatically eligible for return or refund.
            </p>
          </div>

          {/* Damaged, Defective, or Incorrect Deliveries */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Damaged, Defective, or Mis-Shipped Items
            </h2>
            <p style={{ marginBottom: "16px" }}>
              If your order arrives damaged, defective, or incorrect due to a supplier fulfillment error, please contact our support team immediately at{" "}
              <a href="mailto:ra2z.support@gmail.com" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
                ra2z.support@gmail.com
              </a>.
            </p>
            <p style={{ margin: 0 }}>
              When submitting an issue, RA2Z will request the documentation required by the applicable supplier dispute process. Depending on the supplier case outcome, approved resolutions may include a refund, replacement, or authorized reshipment.
            </p>
          </div>

          {/* Sizing & Measurements */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Customer-Selected Sizing
            </h2>
            <p style={{ margin: 0 }}>
              Orders with customer-selected sizing choices based on personal measurements are not automatically eligible for return or refund. Customers are encouraged to review verified supplier size charts and measurements available on product detail pages before placing an order. If a supplier sends a size that contradicts the verified chart, the issue may be reviewed under the supplier dispute process.
            </p>
          </div>

          {/* Order Cancellations */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Order Cancellation Policy
            </h2>
            <p style={{ marginBottom: "16px" }}>
              Customer order cancellation requests are allowed only while the corresponding supplier order remains in a cancellable state within the supplier fulfillment system.
            </p>
            <p style={{ margin: 0 }}>
              When a cancellation request is received, RA2Z submits the request to the supplier. If the supplier rejects the cancellation because processing, packaging, or dispatch has already commenced, the order cannot be cancelled.
            </p>
          </div>

          {/* Refund Method & Timelines */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Refund Issuance & Timelines
            </h2>
            <p style={{ marginBottom: "16px" }}>
              Where an approved supplier case results in a financial refund, RA2Z issues the refund directly to the customer’s <strong>original payment method</strong> used at checkout.
            </p>
            <p style={{ margin: 0 }}>
              Refunds are processed according to the applicable payment provider, banking/network, and supplier processing timelines.
            </p>
          </div>

          {/* Contact Assistance */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              How to Initiate an After-Sales Inquiry
            </h2>
            <p style={{ margin: 0 }}>
              To initiate an inquiry regarding an order issue, please email{" "}
              <a href="mailto:ra2z.support@gmail.com" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
                ra2z.support@gmail.com
              </a>{" "}
              with your order reference ID and details of your request. Please contact support before attempting to send any item back.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
