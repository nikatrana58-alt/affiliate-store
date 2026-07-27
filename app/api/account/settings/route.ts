/**
 * POST /api/account/settings
 *
 * Updates customer communication preferences, 2FA, and security settings.
 */

import { type NextRequest } from "next/server";
import { updateCustomerSettings, getCustomerSettings } from "@/lib/account";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      settings?: Record<string, unknown>;
    };

    if (!body.email || !body.settings) {
      return Response.json(
        { error: "email and settings are required." },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase().trim();
    await updateCustomerSettings(email, body.settings);
    const updatedSettings = await getCustomerSettings(email);

    return Response.json({ success: true, settings: updatedSettings });
  } catch (error) {
    console.error("[api/account/settings] Settings update failed:", error);
    return Response.json(
      { error: "Failed to update customer settings." },
      { status: 500 }
    );
  }
}
