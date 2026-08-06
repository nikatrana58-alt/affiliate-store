import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell flex items-center justify-center" style={{ padding: "80px 20px" }}>
        <div
          style={{
            maxWidth: "520px",
            textAlign: "center",
            backgroundColor: "rgba(21, 21, 21, 0.9)",
            borderRadius: "28px",
            border: "1px solid rgba(212, 175, 55, 0.25)",
            padding: "48px 32px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>👑</div>
          <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "3px" }}>404 PAGE NOT FOUND</p>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "38px", margin: "8px 0 16px" }}>
            Uncharted Territory
          </h1>
          <p style={{ fontSize: "15px", color: "var(--muted)", lineHeight: "1.6", marginBottom: "32px" }}>
            The requested piece or page cannot be found. Explore our curated collections or return to the main storefront.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Link
              href="/"
              style={{
                padding: "14px 28px",
                borderRadius: "999px",
                backgroundColor: "var(--gold)",
                color: "#0A0A0A",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(212, 175, 55, 0.3)",
              }}
            >
              Return to Storefront →
            </Link>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link
                href="/collections/luxury"
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "13px",
                  textDecoration: "none",
                }}
              >
                Luxury Collection
              </Link>
              <Link
                href="/collections/originals"
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: "13px",
                  textDecoration: "none",
                }}
              >
                RA2Z Originals
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
