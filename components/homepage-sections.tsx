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
  // Filter products into collections
  const luxuryProducts = products.filter(
    (p) => !p.is_original && (p.collections?.includes("luxury") || p.category === "Luxury" || (p.price ?? 0) >= 150)
  ).slice(0, 4);

  const originalsProducts = products.filter(
    (p) => Boolean(p.is_original) || p.collections?.includes("originals") || p.category === "Originals"
  ).slice(0, 4);

  const trendingProducts = products.slice(0, 4);
  const newArrivals = products.slice(0, 4);
  const bestSellers = products.slice(0, 4);
  const featuredProducts = products.slice(0, 4);

  const categories = [
    { name: "Fashion", icon: "👔", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80", link: "/categories" },
    { name: "Luxury Collection", icon: "👑", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80", link: "/collections/luxury" },
    { name: "RA2Z Originals", icon: "⚡", image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80", link: "/collections/originals" },
    { name: "Electronics", icon: "💻", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", link: "/categories" },
    { name: "Home & Living", icon: "🏡", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80", link: "/categories" },
    { name: "Beauty", icon: "✨", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80", link: "/categories" },
    { name: "Fitness", icon: "🏋️", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80", link: "/categories" },
    { name: "Accessories", icon: "💼", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80", link: "/categories" },
    { name: "Pets", icon: "🐾", image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80", link: "/categories" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "108px" }}>
      {/* ── 1. SHOP BY CATEGORY ── */}
      <SectionReveal>
        <section id="categories" aria-label="Shop By Category">
          {/* Premium section heading */}
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{
                width: "32px",
                height: "1px",
                background: "var(--gold)",
                opacity: 0.6,
              }} />
              <p className="eyebrow">CURATED DEPARTMENTS</p>
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
                  Explore our hand-curated departments and signature luxury collections.
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
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.22), inset 0 1px 0 rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.25)";
                  const img = (e.currentTarget as HTMLElement).querySelector("img");
                  if (img) {
                    img.style.transform = "scale(1.08)";
                    img.style.filter = "brightness(0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
                  const img = (e.currentTarget as HTMLElement).querySelector("img");
                  if (img) {
                    img.style.transform = "scale(1)";
                    img.style.filter = "brightness(0.35)";
                  }
                }}
              >
                {/* Background Image */}
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
                {/* Gradient overlay */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(7,7,9,0.85) 0%, rgba(7,7,9,0.15) 55%, transparent 100%)",
                  zIndex: 1,
                }} />
                {/* Content */}
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
                    Shop Now
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

      {/* ── 2. RA2Z LUXURY COLLECTION ── */}
      <SectionReveal>
        <section aria-label="RA2Z Luxury Collection">
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
              <p className="eyebrow">EXCLUSIVE CURATION</p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-1px", margin: "0 0 8px", lineHeight: 1.05 }}>
                  RA2Z Luxury Collection
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "15px", margin: 0, maxWidth: "480px", lineHeight: "1.6" }}>
                  Handpicked luxury products designed for people who appreciate premium quality and timeless elegance.
                </p>
              </div>
              <MagneticButton>
                <Link href="/collections/luxury" prefetch={true} style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--gold)", fontWeight: 700, fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap", opacity: 0.9 }}>
                  Explore Luxury
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </MagneticButton>
            </div>
          </div>
          <div className="featured-grid stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
            {luxuryProducts.map((p, idx) => (
              <ProductCard key={`lux-${p.id || idx}-${idx}`} product={p} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ── 3. RA2Z ORIGINALS ── */}
      <SectionReveal>
        <section aria-label="RA2Z Originals">
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
              <p className="eyebrow">100% BRAND ORIGINAL</p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-1px", margin: "0 0 8px", lineHeight: 1.05 }}>
                  RA2Z Originals
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "15px", margin: 0, maxWidth: "480px", lineHeight: "1.6" }}>
                  Exclusive products designed by RA2Z. Original designs that cannot be found anywhere else.
                </p>
              </div>
              <MagneticButton>
                <Link href="/collections/originals" prefetch={true} style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--gold)", fontWeight: 700, fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap", opacity: 0.9 }}>
                  Explore Originals
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </MagneticButton>
            </div>
          </div>
          <div className="featured-grid stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
            {originalsProducts.map((p, idx) => (
              <ProductCard key={`orig-${p.id || idx}-${idx}`} product={p} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ── 4. TRENDING NOW ── */}
      <SectionReveal>
        <section aria-label="Trending Now">
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
              <p className="eyebrow">POPULAR SELECTION</p>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-1px", margin: "0", lineHeight: 1.05 }}>
              Trending Now
            </h2>
          </div>
          <div className="featured-grid stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
            {trendingProducts.map((p, idx) => (
              <ProductCard key={`trend-${p.id || idx}-${idx}`} product={p} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ── 5. NEW ARRIVALS ── */}
      <SectionReveal>
        <section id="new-arrivals" aria-label="New Arrivals">
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
              <p className="eyebrow">JUST RELEASED</p>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-1px", margin: "0", lineHeight: 1.05 }}>
              New Arrivals
            </h2>
          </div>
          <div className="featured-grid stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
            {newArrivals.map((p, idx) => (
              <ProductCard key={`new-${p.id || idx}-${idx}`} product={p} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ── 6. CINEMATIC BRAND MANIFESTO BANNER ── */}
      <SectionReveal>
        <section
          aria-label="Luxury Brand Banner"
          style={{
            position: "relative",
            borderRadius: "28px",
            overflow: "hidden",
            padding: "100px 48px",
            background: "linear-gradient(135deg, #070709 0%, #0D0D11 50%, #070709 100%)",
            border: "1px solid rgba(201, 168, 76, 0.18)",
            boxShadow: "0 40px 100px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.03) inset",
            textAlign: "center",
          }}
        >
          {/* Background glow orbs */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201, 168, 76, 0.08) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 0,
          }} />
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 40% 35% at 20% 80%, rgba(90, 60, 200, 0.05) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 0,
          }} />
          {/* Gold top border line */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "8%",
            right: "8%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.50), transparent)",
            zIndex: 1,
          }} />
          {/* Gold bottom border line */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: "8%",
            right: "8%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.20), transparent)",
            zIndex: 1,
          }} />

          <div style={{ maxWidth: "700px", margin: "0 auto", position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{ width: "40px", height: "1px", background: "var(--gold)", opacity: 0.5 }} />
              <p className="eyebrow" style={{ letterSpacing: "4px", margin: 0 }}>RA2Z MANIFESTO</p>
              <div style={{ width: "40px", height: "1px", background: "var(--gold)", opacity: 0.5 }} />
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(32px, 5vw, 54px)",
                fontWeight: 700,
                color: "#F8F8FF",
                margin: "0 0 22px",
                lineHeight: "1.1",
                letterSpacing: "-1.5px",
              }}
            >
              Crafted For Those Who Choose{" "}
              <span style={{
                backgroundImage: "var(--gold-gradient-text)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Quality Over Quantity
              </span>
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "17px", lineHeight: "1.7", marginBottom: "40px", maxWidth: "520px", margin: "0 auto 40px" }}>
              Every creation in the RA2Z catalog embodies timeless distinction, uncompromising precision, and true luxury.
            </p>
            <MagneticButton>
              <Link
                href="/collections/luxury"
                prefetch={true}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "17px 40px",
                  borderRadius: "999px",
                  background: "var(--gold-gradient)",
                  color: "#06060A",
                  fontWeight: 800,
                  fontSize: "15px",
                  textDecoration: "none",
                  boxShadow: "0 8px 36px rgba(201, 168, 76, 0.42), 0 1px 0 rgba(255,255,255,0.18) inset",
                  letterSpacing: "-0.3px",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
              >
                Explore Collection
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </MagneticButton>
          </div>
        </section>
      </SectionReveal>

      {/* ── 7. FEATURED COLLECTION ── */}
      <SectionReveal>
        <section aria-label="Featured Collection">
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
              <p className="eyebrow">EDITOR&apos;S SELECTION</p>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-1px", margin: "0", lineHeight: 1.05 }}>
              Featured Collection
            </h2>
          </div>
          <div className="featured-grid stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
            {featuredProducts.map((p, idx) => (
              <ProductCard key={`feat-${p.id || idx}-${idx}`} product={p} />
            ))}
          </div>
        </section>
      </SectionReveal>

      {/* ── 8. BEST SELLERS ── */}
      <SectionReveal>
        <section aria-label="Best Sellers">
          <div style={{ marginBottom: "44px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
              <p className="eyebrow">MOST COVETED</p>
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700, letterSpacing: "-1px", margin: "0", lineHeight: 1.05 }}>
              Best Sellers
            </h2>
          </div>
          <div className="featured-grid stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
            {bestSellers.map((p, idx) => (
              <ProductCard key={`best-${p.id || idx}-${idx}`} product={p} />
            ))}
          </div>
        </section>
      </SectionReveal>
    </div>
  );
}

export default HomepageSections;
