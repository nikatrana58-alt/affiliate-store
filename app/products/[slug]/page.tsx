import { notFound } from "next/navigation";
import { ProductBadge } from "@/components/product-badge";
import { ProductCard } from "@/components/product-card";
import { StoreHeader } from "@/components/store-header";
import { getProductBySlug, getProducts, type Product } from "@/lib/products";

export const dynamic = "force-dynamic";

function formatPrice(price: number | null) {
  if (price === null) return "Check current retailer price";

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
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

    relatedProducts = products
      .filter(
        (candidate) =>
          candidate.id !== product?.id &&
          product?.category &&
          candidate.category?.toLowerCase() === product.category.toLowerCase(),
      )
      .slice(0, 4);
  } catch (error) {
    console.error("[products] Unable to load product detail.", { error, slug });
    throw error;
  }

  if (!product) notFound();

  return (
    <>
      <StoreHeader />
      <main className="product-detail-shell">
        <section className="product-detail">
          <section className="product-detail-image">
            {product.image ? (
              // Dynamic Firebase URLs are intentionally rendered without optimization.
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={product.title} src={product.image} />
            ) : (
              <span className="image-placeholder">Image coming soon</span>
            )}
          </section>
          <section className="product-detail-body">
            <div className="product-meta">
              {product.category ? <span>{product.category}</span> : null}
              <ProductBadge badge={product.badge} />
            </div>
            <h1>{product.title}</h1>
            <p className="detail-price">{formatPrice(product.price)}</p>
            <p className="detail-description">
              {product.description || "Explore this recommended product at the retailer."}
            </p>
            <a
              className="button primary"
              href={product.affiliate_link}
              rel="noopener noreferrer sponsored"
              target="_blank"
            >
              View at retailer
            </a>
            <p className="affiliate-note">
              This is an affiliate link. The store may earn a commission from qualifying
              purchases at no extra cost to you.
            </p>
          </section>
        </section>

        {relatedProducts.length ? (
          <section className="related-products" aria-label="You may also like">
            <div className="section-heading">
              <div>
                <p className="eyebrow">More finds</p>
                <h2>You may also like</h2>
              </div>
            </div>
            <div className="store-products">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
