"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";

type ProductTabsProps = {
  product: Product;
};

export function ProductTabs({ product }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<"description" | "specs" | "shipping" | "faqs">("description");

  const faqs = [
    {
      q: "Is this item authentic RA2Z quality?",
      a: "Yes. Every item in the RA2Z catalog undergoes thorough inspection to meet our luxury craftsmanship and material standards.",
    },
    {
      q: "How will my order be shipped?",
      a: "Orders are dispatched with end-to-end tracking. You will receive a tracking link via email as soon as your package ships.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept all major credit/debit cards (Visa, MasterCard, American Express, Discover) processed securely through Stripe 256-bit SSL encryption.",
    },
    {
      q: "Can I track my order status in real time?",
      a: "Absolutely. Simply visit our Track Order page and enter your Order ID or email address to view live delivery updates.",
    },
  ];

  return (
    <div
      style={{
        marginTop: "48px",
        borderRadius: "24px",
        backgroundColor: "rgba(21, 21, 21, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "32px 24px",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Tab Navigation Chips */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "16px",
          marginBottom: "28px",
          overflowX: "auto",
        }}
      >
        {[
          { id: "description", label: "Description & Craft" },
          { id: "specs", label: "Specifications" },
          { id: "shipping", label: "Shipping & Delivery" },
          { id: "faqs", label: "FAQs" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            type="button"
            style={{
              padding: "10px 20px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 600,
              border: activeTab === tab.id ? "1px solid rgba(212, 175, 55, 0.5)" : "1px solid transparent",
              backgroundColor: activeTab === tab.id ? "rgba(212, 175, 55, 0.15)" : "transparent",
              color: activeTab === tab.id ? "var(--gold)" : "var(--muted)",
              cursor: "pointer",
              transition: "all 0.25s ease",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "description" && (
          <div style={{ color: "var(--foreground-secondary)", fontSize: "15px", lineHeight: "1.7" }}>
            <h3 style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>
              About {product.title}
            </h3>
            <p>{product.description || "Designed with meticulous attention to detail and premium luxury materials."}</p>
          </div>
        )}

        {activeTab === "specs" && (
          <div style={{ color: "var(--foreground-secondary)", fontSize: "14px" }}>
            <h3 style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>
              Technical Specifications
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>Category</span>
                <strong style={{ color: "#FFFFFF" }}>{product.category || "Luxury"}</strong>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>Weight</span>
                <strong style={{ color: "#FFFFFF" }}>{product.weight || "Standard Luxury Weight"}</strong>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>SKU</span>
                <strong style={{ color: "#FFFFFF" }}>{product.sku || product.id.slice(0, 10).toUpperCase()}</strong>
              </div>
              <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>Badge</span>
                <strong style={{ color: "var(--gold)" }}>{product.badge || "Luxury Curation"}</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div style={{ color: "var(--foreground-secondary)", fontSize: "14px", lineHeight: "1.7" }}>
            <h3 style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>
              Shipping & Fulfillment Timeline
            </h3>
            <p>Orders are processed within 1-2 business days with rigorous quality control inspections prior to dispatch.</p>
            <ul style={{ paddingLeft: "20px", marginTop: "12px", color: "var(--muted)" }}>
              <li>Real-time tracking link dispatched via email</li>
              <li>Signature options available on high-value orders</li>
              <li>SSL Encrypted order management</li>
            </ul>
          </div>
        )}

        {activeTab === "faqs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{ padding: "16px", borderRadius: "14px", backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <h4 style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: 700, margin: "0 0 6px" }}>{faq.q}</h4>
                <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, lineHeight: "1.6" }}>{faq.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
