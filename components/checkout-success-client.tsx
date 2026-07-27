"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";

export function CheckoutSuccessClient() {
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear shopping cart on successful checkout redirect
    clearCart();
  }, [clearCart]);

  return null;
}
