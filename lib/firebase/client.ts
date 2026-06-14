"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let hasLoggedFirebaseInitialization = false;
let hasLoggedAuthInitialization = false;

function validateFirebaseConfig() {
  const missingVariables = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
    [
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      firebaseConfig.messagingSenderId,
    ],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVariables.length) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(", ")}`,
    );
  }
}

function getFirebaseClientApp() {
  validateFirebaseConfig();

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  if (!hasLoggedFirebaseInitialization) {
    console.info("[firebase] Firebase initialized.", {
      projectId: app.options.projectId,
    });
    hasLoggedFirebaseInitialization = true;
  }

  return app;
}

export function getFirebaseClientAuth() {
  const auth = getAuth(getFirebaseClientApp());

  if (!hasLoggedAuthInitialization) {
    console.info("[firebase-auth] Auth initialized.");
    hasLoggedAuthInitialization = true;
  }

  return auth;
}
