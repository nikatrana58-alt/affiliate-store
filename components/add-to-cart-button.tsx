"use client";

import { useState, useCallback } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/products";

type AddToCartButtonProps = {
  product: Product;
  className?: string;
  /** Compact variant used in sticky mobile bar */
  size?: "default" | "small";
};

export function AddToCartButton({
  product,
  className,
  size = "default",
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleClick = useCallback(() => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }, [addToCart, product]);

  const baseClass =
    size === "small" ? "buy-amazon-button small" : "buy-amazon-button";
  const resolvedClass = className ?? baseClass;

  return (
    <button
      id={`add-to-cart-${product.id}`}
      aria-label={
        added ? `${product.title} added to cart` : `Add ${product.title} to cart`
      }
      className={`${resolvedClass} add-to-cart-btn ${added ? "add-to-cart-btn--added" : ""}`}
      onClick={handleClick}
    >
      {added ? (
        <>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Added!
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          Add to Cart
        </>
      )}
    </button>
  );
}

export default AddToCartButton;

