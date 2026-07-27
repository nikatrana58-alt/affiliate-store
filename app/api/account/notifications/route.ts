/**
 * POST /api/account/notifications
 *
 * Handles marking notifications as read, marking all as read, or deleting notifications.
 */

import { type NextRequest } from "next/server";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getCustomerNotifications,
} from "@/lib/account";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      notificationId?: string;
      action?: "read" | "read_all" | "delete";
    };

    if (!body.email || !body.action) {
      return Response.json(
        { error: "email and action are required." },
        { status: 400 }
      );
    }

    const email = body.email.toLowerCase().trim();

    if (body.action === "read_all") {
      await markAllNotificationsAsRead(email);
    } else if (body.action === "read" && body.notificationId) {
      await markNotificationAsRead(body.notificationId, email);
    } else if (body.action === "delete" && body.notificationId) {
      await deleteNotification(body.notificationId, email);
    }

    const notifications = await getCustomerNotifications(email);
    return Response.json({ success: true, notifications });
  } catch (error) {
    console.error("[api/account/notifications] Notification update failed:", error);
    return Response.json(
      { error: "Failed to update notification." },
      { status: 500 }
    );
  }
}
