"use client";

import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";
import { MagneticButton } from "@/components/magnetic-button";

const BRAND_PILLARS = [
  {
    icon: "💎",
    title: "Carefully Curated Selection",
    description: "Every item in our luxury line is hand-selected and verified to meet strict standards of quality and design.",
  },
  {
    icon: "✨",
    title: "Uncompromising Craftsmanship",
    description: "Engineered using 450GSM French terry, aerospace titanium, Tuscan leather, and sapphire crystal.",
  },
  {
    icon: "⚡",
    title: "100% RA2Z Originals",
    description: "In-house custom creations designed exclusively by RA2Z. Original designs unavailable anywhere else.",
  },
  {
    icon: "🛡️",
    title: "Seamless Client Experience",
    description: "Encrypted 256-bit checkout, instant order tracking, and dedicated concierge customer support.",
  },
];

export function WhyRA2ZSection() {
  return (
    <SectionReveal>
      <section
        aria-label="Why RA2Z Luxury"
        style={{
          borderRadius: "28px",
          padding: "64px 32px",
          background: "linear-gradient(165deg, rgba(21, 21, 21, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%)",
          border: "1px solid rgba(212, 175, 55, 0.2)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto 48px" }}>
          <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "3px" }}>
            THE BRAND STORY & PHILOSOPHY
          </p>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(32px, 4.5vw, 48px)",
              fontWeight: 700,
              color: "#FFFFFF",
              margin: "12px 0 16px",
              lineHeight: "1.15",
            }}
          >
            Redefining Prestige & Modern Luxury
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "16px", lineHeight: "1.7", margin: 0 }}>
            Founded on the principle that true luxury is defined by substance, precision craftsmanship, and quiet confidence, RA2Z brings together hand-inspected masterpieces for discerning clients worldwide.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px",
            marginBottom: "48px",
          }}
        >
          {BRAND_PILLARS.map((pillar, idx) => (
            <div
              key={idx}
              style={{
                textAlign: "left",
                padding: "24px",
                borderRadius: "20px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                transition: "transform 0.3s ease, border-color 0.3s ease",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "12px" }}>{pillar.icon}</div>
              <h3 style={{ color: "#FFFFFF", fontSize: "17px", fontWeight: 700, margin: "0 0 8px" }}>
                {pillar.title}
              </h3>
              <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        <MagneticButton>
          <Link
            href="/collections/luxury"
            prefetch={true}
            style={{
              display: "inline-block",
              padding: "16px 36px",
              borderRadius: "999px",
              background: "var(--gold-gradient)",
              color: "#0A0A0A",
              fontWeight: 700,
              fontSize: "14px",
              textDecoration: "none",
              boxShadow: "0 8px 30px rgba(212, 175, 55, 0.35)",
            }}
          >
            Explore Luxury Curation →
          </Link>
        </MagneticButton>
      </section>
    </SectionReveal>
  );
}

export default WhyRA2ZSection;
