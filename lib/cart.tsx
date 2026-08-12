"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/products";

/**
 * Resolves the authoritative selling price for a product/variant in cart.
 *
 * Resolution order:
 * 1. If an explicit selected variant exists and has a valid positive `price`: USE THAT PRICE.
 * 2. Inspect product.variants and collect valid positive stored variant selling prices (> 0).
 * 3. If valid variant prices exist: USE THE MINIMUM VALID VARIANT SELLING PRICE.
 * 4. Fallback to product.price if valid and positive (> 0).
 * 5. Fallback to 0.
 */
export function resolveCartItemSellingPrice(
  product: Product,
  variant?: CartVariantSelection | null
): number {
  // 1. Explicit selected variant price
  if (variant?.price != null && !isNaN(Number(variant.price)) && Number(variant.price) > 0) {
    return Number(variant.price);
  }

  // 2. Minimum valid variant selling price from product.variants
  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const validPrices = rawVariants
    .map((v) => (v.price != null && !isNaN(Number(v.price)) && Number(v.price) > 0 ? Number(v.price) : null))
    .filter((p): p is number => p !== null);

  if (validPrices.length > 0) {
    return Math.min(...validPrices);
  }

  // 3. Safe fallback to product.price
  if (product.price != null && !isNaN(Number(product.price)) && Number(product.price) > 0) {
    return Number(product.price);
  }

  return 0;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type CartVariantSelection = {
  variant_id?: string | null;
  variant_sku?: string | null;
  color?: string | null;
  size?: string | null;
  price?: number | null;
  image?: string | null;
};

export type CartItem = {
  product: Product;
  quantity: number;
  variant?: CartVariantSelection | null;
  unitPrice?: number;
};

type CartState = {
  items: CartItem[];
};

type CartAction =
  | { type: "ADD"; product: Product; variant?: CartVariantSelection | null; quantity?: number }
  | { type: "REMOVE"; index: number }
  | { type: "UPDATE_QTY"; index: number; quantity: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] };

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  cartTotal: number;
  addToCart: (product: Product, variant?: CartVariantSelection | null, quantity?: number) => void;
  removeFromCart: (index: number | string) => void;
  updateQuantity: (index: number | string, quantity: number) => void;
  clearCart: () => void;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "curated-finds-cart";
const CartContext = createContext<CartContextValue | null>(null);

// ─── Reducer ─────────────────────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items };

    case "ADD": {
      const vKey = action.variant?.variant_id || action.variant?.variant_sku || `${action.variant?.color || ""}-${action.variant?.size || ""}`;
      const existingIndex = state.items.findIndex((item) => {
        const itemVKey = item.variant?.variant_id || item.variant?.variant_sku || `${item.variant?.color || ""}-${item.variant?.size || ""}`;
        return item.product.id === action.product.id && itemVKey === vKey;
      });

      const effectivePrice = resolveCartItemSellingPrice(action.product, action.variant);

      if (existingIndex >= 0) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + (action.quantity || 1),
          unitPrice: effectivePrice,
        };
        return { items: updated };
      }

      return {
        items: [
          ...state.items,
          {
            product: action.product,
            quantity: action.quantity || 1,
            variant: action.variant || null,
            unitPrice: effectivePrice,
          },
        ],
      };
    }

    case "REMOVE":
      return {
        items: state.items.filter((_, idx) => idx !== action.index),
      };

    case "UPDATE_QTY": {
      if (action.quantity <= 0) {
        return {
          items: state.items.filter((_, idx) => idx !== action.index),
        };
      }
      return {
        items: state.items.map((item, idx) =>
          idx === action.index ? { ...item, quantity: action.quantity } : item
        ),
      };
    }

    case "CLEAR":
      return { items: [] };

    default:
      return state;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CartItem[];
        if (Array.isArray(parsed)) {
          dispatch({ type: "HYDRATE", items: parsed });
        }
      }
    } catch {
      // Silently ignore parse errors
    }
  }, []);

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Silently ignore write errors
    }
  }, [state.items]);

  const addToCart = useCallback(
    (product: Product, variant?: CartVariantSelection | null, quantity = 1) => {
      dispatch({ type: "ADD", product, variant, quantity });
    },
    []
  );

  const removeFromCart = useCallback((target: number | string) => {
    const index = typeof target === "number" ? target : parseInt(target, 10) || 0;
    dispatch({ type: "REMOVE", index });
  }, []);

  const updateQuantity = useCallback((target: number | string, quantity: number) => {
    const index = typeof target === "number" ? target : parseInt(target, 10) || 0;
    dispatch({ type: "UPDATE_QTY", index, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotal = state.items.reduce(
    (sum, item) => sum + (item.unitPrice ?? resolveCartItemSellingPrice(item.product, item.variant)) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        itemCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
