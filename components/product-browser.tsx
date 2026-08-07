"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { SectionReveal } from "@/components/section-reveal";
import type { Product } from "@/lib/products";

const categories = [
  { label: "All", value: "" },
  { label: "🔥 Trending", value: "Trending" },
  { label: "💎 Premium", value: "Premium" },
  { label: "🏠 Home", value: "Home" },
  { label: "💄 Beauty", value: "Beauty" },
  { label: "📱 Gadgets", value: "Gadgets" },
  { label: "💪 Fitness", value: "Fitness" },
  { label: "🍳 Kitchen", value: "Kitchen" },
];

const productSearchEventName = "store-product-search";

type ProductBrowserProps = {
  products: Product[];
};

function includesSearchTerm(product: Product, searchTerm: string) {
  const haystack = [
    product.title,
    product.category ?? "",
    product.description ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchTerm);
}

export function ProductBrowser({ products }: ProductBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const featuredProducts = products.slice(0, 4);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const normalizedCategory = selectedCategory.toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      !normalizedCategory ||
      product.category?.toLowerCase().includes(normalizedCategory);
    const matchesSearch =
      !normalizedSearch || includesSearchTerm(product, normalizedSearch);

    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    function handleHeaderSearch(event: Event) {
      setSearchTerm((event as CustomEvent<string>).detail ?? "");
    }

    window.addEventListener(productSearchEventName, handleHeaderSearch);

    return () => {
      window.removeEventListener(productSearchEventName, handleHeaderSearch);
    };
  }, []);

  return (
    <section className="product-browser" id="products" aria-label="Products">
      {featuredProducts.length ? (
        <SectionReveal>
          <section className="featured-products" aria-label="Featured Products">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Editor selection</p>
                <h2>Featured Products</h2>
              </div>
            </div>
            <div className="featured-grid stagger-children">
              {featuredProducts.map((product, idx) => (
                <ProductCard key={`feat-${product.id || idx}-${idx}`} product={product} variant="featured" />
              ))}
            </div>
          </section>
        </SectionReveal>
      ) : null}

      <SectionReveal>
        <div className="store-controls">
        <input
          aria-label="Search products"
          className="product-search"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search products..."
          type="search"
          value={searchTerm}
        />
        <div className="category-chips" aria-label="Filter by category">
          {categories.map((category) => (
            <button
              className={
                selectedCategory === category.value
                  ? "category-chip active"
                  : "category-chip"
              }
              key={category.label}
              onClick={() => setSelectedCategory(category.value)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
      </SectionReveal>

      {!products.length ? (
        <section className="empty-store animate-fade-slide-up">
          <h2>New recommendations are on the way</h2>
          <p>The store is connected and ready for its first product.</p>
        </section>
      ) : filteredProducts.length ? (
        <div className="store-products stagger-children" key={`${selectedCategory}-${searchTerm}`}>
          {filteredProducts.map((product, idx) => (
            <ProductCard key={`browser-${product.id || idx}-${idx}`} product={product} />
          ))}
        </div>
      ) : (
        <section className="empty-store animate-fade-in">
          <h2>No matching products found.</h2>
        </section>
      )}
    </section>
  );
}
