/**
 * POST /api/account/addresses - Save or update address
 * DELETE /api/account/addresses - Delete address
 */

import { type NextRequest } from "next/server";
import {
  saveCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
} from "@/lib/account";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      address?: Record<string, unknown>;
    };

    if (!body.email || !body.address) {
      return Response.json(
        { error: "email and address are required." },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase().trim();
    await saveCustomerAddress(email, body.address);
    const addresses = await getCustomerAddresses(email);

    return Response.json({ success: true, addresses });
  } catch (error) {
    console.error("[api/account/addresses] Address save failed:", error);
    return Response.json(
      { error: "Failed to save address." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase().trim();
    const id = searchParams.get("id");

    if (!email || !id) {
      return Response.json(
        { error: "email and address id are required." },
        { status: 400 }
      );
    }

    await deleteCustomerAddress(id, email);
    const addresses = await getCustomerAddresses(email);

    return Response.json({ success: true, addresses });
  } catch (error) {
    console.error("[api/account/addresses] Address delete failed:", error);
    return Response.json(
      { error: "Failed to delete address." },
      { status: 500 }
    );
  }
}
