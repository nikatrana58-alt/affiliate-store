import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export const metadata: Metadata = {
  title: "About RA2Z | Curated Online Store",
  description: "Learn about RA2Z — an online store providing handpicked curated items engineered for quality, functional design, and elevated style.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "120px 22px 100px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "24px", display: "flex", gap: "8px", alignItems: "center" }}>
          <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "#FFFFFF" }}>About RA2Z</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)", margin: "0 0 8px", letterSpacing: "2px" }}>
            CURATED ESSENTIALS
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 700, margin: 0 }}>
            About RA2Z
          </h1>
          <div style={{ width: "60px", height: "2px", background: "var(--gold)", marginTop: "16px", borderRadius: "2px" }} />
        </div>

        {/* Content Section */}
        <div style={{ display: "grid", gap: "28px", lineHeight: "1.7", color: "rgba(255, 255, 255, 0.85)", fontSize: "15px" }}>
          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Our Philosophy
            </h2>
            <p style={{ margin: 0 }}>
              RA2Z is a modern online retail destination dedicated to offering handpicked items engineered for quality, functional design, and elevated style. We focus on curating collections that seamlessly combine everyday utility with refined aesthetic presentation.
            </p>
          </div>

          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Global Sourcing & Direct Fulfillment
            </h2>
            <p style={{ marginBottom: "16px" }}>
              To bring you distinct products across diverse categories, RA2Z partners with established global manufacturing and logistics networks. Products listed on RA2Z are sourced and fulfilled directly through verified supplier logistics partners (including CJ Dropshipping and Printful).
            </p>
            <p style={{ margin: 0 }}>
              This direct fulfillment model allows us to dynamically compute real-time shipping carrier routes and offer global delivery directly from specialized production facilities to your doorstep.
            </p>
          </div>

          <div style={{ background: "var(--glass-bg-2)", border: "1px solid var(--glass-border)", borderRadius: "20px", padding: "32px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "#FFFFFF", marginTop: 0, marginBottom: "16px" }}>
              Customer Support
            </h2>
            <p style={{ margin: 0 }}>
              We are committed to providing clear communication regarding your orders, shipment tracking, and inquiries. For support or order assistance, please reach out to our dedicated team at{" "}
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
