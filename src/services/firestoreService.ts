import {
  doc,
  setDoc,
  onSnapshot,
  getDocFromServer,
  disableNetwork,
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { BriefingData } from "../types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let isNetworkDisabled = false;

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errMessage = error instanceof Error ? error.message : String(error);

  if (errMessage.includes("resource-exhausted") && !isNetworkDisabled) {
    console.warn(
      "Firestore quota exceeded. Disabling network to prevent retry loops...",
    );
    isNetworkDisabled = true;
    disableNetwork(db).catch((e) =>
      console.error("Failed to disable network:", e),
    );
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sanitizes an email into a Firestore-safe document ID matching ^[a-zA-Z0-9_\-\.]+$
 */
export function sanitizeEmailForId(email: string): string {
  if (!email) return "guciminang88_gmail_com";
  return email.toLowerCase().replace(/[^a-z0-9_\-\.]/g, "_");
}

/**
 * Tests connection on boot according to the critical Firebase safety guidelines.
 */
export async function testFirestoreConnection(): Promise<void> {
  if (isNetworkDisabled) return;
  const path = "briefings/guciminang88_gmail_com";
  try {
    const docRef = doc(db, "briefings", "guciminang88_gmail_com");
    await getDocFromServer(docRef);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.warn(
        "Please check your Firebase configuration or internet connection.",
      );
    }
    // We do not fail-throw on initial offline connection test to allow offline mode
  }
}

/**
 * Saves briefing list to the centralized Firestore document
 */
export async function saveBriefingToFirestore(
  email: string,
  hotelName: string,
  portalName: string,
  data: BriefingData,
  logo?: string | null,
  userProfiles?: any[] | null,
  historyLogs?: any[] | null,
  footerText?: string | null,
): Promise<void> {
  if (isNetworkDisabled) {
    throw new Error(
      "resource-exhausted: Limit harian database cloud telah habis. Silakan gunakan aplikasi secara lokal.",
    );
  }

  const docId = sanitizeEmailForId(email);
  const path = `briefings/${docId}`;

  try {
    const docRef = doc(db, "briefings", docId);
    await setDoc(docRef, {
      hotelName,
      portalName,
      logo: logo || null,
      data,
      userProfiles: userProfiles || null,
      historyLogs: historyLogs || null,
      footerText: footerText || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Standard server-pull for initialization or offline fallback
 */
export async function loadBriefingFromFirestore(
  email: string,
): Promise<{
  hotelName: string;
  portalName: string;
  logo: string | null;
  data: BriefingData;
  userProfiles?: any[] | null;
  historyLogs?: any[] | null;
  footerText?: string | null;
} | null> {
  if (isNetworkDisabled) return null;

  const docId = sanitizeEmailForId(email);
  const path = `briefings/${docId}`;

  try {
    const docRef = doc(db, "briefings", docId);
    const snap = await getDocFromServer(docRef);
    if (snap.exists()) {
      const dataDoc = snap.data();
      return {
        hotelName: dataDoc.hotelName || "Harper Premier Nagoya Batam",
        portalName: dataDoc.portalName || "morning briefing list",
        logo: dataDoc.logo || null,
        data: dataDoc.data as BriefingData,
        userProfiles: dataDoc.userProfiles || null,
        historyLogs: dataDoc.historyLogs || null,
        footerText: dataDoc.footerText || null,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Subscribes to real-time additions, updates, or modifications for the specified briefing list.
 */
export function subscribeToBriefing(
  email: string,
  onUpdate: (payload: {
    hotelName: string;
    portalName: string;
    logo: string | null;
    data: BriefingData;
    userProfiles?: any[] | null;
    historyLogs?: any[] | null;
    footerText?: string | null;
  }) => void,
  onError: (error: any) => void,
) {
  if (isNetworkDisabled) {
    // Return a dummy unsubscribe function if network is disabled
    return () => {};
  }

  const docId = sanitizeEmailForId(email);
  const path = `briefings/${docId}`;

  const docRef = doc(db, "briefings", docId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const dataDoc = snapshot.data();
        onUpdate({
          hotelName: dataDoc.hotelName || "Harper Premier Nagoya Batam",
          portalName: dataDoc.portalName || "morning briefing list",
          logo: dataDoc.logo || null,
          data: dataDoc.data as BriefingData,
          userProfiles: dataDoc.userProfiles || null,
          historyLogs: dataDoc.historyLogs || null,
          footerText: dataDoc.footerText || null,
        });
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrappedErr) {
        onError(wrappedErr);
      }
    },
  );
}
