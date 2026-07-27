/**
 * POST /api/orders
 *
 * Public endpoint — creates an order from checkout form data.
 * No authentication required (customers are anonymous).
 * All business logic and total calculations happen server-side.
 */

import { type NextRequest } from "next/server";
import { createOrder } from "@/lib/orders";
import type { CreateOrderInput } from "@/lib/orders";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderInput;

    const result = await createOrder(body);

    if (!result.success) {
      // Validation errors
      if ("errors" in result) {
        return Response.json(
          { error: "Validation failed", errors: result.errors },
          { status: 400 }
        );
      }
      // Operational error
      if ("error" in result) {
        return Response.json(
          { error: result.error },
          { status: 422 }
        );
      }
    }

    if (result.success) {
      return Response.json(
        { order: result.order },
        { status: 201 }
      );
    }

    return Response.json({ error: "Unexpected error." }, { status: 500 });
  } catch (error) {
    console.error("[api/orders] Unhandled error.", error);
    return Response.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
