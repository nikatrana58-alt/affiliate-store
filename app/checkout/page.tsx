import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { CheckoutForm } from "@/components/checkout-form";
import { Footer } from "@/components/footer";
import "./checkout.css";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order at Curated Finds — review your cart, enter shipping details, and place your order.",
};

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <main className="checkout-shell">
        <CheckoutForm />
      </main>
      <Footer />
    </>
  );
}
