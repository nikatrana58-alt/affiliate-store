"use client";

import { useState, useMemo } from "react";
import type { Product, ProductVariantItem } from "@/lib/products";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { MagneticButton } from "@/components/magnetic-button";

import { PremiumProductGallery } from "@/components/premium-product-gallery";

type StorefrontVariantSelectorProps = {
  product: Product;
};

export function StorefrontVariantSelector({ product }: StorefrontVariantSelectorProps) {
  const variants = useMemo(() => product.variants || [], [product.variants]);

  // Extract unique Colors and Sizes across variants
  const { colors, sizes } = useMemo(() => {
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();

    for (const v of variants) {
      if (v.color?.trim()) {
        colorSet.add(v.color.trim());
      }
      if (v.size?.trim()) {
        sizeSet.add(v.size.trim());
      }
      if (v.attributes) {
        if (v.attributes["Color"]?.trim()) colorSet.add(v.attributes["Color"].trim());
        if (v.attributes["Size"]?.trim()) sizeSet.add(v.attributes["Size"].trim());
      }
    }

    return {
      colors: Array.from(colorSet),
      sizes: Array.from(sizeSet),
    };
  }, [variants]);

  const isColorRequired = colors.length > 0;
  const isSizeRequired = sizes.length > 0;

  // Selected Option States (defaults to first available options for 100% SSR/Hydration match)
  const [selectedColor, setSelectedColor] = useState<string | null>(() => colors[0] || null);
  const [selectedSize, setSelectedSize] = useState<string | null>(() => sizes[0] || null);

  const isSelectionComplete = useMemo(() => {
    if (isColorRequired && !selectedColor) return false;
    if (isSizeRequired && !selectedSize) return false;
    return true;
  }, [isColorRequired, selectedColor, isSizeRequired, selectedSize]);

  // Find exact matching variant
  const selectedVariant = useMemo<ProductVariantItem | null>(() => {
    if (variants.length === 0) return null;
    if (isColorRequired && !selectedColor) return null;
    if (isSizeRequired && !selectedSize) return null;

    return (
      variants.find(
        (v) =>
          (!selectedColor || v.color === selectedColor || v.attributes?.["Color"] === selectedColor) &&
          (!selectedSize || v.size === selectedSize || v.attributes?.["Size"] === selectedSize)
      ) || null
    );
  }, [variants, selectedColor, selectedSize, isColorRequired, isSizeRequired]);

  // Availability & Stock status
  const isAvailable = useMemo(() => {
    if (variants.length === 0) return true;
    if (!isSelectionComplete) return false;
    if (!selectedVariant) return false;
    return selectedVariant.stock > 0;
  }, [variants.length, isSelectionComplete, selectedVariant]);

  // Disabled Reason Text
  const disabledText = useMemo(() => {
    if (isColorRequired && !selectedColor && isSizeRequired && !selectedSize) {
      return "Select Color & Size";
    }
    if (isColorRequired && !selectedColor) {
      return "Select Color";
    }
    if (isSizeRequired && !selectedSize) {
      return "Select Size";
    }
    if (isSelectionComplete && !selectedVariant) {
      return "Combination Unavailable";
    }
    if (isSelectionComplete && selectedVariant && selectedVariant.stock <= 0) {
      return "Out of Stock";
    }
    return undefined;
  }, [isColorRequired, selectedColor, isSizeRequired, selectedSize, isSelectionComplete, selectedVariant]);

  // Determine current active price
  const activePrice = useMemo(() => {
    if (selectedVariant) {
      if (selectedVariant.price != null && selectedVariant.price > 0) {
        return selectedVariant.price;
      }
      if (product.price != null) {
        return product.price + (selectedVariant.price_delta || 0);
      }
    }
    return product.price;
  }, [selectedVariant, product.price]);

  // Inventory stock display text
  const stockText = useMemo(() => {
    if (variants.length === 0) {
      const stock = product.inventory_quantity ?? 999;
      return stock > 0 ? `${stock} In Stock` : "Out of Stock";
    }
    if (!isSelectionComplete) {
      return "Select Options";
    }
    if (!selectedVariant) {
      return "Unavailable";
    }
    return selectedVariant.stock > 0 ? `${selectedVariant.stock} In Stock` : "Out of Stock";
  }, [variants.length, product.inventory_quantity, isSelectionComplete, selectedVariant]);

  function formatPrice(price: number | null) {
    if (price === null) return "Check current price";
    return new Intl.NumberFormat("en-US", {
      currency: "USD",
      style: "currency",
    }).format(price);
  }

  return (
    <div className="storefront-variant-selector-wrapper">
      <div className="product-hero-container">
        
        {/* Left Column: Premium Interactive Image Gallery */}
        <section className="product-hero-image">
          <PremiumProductGallery
            images={product.images || (product.image ? [product.image] : [])}
            title={product.title}
            activeVariantImage={selectedVariant?.image}
          />
        </section>

        {/* Right Column: Hero Details & Variant Selection Controls */}
        <section className="product-hero-content">
          <div className="product-hero-meta">
            {product.category && <span className="category-tag">{product.category}</span>}
            {product.badge && <span className="product-badge">{product.badge}</span>}
          </div>

          <h1>{product.title}</h1>

          {/* Dynamic Price Display */}
          <div className="price-container">
            <span className="current-price">{formatPrice(activePrice)}</span>
            {product.compare_at_price && product.compare_at_price > (activePrice || 0) && (
              <span className="compare-price" style={{ textDecoration: "line-through", color: "var(--muted)", marginLeft: "12px" }}>
                {formatPrice(product.compare_at_price)}
              </span>
            )}
            <span
              className="price-badge"
              style={{
                marginLeft: "auto",
                background: !isSelectionComplete
                  ? "rgba(255,255,255,0.08)"
                  : isAvailable
                  ? "rgba(76,175,80,0.15)"
                  : "rgba(244,67,54,0.15)",
                color: !isSelectionComplete
                  ? "var(--muted)"
                  : isAvailable
                  ? "#81c784"
                  : "#e57373",
              }}
            >
              {stockText}
            </span>
          </div>

          {/* Color Selection Pills */}
          {colors.length > 0 && (
            <div className="variant-option-group" style={{ margin: "20px 0 14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--muted)" }}>
                Color: <strong style={{ color: selectedColor ? "var(--gold)" : "var(--foreground)" }}>{selectedColor || "Select Color (Required)"}</strong>
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {colors.map((color) => {
                  const isActive = selectedColor === color;
                  // Check if color option has stock for current selectedSize
                  const hasStock = variants.some(
                    (v) =>
                      (v.color === color || v.attributes?.["Color"] === color) &&
                      (!selectedSize || v.size === selectedSize || v.attributes?.["Size"] === selectedSize) &&
                      v.stock > 0
                  );

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: isActive ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.15)",
                        background: isActive ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.03)",
                        color: isActive ? "var(--gold)" : hasStock ? "var(--foreground)" : "var(--muted)",
                        opacity: hasStock ? 1 : 0.45,
                        textDecoration: hasStock ? "none" : "line-through",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {color} {!hasStock && <span style={{ fontSize: "10px", marginLeft: "4px" }}>(Out of stock)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection Pills */}
          {sizes.length > 0 && (
            <div className="variant-option-group" style={{ margin: "14px 0 20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--muted)" }}>
                Size: <strong style={{ color: selectedSize ? "var(--gold)" : "var(--foreground)" }}>{selectedSize || "Select Size (Required)"}</strong>
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {sizes.map((size) => {
                  const isActive = selectedSize === size;
                  // Check if size option has stock for current selectedColor
                  const hasStock = variants.some(
                    (v) =>
                      (v.size === size || v.attributes?.["Size"] === size) &&
                      (!selectedColor || v.color === selectedColor || v.attributes?.["Color"] === selectedColor) &&
                      v.stock > 0
                  );

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        border: isActive ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.15)",
                        background: isActive ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.03)",
                        color: isActive ? "var(--gold)" : hasStock ? "var(--foreground)" : "var(--muted)",
                        opacity: hasStock ? 1 : 0.45,
                        textDecoration: hasStock ? "none" : "line-through",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {size} {!hasStock && <span style={{ fontSize: "10px", marginLeft: "4px" }}>(Out of stock)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Variant Summary Badge */}
          {selectedVariant && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 14px", margin: "14px 0 20px", fontSize: "12px", color: "var(--muted)" }}>
              <span>Selected Variant: </span>
              <strong style={{ color: "var(--gold)" }}>{selectedVariant.name}</strong>
              {selectedVariant.sku && <span style={{ marginLeft: "12px" }}>SKU: <code>{selectedVariant.sku}</code></span>}
              <span style={{ marginLeft: "12px" }}>Stock: <strong>{selectedVariant.stock} units</strong></span>
            </div>
          )}

          <p className="product-description">
            {product.description || "High-quality product recommended by our experts. Perfect for your home or as a thoughtful gift."}
          </p>

          {/* Factual Dynamic Shipping Information Block */}
          <div
            className="shipping-info-block"
            style={{
              margin: "20px 0 16px",
              padding: "14px 16px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px 16px",
              fontSize: "12px",
            }}
          >
            <div>
              <div style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 600 }}>Ships From</div>
              <div style={{ color: "var(--foreground)", fontWeight: 700, marginTop: "2px" }}>
                {product.cj_product_id ? "Supplier Direct Warehouse" : "Store Warehouse"}
              </div>
            </div>

            <div>
              <div style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 600 }}>Estimated Delivery</div>
              <div style={{ color: "var(--foreground)", fontWeight: 700, marginTop: "2px" }}>
                7 – 15 Business Days
              </div>
            </div>

            <div>
              <div style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 600 }}>Processing Time</div>
              <div style={{ color: "var(--foreground)", fontWeight: 700, marginTop: "2px" }}>
                1 – 3 Business Days
              </div>
            </div>
          </div>

          {/* Clean, Factual Trust Badges */}
          <div className="trust-indicators" style={{ marginBottom: "16px" }}>
            <span className="trust-indicator">
              <span className="trust-indicator-icon">🔒</span>
              Encrypted SSL Checkout
            </span>
            <span className="trust-indicator">
              <span className="trust-indicator-icon">📦</span>
              Real-time Order Tracking
            </span>
          </div>

          <div className="purchase-actions">
            <MagneticButton className="buy-button-wrapper">
              <AddToCartButton
                product={product}
                disabled={!isSelectionComplete || !isAvailable}
                disabledText={disabledText}
                variant={{
                  variant_id: selectedVariant?.cj_variant_id || selectedVariant?.id || null,
                  variant_sku: selectedVariant?.sku || null,
                  color: selectedColor || selectedVariant?.color || null,
                  size: selectedSize || selectedVariant?.size || null,
                  price: activePrice || product.price || 0,
                }}
              />
            </MagneticButton>

            <p className="trust-text">🔒 Encrypted 256-bit SSL Secure Checkout</p>
          </div>
        </section>
      </div>
    </div>
  );
}
