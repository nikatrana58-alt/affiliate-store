import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CheckoutSuccessClient } from "@/components/checkout-success-client";
import { getOrderByStripeSessionId } from "@/lib/orders";
import "../checkout.css";

export const metadata: Metadata = {
  title: "Order Confirmed | RA2Z Luxury",
  description: "Thank you for your order with RA2Z Luxury.",
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
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white">
      <Navbar />
      <CheckoutSuccessClient />

      <main className="flex-1 checkout-shell" style={{ padding: "60px 22px 120px" }}>
        <div
          className="co-success"
          style={{
            maxWidth: "680px",
            margin: "0 auto",
            backgroundColor: "rgba(21, 21, 21, 0.9)",
            borderRadius: "28px",
            border: "1px solid rgba(212, 175, 55, 0.3)",
            padding: "48px 36px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
            textAlign: "center",
          }}
        >
          {/* Animated Gold Checkmark */}
          <div
            style={{
              width: "72px",
              height: "72px",
              margin: "0 auto 24px",
              borderRadius: "50%",
              backgroundColor: "rgba(212, 175, 55, 0.15)",
              border: "1px solid rgba(212, 175, 55, 0.5)",
              boxShadow: "0 0 30px rgba(212, 175, 55, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gold)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="36"
              height="36"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
          </div>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "36px",
              fontWeight: 700,
              margin: "0 0 12px",
              color: "#FFFFFF",
            }}
          >
            Order Confirmed!
          </h1>

          {order ? (
            <>
              <p style={{ color: "var(--gold)", fontSize: "15px", fontWeight: 700, margin: "0 0 16px" }}>
                Order Reference: #{order.id.slice(0, 8).toUpperCase()}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "15px", lineHeight: "1.6", margin: "0 0 32px" }}>
                Thank you, <strong>{order.customer_first_name}</strong>! Your order of{" "}
                <strong style={{ color: "#FFFFFF" }}>{formatPrice(order.grand_total)}</strong> has been processed cleanly.
                Confirmation and dispatch tracking details have been sent to <strong>{order.customer_email}</strong>.
              </p>

              {/* Delivery Estimate Box */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "16px",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  marginBottom: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <span style={{ color: "var(--muted)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Estimated Delivery
                  </span>
                  <p style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: 700, margin: "2px 0 0" }}>
                    2 - 4 Business Days
                  </p>
                </div>
                <span style={{ fontSize: "24px" }}>🚚</span>
              </div>

              {order.order_items.length > 0 && (
                <div style={{ width: "100%", marginBottom: "32px", textAlign: "left" }}>
                  <h2 style={{ color: "#FFFFFF", fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
                    Order Summary
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          borderRadius: "12px",
                          backgroundColor: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                        }}
                      >
                        <div>
                          <p style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 600, margin: "0 0 2px" }}>
                            {item.product_title}
                          </p>
                          <p style={{ color: "var(--muted)", fontSize: "12px", margin: 0 }}>
                            Qty: {item.quantity} × {formatPrice(item.unit_price)}
                          </p>
                        </div>
                        <p style={{ color: "var(--gold)", fontSize: "14px", fontWeight: 700, margin: 0 }}>
                          {formatPrice(item.unit_price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "15px", lineHeight: "1.6", margin: "0 0 32px" }}>
              Thank you for your purchase! Your order is being processed and a confirmation
              email with live tracking link will arrive shortly.
            </p>
          )}

          {/* Action CTAs */}
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/orders"
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
              Track Your Order →
            </Link>
            <Link
              href="/collections/luxury"
              style={{
                padding: "14px 28px",
                borderRadius: "999px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Explore Collection
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
