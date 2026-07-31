"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/lib/cart";
import type { CartItem } from "@/lib/cart";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(price);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CartItemRow({ item, index }: { item: CartItem; index: number }) {
  const { removeFromCart, updateQuantity } = useCart();
  const { product, quantity, variant, unitPrice } = item;

  const itemPrice = unitPrice ?? variant?.price ?? product.price ?? 0;
  const variantSummary = [variant?.color, variant?.size].filter(Boolean).join(" / ");

  return (
    <div className="cart-item">
      <div className="cart-item-image">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={product.title} src={product.image} />
        ) : (
          <div className="cart-item-image-placeholder" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              width="20"
              height="20"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
        )}
      </div>

      <div className="cart-item-info">
        <p className="cart-item-title">{product.title}</p>
        {variantSummary ? (
          <p className="cart-item-category" style={{ color: "var(--gold)", fontWeight: 600 }}>
            {variantSummary} {variant?.variant_sku ? `(${variant.variant_sku})` : ""}
          </p>
        ) : (
          product.category && <p className="cart-item-category">{product.category}</p>
        )}
        <p className="cart-item-price">
          {formatPrice(itemPrice * quantity)}
        </p>
      </div>

      <div className="cart-item-controls">
        <div className="cart-qty-controls">
          <button
            aria-label="Decrease quantity"
            className="cart-qty-btn"
            onClick={() => updateQuantity(index, quantity - 1)}
          >
            −
          </button>
          <span className="cart-qty-value">{quantity}</span>
          <button
            aria-label="Increase quantity"
            className="cart-qty-btn"
            onClick={() => updateQuantity(index, quantity + 1)}
          >
            +
          </button>
        </div>

        <button
          aria-label={`Remove ${product.title} from cart`}
          className="cart-remove-btn"
          onClick={() => removeFromCart(index)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="14"
            height="14"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="cart-empty">
      <div className="cart-empty-icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="48"
          height="48"
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <p className="cart-empty-title">Your cart is empty</p>
      <p className="cart-empty-subtitle">
        Add items from the collection to get started.
      </p>
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, itemCount, cartTotal, clearCart } = useCart();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Trap focus & close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    closeButtonRef.current?.focus();
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            className="cart-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            key="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
          >
            {/* Header */}
            <div className="cart-drawer-header">
              <div className="cart-drawer-title-row">
                <h2 className="cart-drawer-title">Your Cart</h2>
                {itemCount > 0 && (
                  <span className="cart-drawer-count">
                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                ref={closeButtonRef}
                aria-label="Close cart"
                className="cart-close-btn"
                onClick={onClose}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="18"
                  height="18"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="cart-drawer-divider" aria-hidden="true" />

            {/* Body */}
            <div className="cart-drawer-body">
              {items.length === 0 ? (
                <EmptyCart />
              ) : (
                <div className="cart-items-list">
                  {items.map((item, idx) => (
                    <CartItemRow key={idx} item={item} index={idx} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer — only when cart has items */}
            {items.length > 0 && (
              <div className="cart-drawer-footer">
                <div className="cart-drawer-divider" aria-hidden="true" />

                <div className="cart-summary">
                  <div className="cart-summary-row">
                    <span className="cart-summary-label">Subtotal</span>
                    <span className="cart-summary-value">
                      {formatPrice(cartTotal)}
                    </span>
                  </div>
                  <p className="cart-summary-note">
                    Taxes and shipping calculated at checkout
                  </p>
                </div>

                <div className="cart-footer-actions">
                  <button
                    id="cart-checkout-button"
                    className="cart-checkout-btn"
                    onClick={() => {
                      onClose();
                      router.push("/checkout");
                    }}
                  >
                    Proceed to Checkout
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="16"
                      height="16"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    className="cart-clear-btn"
                    onClick={clearCart}
                  >
                    Clear cart
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;

