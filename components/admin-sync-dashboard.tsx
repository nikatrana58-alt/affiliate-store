"use client";

/**
 * components/admin-sync-dashboard.tsx
 *
 * Admin Control Panel for Printful Product Synchronization, Sync Logs, Cache Management,
 * and Webhook Health Monitoring.
 */

import { useState } from "react";

export function AdminSyncDashboard() {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const triggerSync = async (mode: "incremental" | "full") => {
    setLoading(true);
    setStatusMessage(`Initiating Printful ${mode.toUpperCase()} synchronization...`);

    try {
      const res = await fetch(`/api/cron/sync?mode=${mode}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Sync execution failed");
      }
      setStatusMessage(`✅ Sync finished! ${data.message || "Success"}`);
    } catch (err: unknown) {
      setStatusMessage(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const syncSingle = async () => {
    const productIdStr = prompt("Enter Printful Sync Product ID (e.g. 7101):");
    if (!productIdStr) return;
    setLoading(true);
    setStatusMessage(`Syncing product ID ${productIdStr}...`);

    try {
      const res = await fetch("/api/printful/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sync_product_id: Number(productIdStr),
          markup_percent: 40,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to sync product");
      }
      setStatusMessage(`✅ Product "${data.product?.title}" successfully synchronized!`);
    } catch (err: unknown) {
      setStatusMessage(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "16px",
        padding: "24px",
        color: "#FFFFFF",
        marginTop: "24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
            🔄 Printful Smart Product Sync Engine
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94A3B8" }}>
            Automated synchronization for Printful catalog products, variants, stock, and pricing.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => triggerSync("incremental")}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
            color: "#FFF",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Syncing..." : "Run Incremental Sync"}
        </button>

        <button
          type="button"
          onClick={() => triggerSync("full")}
          disabled={loading}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            color: "#FFF",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          Run Full Sync
        </button>

        <button
          type="button"
          onClick={syncSingle}
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #C9A84C, #F3E5AB)",
            color: "#0F172A",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          + Sync Single Product ID
        </button>
      </div>

      {statusMessage && (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "13px",
            color: "#E2E8F0",
            fontFamily: "monospace",
          }}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}
