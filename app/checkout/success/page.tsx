import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CheckoutSuccessClient } from "@/components/checkout-success-client";
import { getOrderByStripeSessionId } from "@/lib/orders";
import "../checkout.css";

export const metadata: Metadata = {
  title: "Order Confirmed | Curated Finds",
  description: "Thank you for your order.",
};

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

export default async function SuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;
  const order = session_id ? await getOrderByStripeSessionId(session_id) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A18] text-white">
      <Navbar />
      <CheckoutSuccessClient />

      <main className="flex-1 checkout-shell">
        <div className="co-success">
          <div className="co-success-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="40"
              height="40"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
          </div>

          <h1 className="co-success-title">Payment Successful!</h1>

          {order ? (
            <>
              <p className="co-success-ref">
                Order Reference: <strong>{order.id}</strong>
              </p>
              <p className="co-success-note">
                Thank you, <strong>{order.customer_first_name}</strong>! Your order of{" "}
                <strong>{formatPrice(order.grand_total)}</strong> has been confirmed.
                A confirmation has been sent to <strong>{order.customer_email}</strong>.
              </p>

              {order.order_items.length > 0 && (
                <div
                  className="co-section"
                  style={{ width: "100%", marginTop: "24px", textAlign: "left" }}
                >
                  <h2 className="co-section-title">Order Items</h2>
                  <div className="co-summary-items">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="co-order-item">
                        <div className="co-order-item-info">
                          <p className="co-order-item-title">{item.product_title}</p>
                          <p className="co-order-item-cat">
                            Qty: {item.quantity} × {formatPrice(item.unit_price)}
                          </p>
                        </div>
                        <p className="co-order-item-price">
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="co-success-note">
              Thank you for your purchase! Your order is being processed and a confirmation
              email will be sent to you shortly.
            </p>
          )}

          <Link href="/" className="co-empty-cta" style={{ marginTop: "24px" }}>
            Return to Storefront
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
