"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Tilt from "react-parallax-tilt";
import { ProductBadge } from "@/components/product-badge";
import { MagneticButton } from "@/components/magnetic-button";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
  variant?: "default" | "featured";
};

function formatPrice(price: number | null) {
  if (price === null) return "See latest price";

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const [isTouch, setIsTouch] = useState(false);
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      setIsTouch(true);
    }
  }, []);

  const handleAddToCart = useCallback(() => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }, [addToCart, product]);

  return (
    <Tilt
      tiltEnable={!isTouch}
      tiltMaxAngleX={6}
      tiltMaxAngleY={6}
      perspective={1200}
      scale={1.02}
      reset
      transitionSpeed={400}
      transitionEasing="cubic-bezier(0.16, 1, 0.3, 1)"
      glareEnable
      glareMaxOpacity={0.15}
      glareBorderRadius="20px"
      glareColor="#E8B4B8"
      className="tilt-wrapper"
    >
      <article
        className={
          variant === "featured"
            ? "store-product-card featured-product-card card-3d"
            : "store-product-card card-3d"
        }
      >
        <div className="store-product-image-wrapper">
          <Link className="store-product-image" href={`/products/${product.slug}`}>
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={product.title} src={product.image} />
            ) : (
              <span className="image-placeholder">Image coming soon</span>
            )}
          </Link>
          <div className="store-product-image-reflection" aria-hidden="true" />
        </div>
        <div className="store-product-body">
          <div className="product-meta">
            {product.category ? <span>{product.category}</span> : null}
            <ProductBadge badge={product.badge} />
          </div>
          <h2>
            <Link href={`/products/${product.slug}`}>{product.title}</Link>
          </h2>
          <p>{product.description || "Explore this recommended product."}</p>
          <div className="product-card-footer">
            <span className="product-price">{formatPrice(product.price)}</span>
            <div className="product-card-actions">
              <MagneticButton className="product-detail-link-wrapper">
                <Link className="product-detail-link" href={`/products/${product.slug}`}>
                  View details
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{marginLeft: "4px"}}>
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </Link>
              </MagneticButton>
              <button
                id={`card-add-to-cart-${product.id}`}
                aria-label={added ? `${product.title} added to cart` : `Add ${product.title} to cart`}
                className={`product-atc-btn ${added ? "product-atc-btn--added" : ""}`}
                onClick={handleAddToCart}
              >
                {added ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" aria-hidden="true">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                )}
                {added ? "Added" : "Add"}
              </button>
            </div>
          </div>
        </div>
      </article>
    </Tilt>
  );
}
