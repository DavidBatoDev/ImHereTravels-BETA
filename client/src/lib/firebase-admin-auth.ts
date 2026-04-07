import {
  getApps,
  initializeApp,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminAuth() {
  if (getApps().length === 0) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    }
  }

  return getAuth();
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function verifyRequestUserId(
  authorizationHeader: string | null,
): Promise<string | null> {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    return null;
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
