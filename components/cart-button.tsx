"use client";

import { useCallback, useEffect, useState } from "react";
import { MagneticButton } from "@/components/magnetic-button";
import { CartDrawer } from "@/components/cart-drawer";
import { useCart } from "@/lib/cart";

export function CartButton() {
  const { itemCount } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <MagneticButton className="navbar-link-wrapper">
        <button
          id="cart-open-button"
          aria-label={`Open cart, ${itemCount} item${itemCount !== 1 ? "s" : ""}`}
          className="cart-icon-button"
          onClick={openDrawer}
        >
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
          {mounted && itemCount > 0 && (
            <span className="cart-badge" aria-hidden="true">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          )}
        </button>
      </MagneticButton>

      <CartDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}

export default CartButton;

