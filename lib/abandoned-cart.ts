import type { CartItem } from "@/lib/cart";

export interface AbandonedCartPayload {
  cartId: string;
  customerEmail: string;
  items: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
    image?: string | null;
  }>;
  cartTotal: number;
  abandonedAt: string;
  recoveryUrl: string;
  status: "pending" | "sent" | "recovered";
}

export interface WishlistNotificationPayload {
  customerEmail: string;
  productId: string;
  productTitle: string;
  priceDrop?: number;
  inStockAlert?: boolean;
}

export interface RestockNotificationPayload {
  customerEmail: string;
  productId: string;
  variantId?: string;
  productTitle: string;
  requestedAt: string;
}

/**
 * Prepares an abandoned cart recovery payload architecture.
 * (Sending logic is deliberately omitted per CRO production guidelines).
 */
export function prepareAbandonedCartPayload(
  email: string,
  cartItems: CartItem[],
  total: number
): AbandonedCartPayload {
  return {
    cartId: `cart_${Date.now()}`,
    customerEmail: email,
    items: cartItems.map((item) => ({
      id: item.product.id,
      title: item.product.title,
      price: item.unitPrice ?? item.product.price ?? 0,
      quantity: item.quantity,
      image: item.product.image,
    })),
    cartTotal: total,
    abandonedAt: new Date().toISOString(),
    recoveryUrl: `https://ra2z.shop/checkout?recovery_id=cart_${Date.now()}`,
    status: "pending",
  };
}
