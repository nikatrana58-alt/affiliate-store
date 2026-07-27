import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell flex items-center justify-center" style={{ padding: "80px 20px" }}>
        <div style={{ maxWidth: "480px", textAlign: "center" }} className="panel">
          <p className="eyebrow" style={{ color: "var(--gold)" }}>404 Error</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", margin: "4px 0 12px" }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "28px" }}>
            The requested page or resource could not be located. It may have been moved or removed.
          </p>

          <Link href="/" className="button primary" style={{ display: "inline-flex", padding: "10px 24px" }}>
            Return to Store Front
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
