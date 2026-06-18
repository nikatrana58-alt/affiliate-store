import Link from "next/link";
import { ProductBadge } from "@/components/product-badge";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
  variant?: "default" | "featured";
};

function formatPrice(price: number | null) {
  if (price === null) return "See latest price";

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  return (
    <article
      className={
        variant === "featured"
          ? "store-product-card featured-product-card"
          : "store-product-card"
      }
    >
      <Link className="store-product-image" href={`/products/${product.slug}`}>
        {product.image ? (
          // Dynamic Firebase URLs are intentionally rendered without optimization.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={product.title} src={product.image} />
        ) : (
          <span className="image-placeholder">Image coming soon</span>
        )}
      </Link>
      <div className="store-product-body">
        <div className="product-meta">
          {product.category ? <span>{product.category}</span> : null}
          <ProductBadge badge={product.badge} />
        </div>
        <h2>
          <Link href={`/products/${product.slug}`}>{product.title}</Link>
        </h2>
        <p>{product.description || "Explore this recommended product."}</p>
        <div className="product-card-footer">
          <span className="product-price">{formatPrice(product.price)}</span>
          <Link className="product-detail-link" href={`/products/${product.slug}`}>
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
