/**
 * POST /api/account/wishlist
 *
 * Adds or removes a product from customer's wishlist.
 */

import { type NextRequest } from "next/server";
import { addToWishlist, removeFromWishlist, getCustomerWishlist } from "@/lib/account";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      productId?: string;
      action?: "add" | "remove";
    };

    if (!body.email || !body.productId || !body.action) {
      return Response.json(
        { error: "email, productId, and action are required." },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase().trim();

    if (body.action === "add") {
      await addToWishlist(email, body.productId);
    } else {
      await removeFromWishlist(email, body.productId);
    }

    const wishlist = await getCustomerWishlist(email);
    return Response.json({ success: true, wishlist });
  } catch (error) {
    console.error("[api/account/wishlist] Wishlist update failed:", error);
    return Response.json(
      { error: "Failed to update wishlist." },
      { status: 500 }
    );
  }
}
