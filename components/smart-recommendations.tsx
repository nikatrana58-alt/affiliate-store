"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/products";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(price);
}

type Props = {
  currentProduct?: Product;
  allProducts: Product[];
};

export function SmartRecommendations({ currentProduct, allProducts }: Props) {
  const { addToCart } = useCart();

  const related = allProducts
    .filter((p) => p.id !== currentProduct?.id)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <div style={{ marginTop: "48px", borderTop: "1px solid var(--glass-border)", paddingTop: "36px" }}>
      <div style={{ marginBottom: "20px" }}>
        <p className="eyebrow" style={{ color: "var(--gold)" }}>Frequently Bought Together</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "24px", margin: "2px 0 0" }}>
          You May Also Like
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {related.map((prod) => (
          <div
            key={prod.id}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--glass-border)",
              borderRadius: "16px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              {prod.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={prod.image}
                  alt={prod.title}
                  style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "10px", marginBottom: "10px" }}
                />
              )}
              <Link href={`/products/${prod.slug}`} style={{ fontWeight: "600", fontSize: "14px", color: "var(--foreground)", textDecoration: "none" }}>
                {prod.title}
              </Link>
              <div style={{ color: "var(--gold)", fontWeight: "700", margin: "6px 0 10px", fontSize: "15px" }}>
                {formatPrice(prod.price ?? 0)}
              </div>
            </div>

            <button
              className="button primary"
              onClick={() => addToCart(prod)}
              type="button"
              style={{ width: "100%", padding: "8px", fontSize: "11px", justifyContent: "center" }}
            >
              + Add Bundle Item
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
