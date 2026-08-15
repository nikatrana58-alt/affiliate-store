"use client";

import { useState, useMemo } from "react";
import type { Product } from "@/lib/products";
import { formatProductDetails } from "@/lib/utils/product-formatter";

type ProductTabsProps = {
  product: Product;
};

export function ProductTabs({ product }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<"description" | "specs" | "shipping" | "returns" | "faqs">("description");

  const details = useMemo(() => {
    return formatProductDetails(product.description, product.category);
  }, [product.description, product.category]);

  const faqs = [
    {
      q: "How will my order be shipped?",
      a: "Tracking availability depends on the selected shipping method. When tracking is available, tracking details are sent by email.",
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
          { id: "description", label: "Description & Overview" },
          { id: "specs", label: "Specifications" },
          { id: "shipping", label: "Shipping & Delivery" },
          { id: "returns", label: "Returns & Guarantee" },
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
          <div style={{ color: "var(--foreground-secondary)", fontSize: "15px", lineHeight: "1.7", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Overview */}
            <div>
              <h3 style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
                Overview
              </h3>
              <p style={{ margin: 0 }}>{details.overview}</p>
            </div>

            {/* Key Features */}
            <div>
              <h3 style={{ color: "#FFFFFF", fontSize: "16px", fontWeight: 700, marginBottom: "10px" }}>
                Key Features
              </h3>
              <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {details.keyFeatures.map((feat, idx) => (
                  <li key={idx} style={{ color: "var(--foreground)" }}>{feat}</li>
                ))}
              </ul>
            </div>

            {/* Material & Specifications Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "8px" }}>
              <div style={{ padding: "16px", borderRadius: "14px", backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h4 style={{ color: "var(--gold)", fontSize: "13px", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Material & Build</h4>
                <p style={{ color: "#FFFFFF", fontSize: "14px", margin: 0, fontWeight: 600 }}>{details.material}</p>
              </div>

              <div style={{ padding: "16px", borderRadius: "14px", backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <h4 style={{ color: "var(--gold)", fontSize: "13px", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Available Sizes</h4>
                <p style={{ color: "#FFFFFF", fontSize: "14px", margin: 0, fontWeight: 600 }}>{details.availableSizes}</p>
              </div>
            </div>

            {/* Care Instructions */}
            <div style={{ padding: "16px", borderRadius: "14px", backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <h4 style={{ color: "#FFFFFF", fontSize: "15px", fontWeight: 700, margin: "0 0 6px" }}>Care Instructions</h4>
              <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>{details.careInstructions}</p>
            </div>
          </div>
        )}

        {activeTab === "specs" && (
          <div style={{ color: "var(--foreground-secondary)", fontSize: "14px" }}>
            <h3 style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>
              Product Specifications
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
              <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>Category</span>
                <strong style={{ color: "#FFFFFF" }}>{product.category || "General"}</strong>
              </div>
              {product.brand && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                  <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>Brand</span>
                  <strong style={{ color: "#FFFFFF" }}>{product.brand}</strong>
                </div>
              )}
              {product.sku && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                  <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>SKU</span>
                  <strong style={{ color: "#FFFFFF" }}>{product.sku}</strong>
                </div>
              )}
              {product.dimensions && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                  <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>Dimensions</span>
                  <strong style={{ color: "#FFFFFF" }}>{product.dimensions}</strong>
                </div>
              )}
              {product.weight && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                  <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>Weight</span>
                  <strong style={{ color: "#FFFFFF" }}>{product.weight}</strong>
                </div>
              )}
              <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                <span style={{ color: "var(--muted)", fontSize: "12px", display: "block" }}>Collection</span>
                <strong style={{ color: "var(--gold)" }}>{product.badge || "RA2Z Curation"}</strong>
              </div>
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div style={{ color: "var(--foreground-secondary)", fontSize: "14px", lineHeight: "1.7", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h3 style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>
                Shipping & Fulfillment
              </h3>
              <p style={{ margin: 0 }}>{details.shipping}</p>
              <ul style={{ paddingLeft: "20px", marginTop: "12px", color: "var(--muted)" }}>
                <li>Real-time tracking link dispatched via email</li>
                <li>SSL Encrypted order management</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "returns" && (
          <div style={{ color: "var(--foreground-secondary)", fontSize: "14px", lineHeight: "1.7", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ color: "#FFFFFF", fontSize: "18px", fontWeight: 700, margin: 0 }}>
              Returns & Guarantee
            </h3>
            <p style={{ margin: 0 }}>{details.returns}</p>
            <div style={{ padding: "16px", borderRadius: "14px", backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <h4 style={{ color: "var(--gold)", fontSize: "14px", fontWeight: 700, margin: "0 0 6px" }}>Customer Support</h4>
              <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
                If your order arrives damaged or incorrect, contact support for prompt resolution.
              </p>
            </div>
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
