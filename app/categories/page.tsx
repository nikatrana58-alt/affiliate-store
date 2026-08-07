import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { constructMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/structured-data";

export const metadata: Metadata = constructMetadata({
  title: "Shop by Category",
  description:
    "Explore RA2Z luxury departments: Fine Timepieces, Luxury Apparel, RA2Z Originals, Electronics, Home & Living, and Accessories.",
  path: "/categories",
});

const CATEGORIES = [
  {
    id: "luxury",
    name: "Luxury Collection",
    subtitle: "High-ticket chronographs, fine leather, & Italian design",
    icon: "👑",
    href: "/collections/luxury",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    badge: "RA2Z Curation",
  },
  {
    id: "originals",
    name: "RA2Z Originals",
    subtitle: "Exclusive RA2Z heavy fleece hoodies, oversized tees & caps",
    icon: "⚡",
    href: "/collections/originals",
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
    badge: "100% Exclusive",
  },
  {
    id: "fashion",
    name: "Fashion & Apparel",
    subtitle: "Premium streetwear, tailor-cut garments & luxury leather",
    icon: "👔",
    href: "/#products",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "electronics",
    name: "Electronics & Tech",
    subtitle: "Studio audio, noise-canceling headphones & titanium gadgets",
    icon: "🎧",
    href: "/#products",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "home",
    name: "Home & Living",
    subtitle: "Architectural lighting, dual-boiler espresso & titanium decor",
    icon: "🏡",
    href: "/#products",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "beauty",
    name: "Beauty & Fragrance",
    subtitle: "Artisanal scents, gold elixirs & premium wellness",
    icon: "✨",
    href: "/#products",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "fitness",
    name: "Fitness & Performance",
    subtitle: "Recovery tech, weighted gear & matte black fitness equipment",
    icon: "🏋️",
    href: "/#products",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "accessories",
    name: "Accessories & Wallets",
    subtitle: "RFID aerospace titanium cardholders & obsidian sunglasses",
    icon: "💼",
    href: "/#products",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "pets",
    name: "Luxury Pets",
    subtitle: "Hand-crafted leather collars & velvet pet beds",
    icon: "🐾",
    href: "/#products",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80",
  },
];

export default function CategoriesPage() {
  const breadcrumbs = [
    { name: "Home", url: "https://ra2z.shop" },
    { name: "Categories", url: "https://ra2z.shop/categories" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white">
      <BreadcrumbSchema items={breadcrumbs} />
      <Navbar />

      <main className="store-shell" style={{ padding: "40px 22px 120px" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px 40px",
            background: "linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, transparent 100%)",
            borderRadius: "24px",
            border: "1px solid rgba(212, 175, 55, 0.15)",
            marginBottom: "48px",
          }}
        >
          <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "3px" }}>
            RA2Z DEPARTMENTS
          </p>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(36px, 5vw, 54px)",
              fontWeight: 700,
              margin: "12px 0 16px",
              lineHeight: "1.1",
            }}
          >
            Explore Categories
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "16px",
              maxWidth: "600px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            Browse our handpicked collections by department. Each category is engineered for quality and timeless prestige.
          </p>
        </div>

        {/* Category Cards Grid */}
        <div className="category-grid-container">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={c.href}
              prefetch={true}
              className="category-card-item"
              style={{
                position: "relative",
                height: "260px",
                borderRadius: "24px",
                overflow: "hidden",
                border: "1px solid rgba(212, 175, 55, 0.2)",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "28px",
                textDecoration: "none",
                transition: "transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease",
              }}
            >
              {/* Background Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt={`${c.name} - RA2Z Luxury Curation`}
                className="category-card-image"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "brightness(0.45)",
                  transition: "transform 0.6s ease",
                }}
              />

              {/* Gradient Overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, transparent 0%, rgba(10, 10, 10, 0.95) 100%)",
                }}
              />

              {/* Badge if present */}
              {c.badge && (
                <div
                  className="category-card-badge"
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    backgroundColor: "rgba(212, 175, 55, 0.2)",
                    border: "1px solid rgba(212, 175, 55, 0.5)",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    color: "var(--gold)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  {c.badge}
                </div>
              )}

              {/* Content */}
              <div className="category-card-content" style={{ position: "relative", zIndex: 2 }}>
                <div className="category-card-title-row" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span className="category-card-icon" style={{ fontSize: "24px" }}>{c.icon}</span>
                  <h2
                    className="category-card-title"
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: "22px",
                      fontWeight: 700,
                      margin: 0,
                    }}
                  >
                    {c.name}
                  </h2>
                </div>
                <p className="category-card-subtitle" style={{ color: "var(--muted)", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>
                  {c.subtitle}
                </p>
                <span className="category-card-arrow-mobile">Shop →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
