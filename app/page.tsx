import { ProductBrowser } from "@/components/product-browser";
import { StoreHeader } from "@/components/store-header";
import { HeroSection } from "@/components/hero-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { FinalCTASection } from "@/components/final-cta-section";
import { Footer } from "@/components/footer";
import { getProducts, type Product } from "@/lib/products";

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
      <StoreHeader />
      <HeroSection product={products[0] ?? null} />
      <main className="store-shell">
        <ProductBrowser products={products} />
        <TestimonialsSection />
        <FinalCTASection />
      </main>
      <Footer />
    </>
  );
}
