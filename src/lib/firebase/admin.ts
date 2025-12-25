import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // Try multiple environment variable names
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  // Debug logging
  console.log("Firebase Admin Init - checking env vars:", {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKeyRaw,
    privateKeyLength: privateKeyRaw?.length,
    privateKeyStart: privateKeyRaw?.substring(0, 30),
  });

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      `Firebase Admin environment variables are not set. ` +
      `ProjectId: ${!!projectId}, ClientEmail: ${!!clientEmail}, PrivateKey: ${!!privateKeyRaw}`
    );
  }

  // Handle the private key - remove surrounding quotes if present
  if (privateKeyRaw.startsWith('"') && privateKeyRaw.endsWith('"')) {
    privateKeyRaw = privateKeyRaw.slice(1, -1);
  }
  
  // Replace escaped newlines with actual newlines
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  console.log("Firebase Admin initialized successfully");
  return adminApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
