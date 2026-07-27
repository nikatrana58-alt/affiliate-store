"use client";

import { useEffect, useState } from "react";

type Metrics = {
  totalRevenue: number;
  totalOrdersCount: number;
  uniqueCustomers: number;
  aov: number;
  ltv: number;
  returningCustomers: number;
  returningRate: number;
  conversionRate: number;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(price);
}

export function AdminGrowthAnalytics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/growth-analytics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) return <p className="status">Loading growth analytics...</p>;
  if (!metrics) return null;

  return (
    <div className="panel" style={{ marginTop: "24px" }}>
      <div className="section-heading" style={{ marginBottom: "16px" }}>
        <div>
          <p className="eyebrow" style={{ color: "#6BCB77" }}>Revenue & LTV</p>
          <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontFamily: "'Playfair Display', serif" }}>
            Growth & Funnel Performance
          </h3>
        </div>
        <button className="button secondary" onClick={fetchMetrics} type="button" style={{ padding: "6px 12px", fontSize: "11px" }}>
          Refresh Growth Metrics
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Average Order Value (AOV)</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--gold)", marginTop: "4px" }}>
            {formatPrice(metrics.aov)}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Per completed checkout</div>
        </div>

        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Customer Lifetime Value (LTV)</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#6BCB77", marginTop: "4px" }}>
            {formatPrice(metrics.ltv)}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Average revenue per customer</div>
        </div>

        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Returning Customers</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#4D96FF", marginTop: "4px" }}>
            {metrics.returningRate}%
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>{metrics.returningCustomers} repeat buyers</div>
        </div>

        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Conversion Rate</div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--gold)", marginTop: "4px" }}>
            {metrics.conversionRate}%
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Checkout conversion rate</div>
        </div>
      </div>
    </div>
  );
}
