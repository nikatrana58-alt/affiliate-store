import type { Metadata } from "next";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/app/checkout.css";

export const metadata: Metadata = {
  title: "Customer Account Dashboard | Curated Finds",
  description: "Manage your profile, order history, active shipments, saved addresses, wishlist, and settings.",
};

export default function AccountPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />

      <main className="flex-1 checkout-shell" style={{ padding: "32px 22px 100px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <CustomerDashboard />
        </div>
      </main>

      <Footer />
    </div>
  );
}
