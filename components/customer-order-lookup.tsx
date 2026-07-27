"use client";

import { useState } from "react";
import Link from "next/link";
import type { OrderWithItems } from "@/lib/db/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case "paid":
      case "confirmed":
      case "delivered":
        return {
          bg: "rgba(107, 203, 119, 0.12)",
          border: "rgba(107, 203, 119, 0.3)",
          color: "#6BCB77",
        };
      case "processing":
      case "shipped":
        return {
          bg: "rgba(77, 150, 255, 0.12)",
          border: "rgba(77, 150, 255, 0.3)",
          color: "#4D96FF",
        };
      case "pending":
        return {
          bg: "rgba(201, 168, 76, 0.12)",
          border: "rgba(201, 168, 76, 0.3)",
          color: "#C9A84C",
        };
      default:
        return {
          bg: "rgba(255, 107, 107, 0.12)",
          border: "rgba(255, 107, 107, 0.3)",
          color: "#FF6B6B",
        };
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
        padding: "3px 10px",
        fontSize: "11px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {status}
    </span>
  );
}

export function CustomerOrderLookup() {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [error, setError] = useState("");

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const params = new URLSearchParams({ email: email.trim() });
      if (orderId.trim()) params.set("orderId", orderId.trim());

      const res = await fetch(`/api/orders/lookup?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Lookup failed.");
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* ── Lookup Form Panel ── */}
      <form
        onSubmit={handleLookup}
        style={{
          background: "var(--glass-bg-2)",
          border: "1px solid var(--glass-border)",
          borderRadius: "20px",
          padding: "24px",
          display: "grid",
          gap: "16px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          <div className="co-field">
            <label className="co-label" htmlFor="lookup-email">
              Email Address <span style={{ color: "var(--gold)" }}>*</span>
            </label>
            <input
              id="lookup-email"
              className="co-input"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="co-field">
            <label className="co-label" htmlFor="lookup-order-id">
              Order ID <span style={{ fontSize: "11px", color: "var(--muted)" }}>(Optional)</span>
            </label>
            <input
              id="lookup-order-id"
              className="co-input"
              type="text"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="co-coupon-error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className="co-submit-btn"
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}
        >
          {loading ? "Searching..." : "Lookup Orders"}
        </button>
      </form>

      {/* ── Results Section ── */}
      {searched && (
        <div style={{ display: "grid", gap: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600" }}>
            {orders.length === 0 ? "No Orders Found" : `Found ${orders.length} Order(s)`}
          </h2>

          {orders.length === 0 && !loading && (
            <div
              style={{
                background: "var(--glass-bg-3)",
                border: "1px solid var(--glass-border)",
                borderRadius: "16px",
                padding: "32px",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              No orders matched <strong>{email}</strong>. Please verify the email used at checkout.
            </div>
          )}

          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                background: "var(--glass-bg-2)",
                border: "1px solid var(--glass-border)",
                borderRadius: "16px",
                padding: "20px",
                display: "grid",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Order Reference</span>
                  <div style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--gold)", fontWeight: "600" }}>
                    {order.id}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <StatusBadge status={order.status} />
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>{formatDate(order.created_at)}</span>
                </div>
              </div>

              {/* Items overview */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "12px", display: "grid", gap: "8px" }}>
                {order.order_items.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span>
                      {item.product_title} × {item.quantity}
                    </span>
                    <span style={{ color: "var(--muted)" }}>{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Tracking info badge if available */}
              {order.tracking_number && (
                <div
                  style={{
                    background: "rgba(77, 150, 255, 0.08)",
                    border: "1px solid rgba(77, 150, 255, 0.2)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    Tracking: <strong>{order.shipping_carrier || "Carrier"}</strong> —{" "}
                    <code style={{ color: "#4D96FF" }}>{order.tracking_number}</code>
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                    Status: {order.fulfillment_status}
                  </span>
                </div>
              )}

              {/* Footer action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "12px" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>Total: </span>
                  <strong style={{ fontSize: "15px", color: "var(--gold)" }}>{formatPrice(order.grand_total)}</strong>
                </div>

                <Link
                  href={`/orders/${order.id}?email=${encodeURIComponent(order.customer_email)}`}
                  className="co-submit-btn"
                  style={{ padding: "8px 16px", fontSize: "12px", width: "auto" }}
                >
                  Track Shipment & Invoice
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
