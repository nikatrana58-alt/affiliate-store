import Link from "next/link";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
};

function formatPrice(price: number | null) {
  if (price === null) return "See latest price";

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="store-product-card">
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
          {product.badge ? <strong>{product.badge}</strong> : null}
        </div>
        <h2>
          <Link href={`/products/${product.slug}`}>{product.title}</Link>
        </h2>
        <p>{product.description || "Explore this recommended product."}</p>
        <div className="product-card-footer">
          <span>{formatPrice(product.price)}</span>
          <Link className="text-link" href={`/products/${product.slug}`}>
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
