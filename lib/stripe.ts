/**
 * lib/stripe.ts
 *
 * Stripe SDK client & helper functions for customer management
 * and Stripe Hosted Checkout Session creation.
 */

import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { getOrderById, updateOrderStripeSession } from "@/lib/orders";

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }
  return key;
}

/** Singleton instance of Stripe Server SDK */
export const stripe = new Stripe(getStripeSecretKey() || "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
  appInfo: {
    name: "Curated Finds Ecommerce",
    version: "1.0.0",
  },
});

/**
 * Ensures a Stripe Customer exists for a given email address.
 * Creates one in Stripe & stores the mapping in Supabase if not found.
 */
export async function getOrCreateStripeCustomer(
  email: string,
  name?: string
): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createAdminSupabaseClient();

  // 1. Check database for existing customer ID
  const { data: existing } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("customer_email", normalizedEmail)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  // 2. Create customer in Stripe
  const customer = await stripe.customers.create({
    email: normalizedEmail,
    name: name?.trim() || undefined,
    metadata: {
      source: "curated_finds_checkout",
    },
  });

  // 3. Store mapping in database
  const { error } = await supabase.from("stripe_customers").insert({
    customer_email: normalizedEmail,
    stripe_customer_id: customer.id,
  });

  if (error) {
    console.warn("[stripe] Failed to persist stripe customer mapping.", error.message);
  }

  return customer.id;
}

/**
 * Creates a Stripe Checkout Session for an existing pending order.
 */
export async function createCheckoutSession(
  orderId: string,
  origin: string
): Promise<Stripe.Checkout.Session> {
  const order = await getOrderById(orderId);

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.status !== "pending") {
    throw new Error(`Order ${orderId} is not in pending status (status: ${order.status})`);
  }

  const stripeCustomerId = await getOrCreateStripeCustomer(
    order.customer_email,
    `${order.customer_first_name} ${order.customer_last_name}`
  );

  // Build line items from order_items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    order.order_items.map((item) => ({
      price_data: {
        currency: "usd",
        unit_amount: Math.round(item.unit_price * 100), // convert dollars to cents
        product_data: {
          name: item.product_title,
          images: item.product_image ? [item.product_image] : undefined,
          metadata: {
            product_id: item.product_id,
            product_slug: item.product_slug,
          },
        },
      },
      quantity: item.quantity,
    }));

  // Add tax line item if applicable
  if (order.tax_amount > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: Math.round(order.tax_amount * 100),
        product_data: {
          name: "Estimated Sales Tax (8%)",
        },
      },
      quantity: 1,
    });
  }

  // Handle shipping as shipping option or line item
  const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [];
  if (order.shipping_cost > 0) {
    shippingOptions.push({
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: {
          amount: Math.round(order.shipping_cost * 100),
          currency: "usd",
        },
        display_name: `${order.shipping_method.toUpperCase()} SHIPPING`,
      },
    });
  } else {
    shippingOptions.push({
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: {
          amount: 0,
          currency: "usd",
        },
        display_name: "STANDARD SHIPPING (Free)",
      },
    });
  }

  // Handle discount if coupon applied
  const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  let couponIdForStripe: string | undefined;

  if (order.discount_amount > 0) {
    // Create temporary ephemeral coupon for the discount amount
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(order.discount_amount * 100),
      currency: "usd",
      duration: "once",
      name: order.coupon_code ? `Coupon (${order.coupon_code})` : "Discount",
    });
    couponIdForStripe = coupon.id;
    discounts.push({ coupon: coupon.id });
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    customer_email: undefined, // using customer parameter
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    shipping_options: shippingOptions,
    discounts: discounts.length ? discounts : undefined,
    client_reference_id: order.id,
    metadata: {
      order_id: order.id,
      customer_email: order.customer_email,
      coupon_code: order.coupon_code ?? "",
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout/cancel`,
  });

  // Save session ID to order in Supabase
  await updateOrderStripeSession(order.id, session.id);

  return session;
}
