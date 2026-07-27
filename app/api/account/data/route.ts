/**
 * GET /api/account/data
 *
 * Consolidates customer dashboard data for a given email address:
 * orders, wishlist, addresses, notifications, settings, and account stats.
 */

import { type NextRequest } from "next/server";
import { getOrdersByEmail } from "@/lib/orders";
import {
  getCustomerAddresses,
  getCustomerWishlist,
  getCustomerNotifications,
  getCustomerSettings,
} from "@/lib/account";
import { getProducts } from "@/lib/products";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase().trim();

    if (!email) {
      return Response.json({ error: "Email address is required." }, { status: 400 });
    }

    const [orders, wishlist, addresses, notifications, settings, allProducts] = await Promise.all([
      getOrdersByEmail(email),
      getCustomerWishlist(email),
      getCustomerAddresses(email),
      getCustomerNotifications(email),
      getCustomerSettings(email),
      getProducts(),
    ]);

    const activeShipments = orders.filter((o) => ["processing", "shipped"].includes(o.status));
    const recentOrders = orders.slice(0, 5);
    const recommendedProducts = allProducts.slice(0, 4);

    const stats = {
      totalOrders: orders.length,
      activeShipmentsCount: activeShipments.length,
      savedAddressesCount: addresses.length,
      wishlistCount: wishlist.length,
      unreadNotificationsCount: notifications.filter((n) => !n.is_read).length,
    };

    return Response.json({
      orders,
      recentOrders,
      activeShipments,
      wishlist,
      addresses,
      notifications,
      settings,
      recommendedProducts,
      stats,
    });
  } catch (error) {
    console.error("[api/account/data] Failed to load account data:", error);
    return Response.json(
      { error: "Unable to load customer account data." },
      { status: 500 }
    );
  }
}
