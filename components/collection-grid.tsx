"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/products";

type CollectionGridProps = {
  initialProducts: Product[];
};

export function CollectionGrid({ initialProducts }: CollectionGridProps) {
  const [sortOption, setSortOption] = useState<"featured" | "low_high" | "high_low" | "newest">("featured");

  const sortedProducts = [...initialProducts].sort((a, b) => {
    const priceA = a.price ?? 0;
    const priceB = b.price ?? 0;

    if (sortOption === "low_high") return priceA - priceB;
    if (sortOption === "high_low") return priceB - priceA;
    if (sortOption === "newest") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    return 0;
  });

  return (
    <div>
      {/* Sorting Control Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          paddingBottom: "16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: "14px" }}>
          Showing <strong>{sortedProducts.length}</strong> items
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ color: "var(--muted)", fontSize: "13px" }}>Sort By:</label>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            style={{
              backgroundColor: "rgba(21, 21, 21, 0.9)",
              color: "#FFFFFF",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              borderRadius: "12px",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="featured">Featured</option>
            <option value="low_high">Price: Low to High</option>
            <option value="high_low">Price: High to Low</option>
            <option value="newest">Newest Arrivals</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {sortedProducts.length > 0 ? (
        <div className="store-products stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {sortedProducts.map((product, idx) => (
            <ProductCard key={`col-${product.id || product.slug || idx}-${idx}`} product={product} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <h3>No products found in this collection.</h3>
        </div>
      )}
    </div>
  );
}
