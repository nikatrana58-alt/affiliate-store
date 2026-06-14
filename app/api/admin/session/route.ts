import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_MS,
  verifyAllowedAdminIdToken,
} from "@/lib/auth/admin";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { idToken?: string };

    if (!body.idToken) {
      return Response.json({ error: "Firebase ID token is required." }, { status: 400 });
    }

    const admin = await verifyAllowedAdminIdToken(body.idToken);
    const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(
      body.idToken,
      { expiresIn: ADMIN_SESSION_DURATION_MS },
    );
    const cookieStore = await cookies();

    cookieStore.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      maxAge: ADMIN_SESSION_DURATION_MS / 1000,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    console.info("[admin-auth] Admin session created.", {
      uid: admin.uid,
      email: admin.email,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[admin-auth] Unable to create admin session.", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_SESSION_COOKIE);
  console.info("[admin-auth] Admin session cleared.");

  return Response.json({ ok: true });
}
