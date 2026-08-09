"use client";

import { useState } from "react";
import Link from "next/link";
import type { OrderWithItems, OrderStatusHistory } from "@/lib/db/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case "paid":
      case "confirmed":
      case "delivered":
        return { bg: "rgba(107, 203, 119, 0.12)", border: "rgba(107, 203, 119, 0.3)", color: "#6BCB77" };
      case "processing":
      case "shipped":
        return { bg: "rgba(77, 150, 255, 0.12)", border: "rgba(77, 150, 255, 0.3)", color: "#4D96FF" };
      case "pending":
        return { bg: "rgba(201, 168, 76, 0.12)", border: "rgba(201, 168, 76, 0.3)", color: "#C9A84C" };
      default:
        return { bg: "rgba(255, 107, 107, 0.12)", border: "rgba(255, 107, 107, 0.3)", color: "#FF6B6B" };
    }
  };

  const style = getBadgeStyle(status);

  return (
    <span
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color,
        borderRadius: "999px",
        padding: "4px 12px",
        fontSize: "12px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {status}
    </span>
  );
}

type Props = {
  order: OrderWithItems;
  history?: OrderStatusHistory[];
};

export function CustomerOrderDetails({ order, history = [] }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyTracking = () => {
    if (!order.tracking_number) return;
    navigator.clipboard.writeText(order.tracking_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  // Determine timeline step index (0: Placed, 1: Paid, 2: Processing, 3: Shipped, 4: Delivered)
  const getTimelineStep = () => {
    const st = order.status;
    if (st === "delivered") return 4;
    if (st === "shipped") return 3;
    if (st === "processing") return 2;
    if (st === "paid" || st === "confirmed") return 1;
    return 0; // pending
  };

  const currentStep = getTimelineStep();

  const timelineSteps = [
    { label: "Order Placed", date: order.created_at },
    { label: "Payment Confirmed", date: order.status !== "pending" ? order.created_at : null },
    { label: "Processing & Fulfillment", date: order.synced_at },
    { label: "In Transit / Shipped", date: order.shipped_at },
    { label: "Delivered", date: order.delivered_at },
  ];

  const carrierUrl =
    order.tracking_url ||
    (order.tracking_number
      ? `https://www.17track.net/en/track?nums=${encodeURIComponent(order.tracking_number)}`
      : undefined);

  return (
    <div className="printable-order" style={{ display: "grid", gap: "28px" }}>
      {/* ── Top Header Actions ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <Link href="/orders" className="co-back-link" style={{ marginBottom: "8px", display: "inline-flex" }}>
            ← Back to Orders
          </Link>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", margin: "4px 0" }}>
            Order #{order.id.slice(0, 13)}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            Placed on {formatDate(order.created_at)}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <StatusBadge status={order.status} />
          <button
            onClick={handlePrintInvoice}
            className="co-coupon-btn"
            style={{ padding: "8px 16px", borderRadius: "10px", cursor: "pointer" }}
            type="button"
          >
            Download / Print Invoice
          </button>
        </div>
      </div>

      {/* ── Order Timeline Progress Bar ── */}
      <div
        style={{
          background: "var(--glass-bg-2)",
          border: "1px solid var(--glass-border)",
          borderRadius: "20px",
          padding: "24px",
        }}
      >
        <h3 style={{ fontSize: "14px", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "20px" }}>
          Shipment Progress
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", position: "relative" }}>
          {timelineSteps.map((step, idx) => {
            const isCompleted = idx <= currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div key={step.label} style={{ textAlign: "center", position: "relative" }}>
                {/* Circle step indicator */}
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    margin: "0 auto 8px",
                    background: isCompleted ? "var(--gold)" : "rgba(255, 255, 255, 0.08)",
                    color: isCompleted ? "#0A0A18" : "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "12px",
                    boxShadow: isCurrent ? "0 0 16px rgba(201, 168, 76, 0.5)" : "none",
                  }}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div style={{ fontSize: "12px", fontWeight: isCurrent ? "700" : "500", color: isCompleted ? "var(--foreground)" : "var(--muted)" }}>
                  {step.label}
                </div>
                {step.date && (
                  <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                    {formatDate(step.date)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tracking Details Card ── */}
      {order.tracking_number ? (
        <div
          style={{
            background: "rgba(77, 150, 255, 0.05)",
            border: "1px solid rgba(77, 150, 255, 0.25)",
            borderRadius: "20px",
            padding: "24px",
            display: "grid",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <p className="eyebrow" style={{ color: "#4D96FF" }}>Live Tracking Information</p>
              <h3 style={{ fontSize: "20px", margin: "2px 0 0" }}>
                {order.shipping_carrier || "Carrier Packet"}
              </h3>
            </div>
            {order.estimated_delivery && (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Estimated Delivery</span>
                <div style={{ fontSize: "15px", color: "var(--gold)", fontWeight: "600" }}>
                  {formatDate(order.estimated_delivery)}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.05)", padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--glass-border)", fontFamily: "monospace", fontSize: "14px", color: "var(--gold)" }}>
              {order.tracking_number}
            </div>

            <button
              onClick={handleCopyTracking}
              className="co-coupon-btn"
              type="button"
              style={{ padding: "10px 16px", borderRadius: "12px" }}
            >
              {copied ? "✓ Copied!" : "Copy Tracking Number"}
            </button>

            {carrierUrl && (
              <a
                href={carrierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="co-submit-btn"
                style={{ padding: "10px 20px", borderRadius: "12px", width: "auto", textDecoration: "none" }}
              >
                Open Carrier Tracking Page ↗
              </a>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--glass-bg-2)",
            border: "1px solid var(--glass-border)",
            borderRadius: "20px",
            padding: "20px 24px",
            color: "var(--muted)",
            fontSize: "14px",
          }}
        >
          📦 Tracking number will be assigned as soon as order dispatch is complete.
        </div>
      )}

      {/* ── Grid: Products List & Address Breakdown ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Ordered Products */}
        <div
          style={{
            background: "var(--glass-bg-2)",
            border: "1px solid var(--glass-border)",
            borderRadius: "20px",
            padding: "24px",
            display: "grid",
            gap: "16px",
          }}
        >
          <h3 style={{ fontSize: "16px", margin: 0 }}>Items in Order</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {order.order_items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {item.product_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product_image}
                    alt={item.product_title || "Product Image"}
                    style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "var(--glass-bg-3)" }} />
                )}
                <div style={{ flex: 1 }}>
                  <Link href={`/products/${item.product_slug}`} style={{ fontWeight: "600", color: "var(--foreground)", textDecoration: "none" }}>
                    {item.product_title}
                  </Link>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Qty: {item.quantity} × {formatPrice(item.unit_price)}
                  </div>
                </div>
                <div style={{ fontWeight: "600", color: "var(--gold)" }}>
                  {formatPrice(item.quantity * item.unit_price)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div style={{ display: "grid", gap: "6px", fontSize: "13px", paddingTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Shipping</span>
              <span>{formatPrice(order.shipping_cost)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Tax</span>
              <span>{formatPrice(order.tax_amount)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#6BCB77" }}>
                <span>Discount ({order.coupon_code})</span>
                <span>−{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px", color: "var(--gold)", paddingTop: "8px", borderTop: "1px solid var(--glass-border)" }}>
              <span>Grand Total</span>
              <span>{formatPrice(order.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* Addresses & Invoice Summary */}
        <div style={{ display: "grid", gap: "20px" }}>
          {/* Shipping Address */}
          <div
            style={{
              background: "var(--glass-bg-2)",
              border: "1px solid var(--glass-border)",
              borderRadius: "20px",
              padding: "20px 24px",
            }}
          >
            <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", margin: "0 0 10px" }}>
              Shipping Destination
            </h4>
            <p style={{ margin: 0, lineHeight: "1.5", fontSize: "14px", color: "var(--foreground)" }}>
              <strong>{order.shipping_address.first_name} {order.shipping_address.last_name}</strong>
              <br />
              {order.shipping_address.address_line1}
              {order.shipping_address.address_line2 && `, ${order.shipping_address.address_line2}`}
              <br />
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
              <br />
              {order.shipping_address.country}
            </p>
          </div>

          {/* Audit Trail Timeline */}
          {history.length > 0 && (
            <div
              style={{
                background: "var(--glass-bg-2)",
                border: "1px solid var(--glass-border)",
                borderRadius: "20px",
                padding: "20px 24px",
              }}
            >
              <h4 style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", margin: "0 0 12px" }}>
                Shipment Activity History
              </h4>
              <div style={{ display: "grid", gap: "10px" }}>
                {history.map((h) => (
                  <div key={h.id} style={{ fontSize: "12px", borderLeft: "2px solid var(--gold)", paddingLeft: "10px" }}>
                    <div style={{ fontWeight: "600" }}>{h.new_status.toUpperCase()}</div>
                    {h.note && <div style={{ color: "var(--muted)", fontSize: "11px" }}>{h.note}</div>}
                    <div style={{ fontSize: "10px", color: "var(--muted-subtle)" }}>{formatDate(h.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
