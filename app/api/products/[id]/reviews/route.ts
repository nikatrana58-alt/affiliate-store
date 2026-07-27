/**
 * GET /api/products/[id]/reviews - List approved reviews for a product
 * POST /api/products/[id]/reviews - Submit product review
 */

import { type NextRequest } from "next/server";
import { getProductReviews, submitProductReview } from "@/lib/growth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) return Response.json({ error: "Product ID required." }, { status: 400 });

    const reviews = await getProductReviews(id);
    return Response.json({ reviews });
  } catch (error) {
    console.error("[api/products/reviews] GET failed:", error);
    return Response.json({ error: "Failed to load reviews." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      customer_email?: string;
      customer_name?: string;
      rating?: number;
      title?: string;
      comment?: string;
    };

    if (!id || !body.customer_email || !body.rating || !body.comment) {
      return Response.json({ error: "Missing required review fields." }, { status: 400 });
    }

    const review = await submitProductReview(id, {
      customer_email: body.customer_email,
      customer_name: body.customer_name || body.customer_email.split("@")[0],
      rating: body.rating,
      title: body.title || "Customer Review",
      comment: body.comment,
    });

    return Response.json({ success: true, review });
  } catch (error) {
    console.error("[api/products/reviews] POST failed:", error);
    return Response.json({ error: "Failed to submit review." }, { status: 500 });
  }
}
