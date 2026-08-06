"use client";

import { SectionReveal } from "@/components/section-reveal";

const TRUST_ITEMS = [
  {
    icon: "🛡️",
    title: "Secure Payments",
    description: "Encrypted Stripe & credit card processing with 256-bit protection.",
  },
  {
    icon: "🔒",
    title: "SSL Protected Checkout",
    description: "Bank-grade SSL encryption for absolute security on every order.",
  },
  {
    icon: "💬",
    title: "Fast Customer Support",
    description: "Dedicated client concierge available to assist with all inquiries.",
  },
  {
    icon: "✨",
    title: "Premium Quality Products",
    description: "Hand-inspected creations engineered for timeless luxury standards.",
  },
  {
    icon: "📦",
    title: "Easy Order Tracking",
    description: "Real-time dispatch alerts and milestone tracking portal.",
  },
  {
    icon: "👑",
    title: "Curated Collections",
    description: "100% verified luxury products and exclusive RA2Z Originals.",
  },
];

export function TrustSection() {
  return (
    <SectionReveal>
      <section
        aria-label="Trust & Quality Guarantees"
        style={{
          margin: "40px auto 0",
          padding: "36px 28px",
          borderRadius: "24px",
          background: "linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(21, 21, 21, 0.8) 100%)",
          border: "1px solid rgba(212, 175, 55, 0.18)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {TRUST_ITEMS.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                padding: "16px",
                borderRadius: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                transition: "transform 0.3s ease, border-color 0.3s ease",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  lineHeight: "1",
                  padding: "10px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(212, 175, 55, 0.1)",
                  border: "1px solid rgba(212, 175, 55, 0.25)",
                }}
              >
                {item.icon}
              </div>
              <div>
                <h4
                  style={{
                    color: "#FFFFFF",
                    fontSize: "15px",
                    fontWeight: 700,
                    margin: "0 0 4px",
                  }}
                >
                  {item.title}
                </h4>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: "13px",
                    margin: 0,
                    lineHeight: "1.5",
                  }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </SectionReveal>
  );
}

export default TrustSection;
