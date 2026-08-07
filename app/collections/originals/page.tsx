import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CollectionGrid } from "@/components/collection-grid";
import { getOriginalsProducts } from "@/lib/products";
import { constructMetadata } from "@/lib/seo";
import { CollectionSchema, BreadcrumbSchema } from "@/components/structured-data";

export const metadata: Metadata = constructMetadata({
  title: "RA2Z Originals Collection",
  description:
    "Exclusive creations engineered and designed by RA2Z. Original apparel, luxury crest hoodies, oversized tees, and signature accessories unavailable anywhere else.",
  path: "/collections/originals",
});

export const dynamic = "force-dynamic";

export default async function OriginalsCollectionPage() {
  const products = await getOriginalsProducts();

  const breadcrumbs = [
    { name: "Home", url: "https://ra2z.shop" },
    { name: "Collections", url: "https://ra2z.shop/categories" },
    { name: "RA2Z Originals", url: "https://ra2z.shop/collections/originals" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white">
      <CollectionSchema
        name="RA2Z Originals Collection"
        description="Exclusive creations engineered and designed by RA2Z. Original apparel, luxury crest hoodies, oversized tees, and signature accessories."
        products={products}
      />
      <BreadcrumbSchema items={breadcrumbs} />
      <Navbar />

      <main className="store-shell" style={{ padding: "40px 22px 120px" }}>
        {/* Collection Header Banner */}
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px 40px",
            background: "linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, transparent 100%)",
            borderRadius: "24px",
            border: "1px solid rgba(212, 175, 55, 0.20)",
            marginBottom: "48px",
          }}
        >
          <p className="eyebrow" style={{ color: "var(--gold)", letterSpacing: "3px" }}>
            100% EXCLUSIVE
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
            RA2Z Originals
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "16px",
              maxWidth: "640px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            Exclusive creations engineered and designed by RA2Z. Original apparel, luxury crest hoodies, oversized tees,
            and signature accessories unavailable anywhere else.
          </p>
        </div>

        {/* Collection Grid with Sorting Controls */}
        <CollectionGrid initialProducts={products} />
      </main>

      <Footer />
    </div>
  );
}
