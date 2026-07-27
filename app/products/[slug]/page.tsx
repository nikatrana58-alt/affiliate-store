import { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductBadge } from "@/components/product-badge";
import { ProductCard } from "@/components/product-card";
import { StoreHeader } from "@/components/store-header";
import { Footer } from "@/components/footer";
import { MagneticButton } from "@/components/magnetic-button";
import { ProductReviewsSection } from "@/components/product-reviews-section";
import { SmartRecommendations } from "@/components/smart-recommendations";
import { getProductBySlug, getProducts, type Product } from "@/lib/products";

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
    return {
      title: "Product Not Found",
    };
  }

  const title = `${product.title} | Affiliate Store`;
  const description = product.description || `Buy ${product.title} at the best price.`;

  return {
    description,
    openGraph: {
      description,
      images: product.image ? [{ url: product.image }] : [],
      title,
      type: "website",
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: product.image ? [product.image] : [],
      title,
    },
  };
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

  return (
    <>
      <StoreHeader />
      <main className="product-landing-page">
        <div className="product-hero-section animate-fade-slide-up">
          <div className="product-hero-container">
            <section className="product-hero-image">
              {product.image ? (
                <div className="product-image-reflection">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={product.title} src={product.image} />
                  <div className="product-image-reflection-fallback" aria-hidden="true" />
                </div>
              ) : (
                <div className="image-placeholder">Image coming soon</div>
              )}
              <div className="product-image-shadow" aria-hidden="true" />
            </section>

            <section className="product-hero-content">
              <div className="product-hero-meta">
                {product.category && <span className="category-tag">{product.category}</span>}
                <ProductBadge badge={product.badge} />
              </div>

              <h1>{product.title}</h1>
              
              <div className="price-container">
                <span className="current-price">{formatPrice(product.price)}</span>
                <span className="price-badge">Prime Delivery</span>
              </div>

              <p className="product-description">
                {product.description || "High-quality product recommended by our experts. Perfect for your home or as a thoughtful gift."}
              </p>

              {/* Trust indicators */}
              <div className="trust-indicators">
                <span className="trust-indicator">
                  <span className="trust-indicator-icon">🔒</span>
                  Secure checkout
                </span>
                <span className="trust-indicator">
                  <span className="trust-indicator-icon">⚡</span>
                  Fast delivery
                </span>
                <span className="trust-indicator">
                  <span className="trust-indicator-icon">✓</span>
                  Amazon verified
                </span>
                <span className="trust-indicator">
                  <span className="trust-indicator-icon">↩</span>
                  Easy returns
                </span>
              </div>

              <div className="purchase-actions">
                <MagneticButton className="buy-amazon-button-wrapper">
                  <AddToCartButton product={product} />
                </MagneticButton>

                <p className="trust-text">Secure checkout · Free returns</p>
              </div>
            </section>
          </div>
        </div>

        <section className="benefits-section">
          <div className="section-container animate-fade-slide-up" style={{animationDelay: "0.15s"}}>
            <p className="eyebrow">Why you&apos;ll love it</p>
            <h2>Product Benefits</h2>
            <div className="benefits-grid stagger-children">
              <div className="benefit-card">
                <div className="benefit-icon">✨</div>
                <h3>Premium Quality</h3>
                <p>Selected for its durability and exceptional performance in everyday use.</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-icon">🎁</div>
                <h3>Perfect Gift</h3>
                <p>Elegant design makes it an ideal choice for friends, family, or yourself.</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-icon">🛡️</div>
                <h3>Verified Choice</h3>
                <p>Highly rated by thousands of satisfied customers across the globe.</p>
              </div>
              <div className="benefit-card">
                <div className="benefit-icon">🚀</div>
                <h3>Quick Setup</h3>
                <p>Ready to use right out of the box with minimal effort required.</p>
              </div>
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="related-products-section" aria-label="You may also like">
            <div className="section-container animate-fade-slide-up" style={{animationDelay: "0.2s"}}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Discover more</p>
                  <h2>Related Products</h2>
                </div>
              </div>
              <div className="related-products-grid stagger-children">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard key={relatedProduct.id} product={relatedProduct} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Customer Reviews & Star Ratings Section */}
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <ProductReviewsSection productId={product.id} />
          <SmartRecommendations currentProduct={product} allProducts={relatedProducts} />
        </div>
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
