import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function requireEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getFirebaseAdminApp() {
  const existingApp = getApps()[0];

  if (existingApp) return existingApp;

  console.info("[firebase-admin] FIREBASE_ADMIN_PROJECT_ID", {
    value: process.env.FIREBASE_ADMIN_PROJECT_ID,
  });
  console.info("[firebase-admin] FIREBASE_ADMIN_CLIENT_EMAIL", {
    value: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  });
  console.info("[firebase-admin] private key starts with header", {
    value: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.startsWith(
      "-----BEGIN PRIVATE KEY-----",
    ),
  });
  console.info("[firebase-admin] private key includes newline", {
    value: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes("\n"),
  });

  return initializeApp({
    credential: cert({
      projectId: requireEnvironmentVariable("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: requireEnvironmentVariable("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n",
      ),
    }),
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
