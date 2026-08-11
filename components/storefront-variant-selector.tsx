"use client";

import { useState, useMemo } from "react";
import type { Product, ProductVariantItem } from "@/lib/products";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { getVariantFinalPrice, getProductDisplayPrice } from "@/lib/pricing-engine";
import { MagneticButton } from "@/components/magnetic-button";
import { PremiumProductGallery } from "@/components/premium-product-gallery";
import { sanitizeProductDescription } from "@/lib/utils/product-formatter";

type StorefrontVariantSelectorProps = {
  product: Product;
};

export function StorefrontVariantSelector({ product }: StorefrontVariantSelectorProps) {
  const variants = useMemo(() => product.variants || [], [product.variants]);

  // Extract unique Colors, Sizes, and Option Styles across variants
  const { colors, sizes, styles } = useMemo(() => {
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    const styleSet = new Set<string>();

    for (const v of variants) {
      if (v.color?.trim()) {
        colorSet.add(v.color.trim());
      }
      if (v.size?.trim()) {
        sizeSet.add(v.size.trim());
      }
      if (v.attributes) {
        Object.entries(v.attributes).forEach(([k, val]) => {
          if (!val || typeof val !== "string" || k.startsWith("Weight")) return;
          const lowerK = k.toLowerCase();
          const hasExplicitColor = Boolean(v.color?.trim());
          const hasExplicitSize = Boolean(v.size?.trim());
          if (!hasExplicitColor && (lowerK.includes("color") || lowerK.includes("style") || lowerK.includes("pattern"))) {
            colorSet.add(val.trim());
          } else if (!hasExplicitSize && (lowerK.includes("size") || lowerK.includes("option") || lowerK.includes("specification") || lowerK.includes("model"))) {
            sizeSet.add(val.trim());
          } else if (!hasExplicitColor && !hasExplicitSize) {
            styleSet.add(val.trim());
          }
        });
      }
      if (!v.color && !v.size && (!v.attributes || Object.keys(v.attributes).length === 0)) {
        if (v.name?.trim()) styleSet.add(v.name.trim());
      }
    }

    return {
      colors: Array.from(colorSet),
      sizes: Array.from(sizeSet),
      styles: colorSet.size === 0 && sizeSet.size === 0 ? Array.from(styleSet) : [],
    };
  }, [variants]);

  const isColorRequired = colors.length > 0;
  const isSizeRequired = sizes.length > 0;
  const isStyleRequired = styles.length > 0;

  // Helper function for case-insensitive attribute value comparison
  const matchAttrValue = (val1: string | null | undefined, val2: string | null | undefined): boolean => {
    if (!val1 || !val2) return false;
    return val1.trim().toLowerCase() === val2.trim().toLowerCase();
  };

  const matchesColor = (v: ProductVariantItem, targetColor: string | null): boolean => {
    if (!targetColor) return false;
    if (matchAttrValue(v.color, targetColor)) return true;
    if (v.attributes) {
      for (const [k, val] of Object.entries(v.attributes)) {
        const lowerK = k.toLowerCase();
        if (lowerK.includes("color") || lowerK.includes("style") || lowerK.includes("pattern")) {
          if (matchAttrValue(val, targetColor)) return true;
        }
      }
    }
    return false;
  };

  const matchesSize = (v: ProductVariantItem, targetSize: string | null): boolean => {
    if (!targetSize) return false;
    if (matchAttrValue(v.size, targetSize)) return true;
    if (v.attributes) {
      for (const [k, val] of Object.entries(v.attributes)) {
        const lowerK = k.toLowerCase();
        if (lowerK.includes("size") || lowerK.includes("option") || lowerK.includes("specification") || lowerK.includes("model")) {
          if (matchAttrValue(val, targetSize)) return true;
        }
      }
    }
    return false;
  };

  // Initial default option selection (defaults to first VALID variant combination for 100% hydration match)
  const defaultVariant = variants[0] || null;

  const defaultColor = useMemo(() => {
    if (!defaultVariant) return colors[0] || null;
    if (defaultVariant.color?.trim()) return defaultVariant.color.trim();
    if (defaultVariant.attributes) {
      for (const [k, val] of Object.entries(defaultVariant.attributes)) {
        const lowerK = k.toLowerCase();
        if ((lowerK.includes("color") || lowerK.includes("style") || lowerK.includes("pattern")) && typeof val === "string") {
          return val.trim();
        }
      }
    }
    return colors[0] || null;
  }, [defaultVariant, colors]);

  const defaultSize = useMemo(() => {
    if (!defaultVariant) return sizes[0] || null;
    if (defaultVariant.size?.trim()) return defaultVariant.size.trim();
    if (defaultVariant.attributes) {
      for (const [k, val] of Object.entries(defaultVariant.attributes)) {
        const lowerK = k.toLowerCase();
        if ((lowerK.includes("size") || lowerK.includes("option") || lowerK.includes("specification") || lowerK.includes("model")) && typeof val === "string") {
          return val.trim();
        }
      }
    }
    return sizes[0] || null;
  }, [defaultVariant, sizes]);

  const defaultStyle = useMemo(() => {
    if (!defaultVariant) return styles[0] || null;
    if (defaultVariant.name?.trim()) return defaultVariant.name.trim();
    return styles[0] || null;
  }, [defaultVariant, styles]);

  const [selectedColor, setSelectedColor] = useState<string | null>(() => defaultColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(() => defaultSize);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(() => defaultStyle);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  // Derive short description preview vs full clean description
  const { shortPreview, fullCleanDescription } = useMemo(() => {
    const fullText = sanitizeProductDescription(product.description);
    if (product.short_description?.trim()) {
      return {
        shortPreview: product.short_description.trim(),
        fullCleanDescription: fullText,
      };
    }
    // Extract first 2 sentences (or ~160 chars)
    const sentences = fullText.split(/(?<=[.!?])\s+/);
    let preview = sentences.slice(0, 2).join(" ");
    if (preview.length > 220) {
      preview = preview.slice(0, 217) + "...";
    }
    return {
      shortPreview: preview || fullText,
      fullCleanDescription: fullText,
    };
  }, [product.description, product.short_description]);

  // Auto-adjust size when color changes if previous size is unavailable for newly selected color
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);

    if (isSizeRequired && selectedSize) {
      const isValid = variants.some(
        (v) => matchesColor(v, color) && matchesSize(v, selectedSize)
      );

      if (!isValid) {
        const firstValidForColor = variants.find((v) => matchesColor(v, color));
        if (firstValidForColor) {
          const newSize = firstValidForColor.size || firstValidForColor.attributes?.["Size"] || firstValidForColor.attributes?.["size"] || firstValidForColor.attributes?.["Option"] || null;
          setSelectedSize(newSize);
        }
      }
    }
  };

  // Auto-adjust color when size changes if previous color is unavailable for newly selected size
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);

    if (isColorRequired && selectedColor) {
      const isValid = variants.some(
        (v) => matchesColor(v, selectedColor) && matchesSize(v, size)
      );

      if (!isValid) {
        const firstValidForSize = variants.find((v) => matchesSize(v, size));
        if (firstValidForSize) {
          const newColor = firstValidForSize.color || firstValidForSize.attributes?.["Color"] || firstValidForSize.attributes?.["color"] || firstValidForSize.attributes?.["Style"] || null;
          setSelectedColor(newColor);
        }
      }
    }
  };

  const isSelectionComplete = useMemo(() => {
    if (isColorRequired && !selectedColor) return false;
    if (isSizeRequired && !selectedSize) return false;
    if (isStyleRequired && !selectedStyle) return false;
    return true;
  }, [isColorRequired, selectedColor, isSizeRequired, selectedSize, isStyleRequired, selectedStyle]);

  // Find exact matching variant - NEVER fall back to variants[0]!
  const selectedVariant = useMemo<ProductVariantItem | null>(() => {
    if (variants.length === 0) return null;
    if (isColorRequired && !selectedColor) return null;
    if (isSizeRequired && !selectedSize) return null;
    if (isStyleRequired && !selectedStyle) return null;

    const matched = variants.find(
      (v) =>
        (!isColorRequired || matchesColor(v, selectedColor)) &&
        (!isSizeRequired || matchesSize(v, selectedSize)) &&
        (!isStyleRequired || matchAttrValue(v.name, selectedStyle) || Object.values(v.attributes || {}).some(val => matchAttrValue(val, selectedStyle)))
    );

    return matched || null; // ABSOLUTELY NO FALLBACK TO variants[0]
  }, [variants, selectedColor, selectedSize, selectedStyle, isColorRequired, isSizeRequired, isStyleRequired]);

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
      return getVariantFinalPrice(selectedVariant, product.price || 0, product.profit);
    }
    const display = getProductDisplayPrice(product);
    return display.price;
  }, [selectedVariant, product]);

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

          {/* Short Description Preview with Expandable See More / See Less Toggle */}
          <div className="product-description-preview-container" style={{ margin: "14px 0 20px" }}>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "14px",
                lineHeight: "1.65",
                margin: 0,
                transition: "all 0.3s ease",
              }}
            >
              {isDescriptionExpanded ? fullCleanDescription : shortPreview}
            </p>

            {fullCleanDescription.length > shortPreview.length && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--gold)",
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "6px 0 0",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "color 0.2s ease",
                }}
              >
                {isDescriptionExpanded ? "See Less ▲" : "See More ▼"}
              </button>
            )}
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
                      matchesColor(v, color) &&
                      (!selectedSize || matchesSize(v, selectedSize)) &&
                      v.stock > 0
                  );

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorSelect(color)}
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
                      matchesSize(v, size) &&
                      (!selectedColor || matchesColor(v, selectedColor)) &&
                      v.stock > 0
                  );

                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleSizeSelect(size)}
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

          {/* Style / Option Selection Pills */}
          {styles.length > 0 && (
            <div className="variant-option-group" style={{ margin: "14px 0 20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--muted)" }}>
                Option: <strong style={{ color: selectedStyle ? "var(--gold)" : "var(--foreground)" }}>{selectedStyle || "Select Option (Required)"}</strong>
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {styles.map((style) => {
                  const isActive = selectedStyle === style;
                  const matchingVar = variants.find((v) => matchAttrValue(v.name, style) || Object.values(v.attributes || {}).some(val => matchAttrValue(val, style)));
                  const hasStock = matchingVar ? matchingVar.stock > 0 : true;

                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSelectedStyle(style)}
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
                      {style} {!hasStock && <span style={{ fontSize: "10px", marginLeft: "4px" }}>(Out of stock)</span>}
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
              <span style={{ marginLeft: "12px" }}>Stock: <strong>{selectedVariant.stock} units</strong></span>
            </div>
          )}



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
                RA2Z Fulfillment Center
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
                disabled={!isSelectionComplete || !isAvailable || !selectedVariant}
                disabledText={disabledText}
                variant={{
                  variant_id: selectedVariant?.cj_variant_id || selectedVariant?.id || null,
                  variant_sku: selectedVariant?.sku || null,
                  color: selectedColor || selectedVariant?.color || null,
                  size: selectedSize || selectedVariant?.size || null,
                  price: activePrice || product.price || 0,
                  image: selectedVariant?.image || null,
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
