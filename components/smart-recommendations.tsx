"use client";

import { useState } from "react";
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
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [bundleAdded, setBundleAdded] = useState(false);

  const related = allProducts
    .filter((p) => p.id !== currentProduct?.id)
    .slice(0, 3);

  if (related.length === 0) return null;

  const currentPrice = currentProduct?.price ?? 0;
  const bundleItemsPrice = related.reduce((acc, item) => acc + (item.price ?? 0), 0);
  const totalBundlePrice = currentPrice + bundleItemsPrice;

  const handleAddSingleItem = (prod: Product) => {
    addToCart(prod);
    setAddedIds((prev) => [...prev, prod.id]);
    setTimeout(() => {
      setAddedIds((prev) => prev.filter((id) => id !== prod.id));
    }, 2000);
  };

  const handleAddEntireBundle = () => {
    if (currentProduct) addToCart(currentProduct);
    related.forEach((item) => addToCart(item));
    setBundleAdded(true);
    setTimeout(() => setBundleAdded(false), 2500);
  };

  return (
    <div
      style={{
        marginTop: "54px",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        paddingTop: "40px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <p className="eyebrow" style={{ color: "var(--gold)", margin: 0, letterSpacing: "2px" }}>
            COMPLEMENTARY PAIRINGS
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "26px", fontWeight: 700, margin: "4px 0 0" }}>
            Frequently Bought Together
          </h2>
        </div>

        {/* Add Entire Bundle CTA */}
        <button
          type="button"
          onClick={handleAddEntireBundle}
          style={{
            padding: "10px 20px",
            borderRadius: "999px",
            background: bundleAdded ? "#4caf50" : "var(--gold)",
            color: "#000000",
            fontWeight: 700,
            fontSize: "12px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.25s ease",
            boxShadow: "0 4px 16px rgba(212, 175, 55, 0.25)",
          }}
        >
          {bundleAdded ? "✓ Entire Bundle Added to Cart" : `+ Add Entire Bundle (${formatPrice(totalBundlePrice)})`}
        </button>
      </div>

      {/* Grid of Bundle Items */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        {related.map((prod) => {
          const isAdded = addedIds.includes(prod.id);
          return (
            <div
              key={prod.id}
              style={{
                background: "rgba(21, 21, 21, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "transform 0.3s ease, border-color 0.3s ease",
              }}
            >
              <div>
                {prod.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prod.image}
                    alt={`${prod.title} - Frequently Bought Together`}
                    style={{
                      width: "100%",
                      height: "160px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      marginBottom: "12px",
                    }}
                  />
                )}
                <Link
                  href={`/products/${prod.slug}`}
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                    color: "#FFFFFF",
                    textDecoration: "none",
                    display: "block",
                    lineHeight: "1.4",
                  }}
                >
                  {prod.title}
                </Link>
                <div style={{ color: "var(--gold)", fontWeight: "700", margin: "6px 0 14px", fontSize: "15px" }}>
                  {formatPrice(prod.price ?? 0)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddSingleItem(prod)}
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  background: isAdded ? "#4caf50" : "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#FFFFFF",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {isAdded ? "✓ Added to Cart" : "+ Add Bundle Item"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
