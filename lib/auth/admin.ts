import type { DecodedIdToken } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export const ADMIN_SESSION_COOKIE = "affiliate_store_admin_session";
export const ADMIN_SESSION_DURATION_MS = 60 * 60 * 24 * 5 * 1000;

function isAllowedAdmin(user: DecodedIdToken) {
  const allowedUid = process.env.ADMIN_FIREBASE_UID?.trim();
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!allowedUid && !allowedEmail) {
    throw new Error(
      "Set ADMIN_FIREBASE_UID or ADMIN_EMAIL to restrict admin access.",
    );
  }

  return (
    (allowedUid && user.uid === allowedUid) ||
    (allowedEmail && user.email?.toLowerCase() === allowedEmail)
  );
}

export async function verifyAllowedAdminIdToken(idToken: string) {
  const user = await getFirebaseAdminAuth().verifyIdToken(idToken);

  if (!isAllowedAdmin(user)) {
    throw new Error("This Firebase account is not allowed to access admin.");
  }

  return user;
}

export async function verifyAllowedAdminSession(sessionCookie: string) {
  const user = await getFirebaseAdminAuth().verifySessionCookie(
    sessionCookie,
    true,
  );

  if (!isAllowedAdmin(user)) {
    throw new Error("This Firebase account is not allowed to access admin.");
  }

  return user;
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionCookie) return null;

  try {
    return await verifyAllowedAdminSession(sessionCookie);
  } catch (error) {
    console.warn("[admin-auth] Invalid admin session.", error);
    return null;
  }
}

export async function requireCurrentAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error("Unauthorized");
  }

  return admin;
}
