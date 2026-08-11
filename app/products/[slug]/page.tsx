import { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { StoreHeader } from "@/components/store-header";
import { Footer } from "@/components/footer";
import { MagneticButton } from "@/components/magnetic-button";
import { ProductReviewsSection } from "@/components/product-reviews-section";
import { SmartRecommendations } from "@/components/smart-recommendations";
import { StorefrontVariantSelector } from "@/components/storefront-variant-selector";
import { ShippingEstimatorWidget } from "@/components/shipping-estimator-widget";
import { ProductSchema, BreadcrumbSchema } from "@/components/structured-data";
import { getProductBySlug, getProducts, type Product } from "@/lib/products";
import { ProductTabs } from "@/components/product-tabs";
import { LuxuryPackagingSection } from "@/components/luxury-packaging-section";
import { constructMetadata } from "@/lib/seo";
import { sanitizeProductDescription } from "@/lib/utils/product-formatter";

export const dynamic = "force-dynamic";

function formatPrice(price: number | null) {
  if (price === null) return "Check current price";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return constructMetadata({
      title: "Product Not Found",
      noIndex: true,
    });
  }

  const cleanDescription = sanitizeProductDescription(product.description);

  return constructMetadata({
    title: product.title,
    description: cleanDescription.slice(0, 160),
    image: product.image,
    path: `/products/${product.slug}`,
    type: "website",
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product: Product | null = null;
  let relatedProducts: Product[] = [];

  try {
    product = await getProductBySlug(slug);
    const products = await getProducts();

    const sameCategoryProducts = products.filter(
      (candidate) =>
        candidate.id !== product?.id &&
        product?.category &&
        candidate.category?.toLowerCase() === product.category.toLowerCase(),
    );

    if (sameCategoryProducts.length > 0) {
      relatedProducts = sameCategoryProducts.slice(0, 4);
    } else {
      relatedProducts = products
        .filter((candidate) => candidate.id !== product?.id)
        .slice(0, 4);
    }
  } catch (error) {
    console.error("[products] Unable to load product detail.", { error, slug });
    throw error;
  }

  if (!product) notFound();

  const breadcrumbs = [
    { name: "Home", url: "https://ra2z.shop" },
    { name: product.category || "Catalog", url: "https://ra2z.shop/categories" },
    { name: product.title, url: `https://ra2z.shop/products/${product.slug}` },
  ];

  return (
    <>
      <ProductSchema product={product} />
      <BreadcrumbSchema items={breadcrumbs} />
      <StoreHeader />
      <main className="product-landing-page">
        <div className="product-hero-section animate-fade-slide-up">
          <StorefrontVariantSelector product={product} />
          
          <div style={{ maxWidth: "1200px", margin: "32px auto 0", padding: "0 24px" }}>
            <ShippingEstimatorWidget variantId={product.variants?.[0]?.cj_variant_id || product.variants?.[0]?.id} />
          </div>

          <ProductTabs product={product} />
          <LuxuryPackagingSection />
        </div>

        <section className="benefits-section">
          <div className="section-container animate-fade-slide-up" style={{ animationDelay: "0.15s" }}>
            <p className="eyebrow">Why you&apos;ll love it</p>
            <h2>Product Benefits</h2>
            <div className="benefits-grid stagger-children">
              <div className="benefit-card">
                <div className="benefit-icon">✨</div>
                <h3>High-Grade Materials</h3>
                <p>Selected for durability and exceptional performance in everyday use.</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-icon">🎁</div>
                <h3>Thoughtful Design</h3>
                <p>Elegant craftsmanship makes it an ideal choice for your home or as a gift.</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-icon">📦</div>
                <h3>Order Tracking</h3>
                <p>Real-time tracking link emailed as soon as your package dispatches.</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-icon">🛡️</div>
                <h3>Quality Inspected</h3>
                <p>Inspected for quality prior to final packaging and fulfillment.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Reviews & Smart Recommendations */}
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <ProductReviewsSection productId={product.id} />
          <SmartRecommendations currentProduct={product} allProducts={relatedProducts} />
        </div>

        {relatedProducts.length > 0 && (
          <section className="related-products-section" aria-label="You may also like">
            <div className="section-container animate-fade-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Discover more</p>
                  <h2>Related Products</h2>
                </div>
              </div>
              <div className="related-products-grid stagger-children">
                {relatedProducts.map((relatedProduct, idx) => (
                  <ProductCard key={`related-${relatedProduct.id || idx}-${idx}`} product={relatedProduct} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <div className="sticky-mobile-buy">
        <div className="sticky-container">
          <div className="sticky-info">
            <span className="sticky-price">{formatPrice(product.price)}</span>
            <span className="sticky-title">{product.title}</span>
          </div>
          <MagneticButton className="buy-amazon-button-wrapper">
            <AddToCartButton product={product} size="small" />
          </MagneticButton>
        </div>
      </div>

      <Footer />
    </>
  );
}
