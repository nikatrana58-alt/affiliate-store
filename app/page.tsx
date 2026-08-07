import { ProductBrowser } from "@/components/product-browser";
import { StoreHeader } from "@/components/store-header";
import { HeroSection } from "@/components/hero-section";
import { TrustSection } from "@/components/trust-section";
import { HomepageSections } from "@/components/homepage-sections";
import { WhyRA2ZSection } from "@/components/why-ra2z-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { FinalCTASection } from "@/components/final-cta-section";
import { Footer } from "@/components/footer";
import { getProducts, type Product } from "@/lib/products";
import { OrganizationSchema, WebSiteSchema } from "@/components/structured-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  let products: Product[] = [];

  try {
    products = await getProducts();
  } catch (error) {
    console.error("[products] Error loading products:", error);
  }

  return (
    <>
      <OrganizationSchema />
      <WebSiteSchema />
      <StoreHeader />
      <HeroSection product={products[0] ?? null} />
      <main className="store-shell" style={{ display: "flex", flexDirection: "column", gap: "96px" }}>
        <TrustSection />
        <HomepageSections products={products} />
        <WhyRA2ZSection />
        <ProductBrowser products={products} />
        <TestimonialsSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  );
}
