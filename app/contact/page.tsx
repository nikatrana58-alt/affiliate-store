import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export const metadata: Metadata = {
  title: "Contact Us | RA2Z Support",
  description: "Get in touch with RA2Z customer support for order inquiries, shipment tracking, or product assistance.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "120px 22px 100px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#FFFFFF" }}>Contact Us</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)", margin: "0 0 8px", letterSpacing: "2px" }}>
            CUSTOMER SUPPORT
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 700, margin: 0 }}>
            Contact Us
          </h1>
          <div style={{ width: "60px", height: "2px", background: "var(--gold)", marginTop: "16px", borderRadius: "2px" }} />
        </div>

        {/* Contact Info Box */}
        <div style={{ display: "grid", gap: "28px" }}>
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(201, 168, 76, 0.12)", border: "1px solid rgba(201, 168, 76, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                ✉️
              </div>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Email Support</h2>
                <p style={{ color: "var(--muted)", fontSize: "14px", margin: "2px 0 0" }}>Primary channel for all inquiries</p>
              </div>
            </div>

            <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "15px", lineHeight: "1.7", marginBottom: "20px" }}>
              Have a question about an order, shipment status, product details, or after-sales assistance? Send an email to our support team:
            </p>

            <div style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "16px 20px", display: "inline-block", marginBottom: "20px" }}>
              <a
                href="mailto:ra2z.support@gmail.com"
                style={{ color: "var(--gold)", fontSize: "18px", fontWeight: 700, textDecoration: "none", letterSpacing: "0.5px" }}
              >
                ra2z.support@gmail.com
              </a>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0, fontStyle: "italic" }}>
              We will respond as soon as possible.
            </p>
          </div>

          {/* Quick Helpful Links */}
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px", display: "grid", gap: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Self-Service Assistance</h3>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px", margin: 0, lineHeight: "1.6" }}>
              To check the status of an existing order or track a shipment, please visit our dedicated lookup portal:
            </p>
            <div>
              <Link
                href="/orders"
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background: "var(--gold)",
                  color: "#000000",
                  fontWeight: 700,
                  fontSize: "13px",
                  textDecoration: "none",
                }}
              >
                Track Your Order →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
