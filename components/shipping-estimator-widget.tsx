"use client";

/**
 * components/shipping-estimator-widget.tsx
 *
 * Real-time Printful Shipping Rate Estimator Widget for product pages.
 */

import { useState } from "react";
import type { PrintfulShippingRate } from "@/lib/printful/types";

export interface ShippingEstimatorWidgetProps {
  variantId?: number | string;
  className?: string;
}

export function ShippingEstimatorWidget({ variantId, className = "" }: ShippingEstimatorWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [countryCode, setCountryCode] = useState("US");
  const [stateCode, setStateCode] = useState("CA");
  const [zip, setZip] = useState("90001");
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<PrintfulShippingRate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dynamic realistic delivery estimate calculation (Current date + 4 to 7 days)
  const deliveryRange = () => {
    const start = new Date();
    start.setDate(start.getDate() + 4);
    const end = new Date();
    end.setDate(end.getDate() + 7);

    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${startStr} – ${endStr}`;
  };

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRates(null);

    try {
      const res = await fetch("/api/printful/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: {
            name: "Customer",
            address1: "123 Main St",
            city: "City",
            state_code: stateCode,
            country_code: countryCode,
            zip,
            email: "customer@example.com",
          },
          items: [{ variant_id: variantId ? Number(variantId) : 4011, quantity: 1 }],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to calculate shipping rates");
      }

      setRates(data.rates || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to estimate shipping rates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`shipping-estimator-container ${className}`} style={{ marginTop: "24px" }}>
      {/* Task 6: Realistic Delivery Estimate Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 16px",
          borderRadius: "12px",
          background: "rgba(212, 175, 55, 0.08)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          marginBottom: "12px",
          color: "#FFFFFF",
          fontSize: "13px",
        }}
      >
        <span style={{ fontSize: "16px" }}>📦</span>
        <div>
          <span style={{ color: "var(--gold)", fontWeight: 700 }}>Estimated Delivery: </span>
          <strong style={{ color: "#FFFFFF" }}>{deliveryRange()}</strong>
          <span style={{ color: "var(--muted)", fontSize: "12px", marginLeft: "6px" }}>(Standard Express Shipping)</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "12px",
          padding: "12px 16px",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#FFFFFF",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          🚚 Calculate Custom Rates & International Delivery
        </span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "16px",
            marginTop: "8px",
          }}
        >
          <form onSubmit={handleEstimate} style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    color: "#FFF",
                    padding: "8px",
                    fontSize: "13px",
                  }}
                >
                  <option value="US">United States (US)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="AU">Australia (AU)</option>
                  <option value="DE">Germany (DE)</option>
                  <option value="FR">France (FR)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>
                  State / Code
                </label>
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="CA"
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    color: "#FFF",
                    padding: "8px",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", fontWeight: 700 }}>
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="90001"
                  style={{
                    width: "100%",
                    background: "#0F172A",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "6px",
                    color: "#FFF",
                    padding: "8px",
                    fontSize: "13px",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "linear-gradient(135deg, #C9A84C, #F3E5AB)",
                color: "#0F172A",
                border: "none",
                borderRadius: "8px",
                padding: "10px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Calculating..." : "Calculate Shipping"}
            </button>
          </form>

          {error && <p style={{ color: "#FF6B6B", fontSize: "13px", marginTop: "12px" }}>{error}</p>}

          {rates && rates.length > 0 && (
            <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
              {rates.map((rate) => (
                <div
                  key={rate.id}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "#FFF", fontSize: "13px" }}>{rate.name}</div>
                    <div style={{ color: "#94A3B8", fontSize: "12px" }}>
                      Est. Delivery: {rate.minDeliveryDays}-{rate.maxDeliveryDays} business days
                    </div>
                  </div>
                  <div style={{ color: "#C9A84C", fontWeight: 700, fontSize: "14px" }}>
                    ${parseFloat(rate.rate).toFixed(2)} {rate.currency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
