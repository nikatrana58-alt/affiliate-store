"use client";

import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/product-card";
import { SectionReveal } from "@/components/section-reveal";
import { MagneticButton } from "@/components/magnetic-button";
import type { Product } from "@/lib/products";

type HomepageSectionsProps = {
  products: Product[];
};

export function HomepageSections({ products }: HomepageSectionsProps) {
  const featuredProducts = products.slice(0, 8);

  const categories = [
    { name: "Executive Line", icon: "💼", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80", link: "/collections/luxury" },
    { name: "Minimal Collection", icon: "✨", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80", link: "/collections/luxury" },
    { name: "Travel Accessories", icon: "🛫", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80", link: "/collections/luxury" },
    { name: "Home Essentials", icon: "🏡", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80", link: "/collections/luxury" },
    { name: "Signature Apparel", icon: "⚡", image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80", link: "/collections/originals" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "96px" }}>
      {/* ── 1. SHOP BY CATEGORY ── */}
      <SectionReveal>
        <section id="categories" aria-label="Shop By Category">
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{
                width: "32px",
                height: "1px",
                background: "var(--gold)",
                opacity: 0.6,
              }} />
              <p className="eyebrow">DEPARTMENTS</p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <h2 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "clamp(28px, 4vw, 40px)",
                  fontWeight: 700,
                  letterSpacing: "-1px",
                  margin: "0 0 8px",
                  lineHeight: 1.05,
                }}>
                  Shop by Category
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "15px", margin: 0, maxWidth: "400px", lineHeight: "1.6" }}>
                  Browse our curated departments and signature collections.
                </p>
              </div>
              <MagneticButton>
                <Link
                  href="/categories"
                  prefetch={true}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--gold)",
                    fontWeight: 700,
                    fontSize: "13px",
                    textDecoration: "none",
                    letterSpacing: "0.3px",
                    whiteSpace: "nowrap",
                    opacity: 0.9,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  View All
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </Link>
              </MagneticButton>
            </div>
          </div>

          <div className="category-grid-container">
            {categories.map((c) => (
              <Link
                key={c.name}
                href={c.link}
                prefetch={true}
                className="category-card-item"
                style={{
                  position: "relative",
                  height: "220px",
                  borderRadius: "20px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: "20px",
                  textDecoration: "none",
                  background: "rgba(14, 14, 20, 0.9)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                  transition: "transform 0.45s cubic-bezier(0.16,1,0.3,1), box-shadow 0.45s ease, border-color 0.45s ease",
                }}
              >
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{
                    objectFit: "cover",
                    filter: "brightness(0.35)",
                    transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1), filter 0.5s ease",
                  }}
                />
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(7,7,9,0.85) 0%, rgba(7,7,9,0.15) 55%, transparent 100%)",
                  zIndex: 1,
                }} />
                <div style={{ position: "relative", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "20px", lineHeight: 1 }}>{c.icon}</span>
                    <h3 style={{
                      color: "#ffffff",
                      fontSize: "17px",
                      fontWeight: 700,
                      margin: 0,
                      letterSpacing: "-0.3px",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>{c.name}</h3>
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "var(--gold)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                    opacity: 0.8,
                  }}>
                    Explore Category
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ── 2. FEATURED PRODUCTS (ONE SHOWCASE GRID) ── */}
      <SectionReveal>
        <section id="products" aria-label="Featured Products">
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
              <p className="eyebrow">CATALOG SHOWCASE</p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-1px", margin: "0 0 8px", lineHeight: 1.05 }}>
                  Featured Products
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "15px", margin: 0, maxWidth: "480px", lineHeight: "1.6" }}>
                  Explore selected creations designed for modern lifestyle, function, and distinction.
                </p>
              </div>
            </div>
          </div>
          <div className="featured-grid stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
            {featuredProducts.map((p, idx) => (
              <ProductCard key={`feat-${p.id || idx}-${idx}`} product={p} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ── 3. BRAND STATEMENT BANNER ── */}
      <SectionReveal>
        <section
          aria-label="Brand Banner"
          style={{
            position: "relative",
            borderRadius: "28px",
            overflow: "hidden",
            padding: "80px 48px",
            background: "linear-gradient(135deg, #070709 0%, #0D0D11 50%, #070709 100%)",
            border: "1px solid rgba(201, 168, 76, 0.18)",
            boxShadow: "0 40px 100px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.03) inset",
            textAlign: "center",
          }}
        >
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201, 168, 76, 0.08) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 0,
          }} />

          <div style={{ maxWidth: "700px", margin: "0 auto", position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{ width: "40px", height: "1px", background: "var(--gold)", opacity: 0.5 }} />
              <p className="eyebrow" style={{ letterSpacing: "4px", margin: 0 }}>RA2Z BRAND VISION</p>
              <div style={{ width: "40px", height: "1px", background: "var(--gold)", opacity: 0.5 }} />
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(30px, 4.5vw, 48px)",
                fontWeight: 700,
                color: "#F8F8FF",
                margin: "0 0 20px",
                lineHeight: "1.15",
                letterSpacing: "-1px",
              }}
            >
              Designed For Modern Living
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "16px", lineHeight: "1.7", marginBottom: "36px", maxWidth: "540px", margin: "0 auto 36px" }}>
              Discover items selected to combine functional design, durable materials, and modern aesthetic.
            </p>
            <MagneticButton>
              <Link
                href="/categories"
                prefetch={true}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "16px 36px",
                  borderRadius: "999px",
                  background: "var(--gold-gradient)",
                  color: "#06060A",
                  fontWeight: 800,
                  fontSize: "14px",
                  textDecoration: "none",
                  boxShadow: "0 8px 36px rgba(201, 168, 76, 0.35)",
                  letterSpacing: "-0.3px",
                }}
              >
                Browse Catalog
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </MagneticButton>
          </div>
        </section>
      </SectionReveal>
    </div>
  );
}

export default HomepageSections;
