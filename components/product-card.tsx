"use client";

import { useCallback, useEffect, useState, useMemo, memo } from "react";
import Link from "next/link";
import Image from "next/image";
import Tilt from "react-parallax-tilt";
import { ProductBadge } from "@/components/product-badge";
import { MagneticButton } from "@/components/magnetic-button";
import { QuickViewModal } from "@/components/quick-view-modal";
import { useCart } from "@/lib/cart";
import { SmartPricingEngine } from "@/lib/pricing/smart-pricing-engine";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
  variant?: "default" | "featured";
};

function formatPrice(price: number | null) {
  if (price === null || price === undefined) return "Check price";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

export function recordRecentlyViewed(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const key = "ra2z_recently_viewed";
    const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = [id, ...existing.filter((item) => item !== id)].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore localStorage write failures
  }
}

export function ProductCardSkeleton() {
  return (
    <div
      style={{
        borderRadius: "20px",
        background: "rgba(21, 21, 21, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        aspectRatio: "3/4",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        animation: "pulse 1.5s infinite ease-in-out",
      }}
    >
      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }} />
      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ width: "40%", height: "12px", borderRadius: "6px", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ width: "85%", height: "16px", borderRadius: "6px", background: "rgba(255,255,255,0.1)" }} />
        <div style={{ width: "50%", height: "14px", borderRadius: "6px", background: "rgba(255,255,255,0.08)" }} />
      </div>
    </div>
  );
}

export const ProductCard = memo(function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const [mounted, setMounted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      setIsTouch(true);
    }
    // Check initial wishlist state from localStorage
    try {
      const storedWishlist = JSON.parse(localStorage.getItem("curated_wishlist") || "[]");
      if (Array.isArray(storedWishlist) && storedWishlist.includes(product.id)) {
        setIsWishlisted(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, [product.id]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const stored = JSON.parse(localStorage.getItem("curated_wishlist") || "[]");
      let updated: string[] = [];
      if (isWishlisted) {
        updated = stored.filter((id: string) => id !== product.id);
        setIsWishlisted(false);
      } else {
        updated = [...stored, product.id];
        setIsWishlisted(true);
      }
      localStorage.setItem("curated_wishlist", JSON.stringify(updated));
    } catch {
      setIsWishlisted(!isWishlisted);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/products/${product.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1800);
    }
  };

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }, [addToCart, product]);

  // Compute pricing directly from authoritative variant selling prices
  const displayPricing = useMemo(() => {
    const rawVariants = Array.isArray(product.variants) ? product.variants : [];

    // Extract valid, explicit positive variant selling prices (ignore null, undefined, <=0)
    const validPrices = rawVariants
      .map((v) => (v.price != null && !isNaN(Number(v.price)) && Number(v.price) > 0 ? Number(v.price) : null))
      .filter((p): p is number => p !== null);

    if (validPrices.length > 0) {
      const minPrice = Math.min(...validPrices);
      const maxPrice = Math.max(...validPrices);
      const hasMultiplePrices = minPrice !== maxPrice;
      const compareAtPrice =
        product.compare_at_price != null && Number(product.compare_at_price) > minPrice
          ? Number(product.compare_at_price)
          : null;

      return {
        displayPrice: minPrice,
        compareAtPrice,
        hasMultiplePrices,
      };
    }

    // Fallback if product has no variants with valid prices
    const fallbackPrice =
      product.price != null && !isNaN(Number(product.price)) && Number(product.price) > 0
        ? Number(product.price)
        : 0;
    const compareAtPrice =
      product.compare_at_price != null && Number(product.compare_at_price) > fallbackPrice
        ? Number(product.compare_at_price)
        : null;

    return {
      displayPrice: fallbackPrice,
      compareAtPrice,
      hasMultiplePrices: false,
    };
  }, [product]);

  // Images for hover image swap
  const primaryImage = product.image || (product.images && product.images[0]) || "";
  const secondaryImage = (product.images && product.images.length > 1) ? product.images[1] : primaryImage;

  // Check if description is long enough to warrant See More
  const rawDescription = product.description || "High quality product handpicked for quality and elegance.";
  const isLongDescription = rawDescription.length > 110;

  // Discount percentage calculation
  const discountPercent = useMemo(() => {
    if (displayPricing.compareAtPrice && displayPricing.compareAtPrice > displayPricing.displayPrice) {
      const pct = Math.round(((displayPricing.compareAtPrice - displayPricing.displayPrice) / displayPricing.compareAtPrice) * 100);
      return pct > 0 ? `${pct}% OFF` : null;
    }
    return null;
  }, [displayPricing]);

  return (
    <>
      <Tilt
        tiltEnable={mounted && !isTouch}
        tiltMaxAngleX={5}
        tiltMaxAngleY={5}
        perspective={1200}
        scale={1.01}
        reset
        transitionSpeed={400}
        transitionEasing="cubic-bezier(0.16, 1, 0.3, 1)"
        glareEnable
        glareMaxOpacity={0.12}
        glareBorderRadius="16px"
        glareColor="#C9A84C"
        className="tilt-wrapper"
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <article
          className={`store-product-card smart-product-card-v3 ${variant === "featured" ? "featured-product-card" : ""}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "rgba(21, 21, 21, 0.80)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: isHovered ? "1px solid rgba(212, 175, 55, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            overflow: "hidden",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            position: "relative",
            boxShadow: isHovered
              ? "0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.16)"
              : "0 8px 28px rgba(0, 0, 0, 0.4)",
            transform: isHovered ? "translateY(-4px)" : "translateY(0)",
          }}
        >
          {/* Image Showcase & Quick Action Overlay */}
          <div className="store-product-image-wrapper" style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
            <Link className="store-product-image" href={`/products/${product.slug}`} prefetch={true} onClick={() => recordRecentlyViewed(product.id)} style={{ display: "block", width: "100%", height: "100%", position: "relative" }}>
              {primaryImage ? (
                <Image
                  alt={product.title}
                  src={isHovered && secondaryImage ? secondaryImage : primaryImage}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{
                    objectFit: "cover",
                    transition: "transform 0.4s ease, filter 0.3s ease",
                    transform: isHovered ? "scale(1.06)" : "scale(1)",
                  }}
                />
              ) : (
                <span className="image-placeholder">Image coming soon</span>
              )}
            </Link>

            {/* Discount Badge */}
            {discountPercent && (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  zIndex: 3,
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    background: "rgba(244, 67, 54, 0.85)",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {discountPercent}
                </span>
              </div>
            )}

            {/* Quick Action Floating Bar (Hover Overlay) */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                zIndex: 4,
                opacity: isHovered || isTouch ? 1 : 0,
                transform: isHovered || isTouch ? "translateY(0)" : "translateY(-6px)",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Wishlist Button */}
              <button
                type="button"
                onClick={toggleWishlist}
                aria-label="Add to Wishlist"
                title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: isWishlisted ? "#ff4d4d" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "transform 0.15s ease",
                }}
              >
                <svg viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              {/* Quick View Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  recordRecentlyViewed(product.id);
                  setIsQuickViewOpen(true);
                }}
                aria-label="Quick View"
                title="Quick View Details"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share Link"
                title={copiedShare ? "Link Copied!" : "Share Product"}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: copiedShare ? "var(--gold)" : "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: copiedShare ? "#000" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {copiedShare ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Product Body Content */}
          <div className="store-product-body" style={{ padding: "16px", display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "space-between" }}>
            <div>
              {/* Category & Badge */}
              <div className="product-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  {product.category || "RA2Z"}
                </span>
                <ProductBadge badge={product.badge} />
              </div>

              {/* Title (Line-clamp 2) */}
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  margin: "0 0 6px 0",
                  lineHeight: "1.35",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  height: "2.7em",
                }}
              >
                <Link href={`/products/${product.slug}`} style={{ color: "var(--foreground)", textDecoration: "none" }}>
                  {product.title}
                </Link>
              </h2>

              {/* Rating Stars (Only when verified rating data exists) */}
              {(product as any).rating || (product as any).review_count ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                  <span style={{ color: "#FFD700", fontSize: "12px", letterSpacing: "1px" }}>★★★★★</span>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                    {Number((product as any).rating || 5).toFixed(1)} ({(product as any).review_count || 0})
                  </span>
                </div>
              ) : null}
            </div>

            {/* Product Card Footer (Price & Action Buttons) */}
            <div className="product-card-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", marginTop: "auto" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
                <span className="product-price" style={{ fontSize: "16px", fontWeight: 800, color: "var(--gold)" }}>
                  {displayPricing.hasMultiplePrices
                    ? `From ${formatPrice(displayPricing.displayPrice)}`
                    : formatPrice(displayPricing.displayPrice)}
                </span>
                {displayPricing.compareAtPrice && displayPricing.compareAtPrice > displayPricing.displayPrice && (
                  <span style={{ fontSize: "12px", color: "var(--muted)", textDecoration: "line-through" }}>
                    {formatPrice(displayPricing.compareAtPrice)}
                  </span>
                )}
              </div>

              <div className="product-card-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <MagneticButton className="product-detail-link-wrapper">
                  <Link
                    className="product-detail-link"
                    href={`/products/${product.slug}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      padding: "8px 10px",
                      fontSize: "11px",
                      fontWeight: 700,
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--foreground)",
                      textDecoration: "none",
                    }}
                  >
                    Details
                  </Link>
                </MagneticButton>

                <button
                  id={`card-add-to-cart-${product.id}`}
                  aria-label={added ? `${product.title} added to cart` : `Add ${product.title} to cart`}
                  className={`product-atc-btn ${added ? "product-atc-btn--added" : ""}`}
                  onClick={handleAddToCart}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    borderRadius: "8px",
                    background: added ? "#4caf50" : "var(--gold)",
                    color: "#000",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {added ? "✓ Added" : "Quick Add"}
                </button>
              </div>
            </div>
          </div>
        </article>
      </Tilt>

      {/* Quick View Modal - Mounted conditionally only when opened */}
      {isQuickViewOpen && (
        <QuickViewModal
          product={product}
          isOpen={true}
          onClose={() => setIsQuickViewOpen(false)}
        />
      )}
    </>
  );
});
