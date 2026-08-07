import type { Metadata } from "next";
import { CustomerOrderLookup } from "@/components/customer-order-lookup";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { constructMetadata } from "@/lib/seo";
import "@/app/checkout.css";

export const metadata: Metadata = constructMetadata({
  title: "Track Your Order",
  description:
    "Track your shipment, view real-time delivery status, carrier updates, and order details for RA2Z creations.",
  path: "/orders",
});

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "115px 22px 100px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 0" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <p className="eyebrow" style={{ color: "var(--gold)" }}>Customer Portal</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", margin: "4px 0 8px" }}>
              Track Your Order
            </h1>
            <p className="muted" style={{ fontSize: "14px", color: "var(--muted)" }}>
              Enter your email address and Order ID to check shipment progress, carrier tracking, and order details.
            </p>
          </div>

          <CustomerOrderLookup />
        </div>
      </main>

      <Footer />
    </div>
  );
}
