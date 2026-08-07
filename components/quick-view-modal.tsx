"use client";

import { useState, useEffect, useMemo } from "react";
import type { Product } from "@/lib/products";
import { getProductDisplayPrice, getVariantFinalPrice } from "@/lib/pricing-engine";
import { useCart } from "@/lib/cart";
import { sanitizeProductDescription } from "@/lib/utils/product-formatter";
import { recordRecentlyViewed } from "@/components/product-card";

type QuickViewModalProps = {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
};

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (isOpen && product?.id) {
      recordRecentlyViewed(product.id);
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const displayPrice = getProductDisplayPrice(product);
  const variants = product.variants || [];
  const gallery = product.images || (product.image ? [product.image] : []);
  const activeImage = selectedImage || gallery[0] || product.image || "";

  const activeVariant = variants.find((v) => v.id === selectedVariantId || v.sku === selectedVariantId) || null;
  const activePrice = activeVariant
    ? getVariantFinalPrice(activeVariant, product.price || 0, product.profit)
    : displayPrice.price;

  const handleAddToCart = () => {
    addToCart(product, activeVariant ? {
      variant_id: activeVariant.id,
      variant_sku: activeVariant.sku,
      color: activeVariant.color,
      size: activeVariant.size,
      price: activePrice,
    } : null);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div
      className="quick-view-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="quick-view-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#121319",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          maxWidth: "850px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "28px",
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          color: "var(--foreground)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            color: "var(--foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Left Column: Image Gallery */}
          <div>
            <div
              style={{
                aspectRatio: "1/1",
                borderRadius: "14px",
                overflow: "hidden",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                marginBottom: "12px",
              }}
            >
              <img
                src={activeImage}
                alt={product.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {gallery.length > 1 && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: activeImage === img ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      padding: 0,
                      background: "none",
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                {product.category || "RA2Z Curation"}
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: 800, margin: "8px 0 12px", lineHeight: "1.3" }}>
                {product.title}
              </h2>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--gold)" }}>
                  ${activePrice.toFixed(2)}
                </span>
                {product.compare_at_price && product.compare_at_price > activePrice && (
                  <span style={{ textDecoration: "line-through", color: "var(--muted)", fontSize: "16px" }}>
                    ${product.compare_at_price.toFixed(2)}
                  </span>
                )}
              </div>

              <p style={{ fontSize: "14px", color: "var(--foreground-secondary)", lineHeight: "1.6", marginBottom: "20px" }}>
                {sanitizeProductDescription(product.description)}
              </p>

              {/* Variant Selector */}
              {variants.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "8px", color: "var(--muted)" }}>
                    Select Variant:
                  </label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {variants.map((v) => {
                      const isSel = selectedVariantId === (v.id || v.sku);
                      const vPrice = getVariantFinalPrice(v, product.price || 0, product.profit);
                      return (
                        <button
                          key={v.id || v.sku || v.name}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(v.id || v.sku || null);
                            if (v.image) setSelectedImage(v.image);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            border: isSel ? "2px solid var(--gold)" : "1px solid rgba(255,255,255,0.12)",
                            background: isSel ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.03)",
                            color: isSel ? "var(--gold)" : "var(--foreground)",
                            cursor: "pointer",
                          }}
                        >
                          {v.name} (${vPrice.toFixed(2)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                type="button"
                onClick={handleAddToCart}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "10px",
                  background: added ? "#4caf50" : "var(--gold)",
                  color: "#000",
                  fontWeight: 800,
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {added ? "✓ Added to Cart" : "Add to Cart"}
              </button>

              <a
                href={`/products/${product.slug}`}
                style={{
                  padding: "14px 20px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--foreground)",
                  fontWeight: 700,
                  fontSize: "14px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Full Details →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
