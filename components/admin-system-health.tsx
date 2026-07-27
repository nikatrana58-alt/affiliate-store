"use client";

import { useEffect, useState } from "react";

type HealthData = {
  status: string;
  timestamp: string;
  latencyMs: number;
  services: {
    database: { status: string; latencyMs: number; ordersCount: number };
    stripe: { status: string };
    cjDropshipping: { status: string };
    emailService: { provider: string; queuedCount: number; failedCount: number; sentCount: number };
  };
};

export function AdminSystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error("[AdminSystemHealth] Failed to fetch health:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading && !health) return <p className="status">Checking system health...</p>;
  if (!health) return null;

  return (
    <div className="panel" style={{ marginTop: "24px" }}>
      <div className="section-heading" style={{ marginBottom: "16px" }}>
        <div>
          <p className="eyebrow" style={{ color: "#6BCB77" }}>System Status</p>
          <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontFamily: "'Playfair Display', serif" }}>
            Production Health Dashboard
          </h3>
        </div>
        <button className="button secondary" onClick={fetchHealth} type="button" style={{ padding: "6px 12px", fontSize: "11px" }}>
          Refresh Metrics
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Database Latency</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#6BCB77", marginTop: "4px" }}>
            {health.services.database.latencyMs} ms
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Status: {health.services.database.status}</div>
        </div>

        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Stripe Integration</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--gold)", marginTop: "4px" }}>
            {health.services.stripe.status.replace("_", " ")}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Webhook Security: Active</div>
        </div>

        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>CJ Dropshipping API</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#4D96FF", marginTop: "4px" }}>
            {health.services.cjDropshipping.status.replace("_", " ")}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Token Auth Caching: Active</div>
        </div>

        <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Email Queue</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#6BCB77", marginTop: "4px" }}>
            {health.services.emailService.sentCount} Sent / {health.services.emailService.failedCount} Failed
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>Provider: {health.services.emailService.provider}</div>
        </div>
      </div>
    </div>
  );
}
