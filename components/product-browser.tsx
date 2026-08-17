"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { SectionReveal } from "@/components/section-reveal";
import { MagneticButton } from "@/components/magnetic-button";
import type { Product } from "@/lib/products";

const categories = [
  { label: "All Products", value: "" },
  { label: "👑 Luxury", value: "Luxury" },
  { label: "⚡ RA2Z Originals", value: "Originals" },
  { label: "👔 Fashion", value: "Fashion" },
  { label: "🎧 Electronics", value: "Electronics" },
  { label: "🏡 Home & Living", value: "Home" },
  { label: "✨ Beauty", value: "Beauty" },
  { label: "🏋️ Fitness", value: "Fitness" },
  { label: "💼 Accessories", value: "Accessories" },
];

const productSearchEventName = "store-product-search";

type ProductBrowserProps = {
  products: Product[];
};

/**
 * Tokenized Multi-Field Search Engine
 * Supports partial word matching (e.g. "sh" -> "shoe", "shirt", "shoulder")
 * Searches title, category, tags, brand, badge, collections, and description.
 */
function matchProduct(product: Product, query: string): boolean {
  if (!query.trim()) return true;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [
    product.title,
    product.category || "",
    product.brand || "",
    product.badge || "",
    ...(product.tags || []),
    ...(product.collections || []),
    product.description || "",
  ]
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
}

export function ProductBrowser({ products }: ProductBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Fast Debounce for Search Input
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsFiltering(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Listen for Header Search Event & Keyboard Shortcuts (/ or Ctrl+K, Escape)
  useEffect(() => {
    function handleHeaderSearch(event: Event) {
      const term = (event as CustomEvent<string>).detail ?? "";
      setSearchTerm(term);
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore shortcut when typing in existing form controls outside search
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((e.key === "/" || (e.ctrlKey && e.key.toLowerCase() === "k")) && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchTerm("");
        searchInputRef.current?.blur();
      }
    }

    window.addEventListener(productSearchEventName, handleHeaderSearch);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(productSearchEventName, handleHeaderSearch);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 3. Load Recently Viewed Products from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("ra2z_recently_viewed") || "[]");
      if (Array.isArray(stored)) {
        setRecentlyViewedIds(stored);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // 4. Derive Active Category Options to Avoid Category Overload (Fix #2)
  const activeCategoryOptions = useMemo(() => {
    if (!products || products.length === 0) return [{ label: "All Products", value: "" }];
    return categories.filter((cat) => {
      if (!cat.value) return true;
      const catLower = cat.value.toLowerCase();
      return products.some((p) => {
        if (catLower === "originals") return p.is_original || p.category === "Originals";
        return (
          (p.category && p.category.toLowerCase().includes(catLower)) ||
          (p.collections && p.collections.some((c) => c.toLowerCase().includes(catLower)))
        );
      });
    });
  }, [products]);

  // 5. Memoized Filtered Products Calculation
  const normalizedCategory = useMemo(() => selectedCategory.trim().toLowerCase(), [selectedCategory]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCat =
        !normalizedCategory ||
        (product.category && product.category.toLowerCase().includes(normalizedCategory)) ||
        (product.collections && product.collections.some((c) => c.toLowerCase().includes(normalizedCategory))) ||
        (normalizedCategory === "originals" && (product.is_original || product.category === "Originals"));

      const matchesQuery = matchProduct(product, debouncedSearchTerm);
      return matchesCat && matchesQuery;
    });
  }, [products, normalizedCategory, debouncedSearchTerm]);

  // 6. Derive Discovery Collections (reusing existing product data)
  const recentlyViewedProducts = useMemo(() => {
    if (recentlyViewedIds.length === 0) return [];
    return recentlyViewedIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean) as Product[];
  }, [recentlyViewedIds, products]);

  const fallbackRecommendations = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    searchInputRef.current?.focus();
  };

  return (
    <section className="product-browser" id="products" aria-label="Products Storefront">
      {/* ── SEARCH & CATEGORY FILTERING CONTROLS ── */}
      <SectionReveal>
        <div className="store-controls" style={{ marginBottom: "36px" }}>
          {/* Interactive Search Bar with Keyboard Hint & Clear Button */}
          <div style={{ position: "relative", width: "100%" }}>
            <input
              id="product-search-input"
              ref={searchInputRef}
              aria-label="Search collection by keyword, category, brand, or tag"
              className="product-search"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search RA2Z collection... (Press '/' or Ctrl+K to focus)"
              type="search"
              value={searchTerm}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredProducts.length > 0) {
                  document.getElementById("catalog-grid-top")?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              style={{
                width: "100%",
                paddingRight: searchTerm ? "40px" : "80px",
                transition: "border-color 0.25s ease, box-shadow 0.25s ease",
              }}
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "16px",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            ) : (
              <span
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  background: "rgba(255, 255, 255, 0.06)",
                  padding: "3px 7px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  pointerEvents: "none",
                }}
              >
                /
              </span>
            )}
          </div>

          {/* Category Chips Bar with Active Glow (Filtered to Active Catalog Categories - Fix #2) */}
          <div className="category-chips" aria-label="Filter by department">
            {activeCategoryOptions.map((category) => {
              const isActive = selectedCategory === category.value;
              return (
                <button
                  className={isActive ? "category-chip active" : "category-chip"}
                  key={category.label}
                  onClick={() => setSelectedCategory(category.value)}
                  type="button"
                  style={{
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    border: isActive ? "1px solid var(--gold)" : undefined,
                    boxShadow: isActive ? "0 0 16px rgba(201, 168, 76, 0.25)" : undefined,
                  }}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </SectionReveal>

      <div id="catalog-grid-top" />

      {/* ── PRODUCT GRID & STATES ── */}
      {isFiltering ? (
        // Skeleton Loaders while user is typing/filtering
        <div className="store-products" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
          {[1, 2, 3, 4].map((i) => (
            <ProductCardSkeleton key={`skel-${i}`} />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div>
          {/* Active Filter Result Counter */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", color: "var(--muted)", fontSize: "13px" }}>
            <span>
              Showing <strong style={{ color: "var(--foreground)" }}>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? "product" : "products"}
              {debouncedSearchTerm && <span> matching &ldquo;<strong style={{ color: "var(--gold)" }}>{debouncedSearchTerm}</strong>&rdquo;</span>}
              {selectedCategory && <span> in <strong style={{ color: "var(--gold)" }}>{selectedCategory}</strong></span>}
            </span>
            {(debouncedSearchTerm || selectedCategory) && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--gold)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="store-products stagger-children" key={`${selectedCategory}-${debouncedSearchTerm}`}>
            {filteredProducts.map((product, idx) => (
              <ProductCard key={`browser-${product.id || idx}-${idx}`} product={product} />
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        /* ── FIX #3: GENUINELY EMPTY STORE CATALOG INTENTIONAL STATE ── */
        <SectionReveal>
          <div
            className="empty-store animate-fade-in"
            style={{
              padding: "64px 24px",
              borderRadius: "24px",
              background: "rgba(21, 21, 21, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
              marginBottom: "60px",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>✨</div>
            <h3 style={{ color: "#FFFFFF", fontSize: "24px", fontWeight: 700, margin: "0 0 12px" }}>
              Collection Updating
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "15px", margin: "0 auto 24px", maxWidth: "460px", lineHeight: "1.6" }}>
              Our storefront catalog is currently being updated with new curated items. Please check back soon for our latest arrivals.
            </p>
          </div>
        </SectionReveal>
      ) : (
        /* ── SEARCH / FILTER EMPTY STATE WITH FALLBACK RECOMMENDATIONS ── */
        <SectionReveal>
          <div
            className="empty-store animate-fade-in"
            style={{
              padding: "48px 24px",
              borderRadius: "24px",
              background: "rgba(21, 21, 21, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              textAlign: "center",
              marginBottom: "60px",
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
            <h3 style={{ color: "#FFFFFF", fontSize: "22px", fontWeight: 700, margin: "0 0 8px" }}>
              No products found
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 auto 24px", maxWidth: "420px" }}>
              We couldn&apos;t find any items matching &ldquo;<strong style={{ color: "var(--gold)" }}>{debouncedSearchTerm || selectedCategory}</strong>&rdquo;. Try searching with broader terms or browse our recommended pieces below.
            </p>
            <MagneticButton>
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  padding: "12px 28px",
                  borderRadius: "999px",
                  background: "var(--gold)",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Clear Search & Filters
              </button>
            </MagneticButton>
          </div>

          {/* Fallback Recommendations so screen is never blank during search */}
          {fallbackRecommendations.length > 0 && (
            <div style={{ marginTop: "40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "24px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: 700, margin: 0 }}>
                  Recommended For You
                </h3>
              </div>
              <div className="store-products stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "24px" }}>
                {fallbackRecommendations.map((product, idx) => (
                  <ProductCard key={`fallback-${product.id || idx}-${idx}`} product={product} />
                ))}
              </div>
            </div>
          )}
        </SectionReveal>
      )}

      {/* ── TASK 4: RECENTLY VIEWED PRODUCTS DISCOVERY SECTION ── */}
      {recentlyViewedProducts.length > 0 && (
        <SectionReveal>
          <section aria-label="Recently Viewed Products" style={{ marginTop: "80px", paddingTop: "40px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div style={{ width: "32px", height: "1px", background: "var(--gold)", opacity: 0.6 }} />
              <div>
                <p className="eyebrow" style={{ color: "var(--gold)", margin: 0 }}>YOUR BROWSING HISTORY</p>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: 700, margin: "2px 0 0" }}>
                  Recently Viewed
                </h2>
              </div>
            </div>
            <div className="store-products stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
              {recentlyViewedProducts.slice(0, 4).map((product, idx) => (
                <ProductCard key={`rec-viewed-${product.id || idx}-${idx}`} product={product} />
              ))}
            </div>
          </section>
        </SectionReveal>
      )}
    </section>
  );
}

export default ProductBrowser;
