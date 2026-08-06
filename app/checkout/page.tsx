import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { CheckoutForm } from "@/components/checkout-form";
import { Footer } from "@/components/footer";
import "./checkout.css";

export const metadata: Metadata = {
  title: "Checkout | RA2Z Luxury",
  description: "Complete your order at RA2Z Luxury — review your cart, enter shipping details, and place your order.",
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
