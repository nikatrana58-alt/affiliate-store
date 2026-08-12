import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export const metadata: Metadata = {
  title: "Shipping & Fulfillment Policy | RA2Z",
  description: "Learn how shipping options, live carrier transit times, and international logistics are calculated for RA2Z orders.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "120px 22px 100px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#FFFFFF" }}>Shipping Policy</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)", margin: "0 0 8px", letterSpacing: "2px" }}>
            FULFILLMENT & DELIVERY
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 700, margin: 0 }}>
            Shipping Policy
          </h1>
          <div style={{ width: "60px", height: "2px", background: "var(--gold)", marginTop: "16px", borderRadius: "2px" }} />
        </div>

        <div style={{ display: "grid", gap: "28px", lineHeight: "1.7", color: "rgba(255, 255, 255, 0.85)", fontSize: "15px" }}>
          {/* Dynamic Freight Model */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Dynamic Carrier Freight Calculations
            </h2>
            <p style={{ marginBottom: "16px" }}>
              RA2Z utilizes a real-time dynamic shipping calculation system integrated with our global logistics network (CJ Open API). Shipping rates, available logistics carriers (such as LuWei Ordinary, YunExpress, CJPacket, or DHL), and estimated transit timelines are calculated dynamically at checkout based on:
            </p>
            <ul style={{ paddingLeft: "20px", margin: 0, display: "grid", gap: "8px" }}>
              <li>The specific item(s) and variant dimensions in your cart</li>
              <li>The designated delivery destination country and postal code</li>
              <li>Live real-time carrier availability and freight pricing</li>
            </ul>
          </div>

          {/* Delivery Estimates & Carrier Forwarding */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Delivery Times & Logistics Selection
            </h2>
            <p style={{ marginBottom: "16px" }}>
              Because transit timelines depend on destination country and carrier capacity, actual estimated business days are displayed during the checkout process prior to order confirmation.
            </p>
            <p style={{ margin: 0 }}>
              When you select a specific shipping method at checkout, that exact carrier and logistics option is forwarded directly to the fulfillment system for order dispatch.
            </p>
          </div>

          {/* Destination Availability & Unsupported Countries */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Destination Availability
            </h2>
            <p style={{ margin: 0 }}>
              RA2Z ships to destinations supported by our global logistics partners. If real-time carrier lookup determines that no viable shipping routes exist for a specific destination, checkout will block order submission to ensure unfulfillable orders are not accepted.
            </p>
          </div>

          {/* International Duties & Taxes */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Customs, Taxes & Import Duties
            </h2>
            <p style={{ margin: 0 }}>
              Applicable taxes, customs duties, import charges, and destination fees are the responsibility of the party legally responsible for them under applicable international regulations.
            </p>
          </div>

          {/* Order Tracking */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Shipment Tracking
            </h2>
            <p style={{ margin: 0 }}>
              Once your package is dispatched by the logistics carrier, tracking information is assigned to your order. You can track your shipment anytime via our{" "}
              <Link href="/orders" style={{ color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>
                Order Tracking Portal
              </Link>{" "}
              by verifying your email address.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
