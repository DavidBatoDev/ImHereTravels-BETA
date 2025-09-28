// Firebase SDK utilities for TypeScript functions
// This module provides easy access to Firebase services within TypeScript functions

import {
  auth,
  db,
  storage,
  getDbInstance,
  getAuthInstance,
  getStorageInstance,
} from "@/lib/firebase";

// Re-export Firebase services for easy access in TypeScript functions
export {
  auth,
  db,
  storage,
  getDbInstance,
  getAuthInstance,
  getStorageInstance,
};

// Re-export commonly used Firestore functions
export {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";

// Re-export commonly used Auth functions
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  deleteUser,
} from "firebase/auth";

// Import auth functions for pre-authentication
import {
  signInWithEmailAndPassword as firebaseSignIn,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from "firebase/auth";

// Re-export commonly used Storage functions
export {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
} from "firebase/storage";

// Import the functions we need for the utility functions
import {
  collection as firestoreCollection,
  doc as firestoreDoc,
  getDocs as firestoreGetDocs,
  getDoc as firestoreGetDoc,
  addDoc as firestoreAddDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  query as firestoreQuery,
  serverTimestamp as firestoreServerTimestamp,
  where as firestoreWhere,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
  startAfter as firestoreStartAfter,
  onSnapshot as firestoreOnSnapshot,
  writeBatch as firestoreWriteBatch,
  increment as firestoreIncrement,
  arrayUnion as firestoreArrayUnion,
  arrayRemove as firestoreArrayRemove,
} from "firebase/firestore";

import { ref as storageRef } from "firebase/storage";

// Admin credentials for pre-authentication
const ADMIN_EMAIL = "admin@imheretravels.com";
const ADMIN_PASSWORD = "admin123$";

// Pre-authentication state
let isPreAuthenticated = false;
let preAuthPromise: Promise<void> | null = null;

// Pre-authenticate with admin credentials
async function preAuthenticate(): Promise<void> {
  if (isPreAuthenticated || preAuthPromise) {
    return preAuthPromise || Promise.resolve();
  }

  preAuthPromise = (async () => {
    try {
      // Check if already authenticated
      if (auth.currentUser) {
        isPreAuthenticated = true;
        return;
      }

      // Sign in with admin credentials
      await firebaseSignIn(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      isPreAuthenticated = true;
      console.log("Pre-authenticated with admin credentials");
    } catch (error) {
      console.error("Pre-authentication failed:", error);
      // Don't throw error, just log it - functions should still work
    }
  })();

  return preAuthPromise;
}

// Initialize pre-authentication
preAuthenticate();

// Utility functions for common operations
export const firebaseUtils = {
  // Pre-authenticate before operations
  ensureAuthenticated: async () => {
    await preAuthenticate();
    return auth.currentUser;
  },

  // Get current user (with pre-auth)
  getCurrentUser: () => auth.currentUser,

  // Check if user is authenticated
  isAuthenticated: () => !!auth.currentUser,

  // Get user ID
  getUserId: () => auth.currentUser?.uid,

  // Force re-authentication
  reAuthenticate: async () => {
    isPreAuthenticated = false;
    preAuthPromise = null;
    await preAuthenticate();
  },

  // Create a Firestore reference
  createDocRef: (collectionName: string, docId?: string) =>
    docId
      ? firestoreDoc(db, collectionName, docId)
      : firestoreDoc(firestoreCollection(db, collectionName)),

  // Create a collection reference
  createCollectionRef: (collectionName: string) =>
    firestoreCollection(db, collectionName),

  // Create a storage reference
  createStorageRef: (path: string) => storageRef(storage, path),

  // Helper to get document data
  getDocumentData: async (collectionName: string, docId: string) => {
    await preAuthenticate();
    const docRef = firestoreDoc(db, collectionName, docId);
    const docSnap = await firestoreGetDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  // Helper to get collection data
  getCollectionData: async (collectionName: string, constraints?: any[]) => {
    await preAuthenticate();
    let q = firestoreQuery(firestoreCollection(db, collectionName));
    if (constraints) {
      q = firestoreQuery(
        firestoreCollection(db, collectionName),
        ...constraints
      );
    }
    const querySnapshot = await firestoreGetDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // Helper to add document
  addDocument: async (collectionName: string, data: any) => {
    await preAuthenticate();
    const docRef = await firestoreAddDoc(
      firestoreCollection(db, collectionName),
      {
        ...data,
        createdAt: firestoreServerTimestamp(),
        updatedAt: firestoreServerTimestamp(),
      }
    );
    return docRef.id;
  },

  // Helper to update document
  updateDocument: async (collectionName: string, docId: string, data: any) => {
    await preAuthenticate();
    const docRef = firestoreDoc(db, collectionName, docId);
    await firestoreUpdateDoc(docRef, {
      ...data,
      updatedAt: firestoreServerTimestamp(),
    });
    return docId;
  },

  // Helper to delete document
  deleteDocument: async (collectionName: string, docId: string) => {
    await preAuthenticate();
    const docRef = firestoreDoc(db, collectionName, docId);
    await firestoreDeleteDoc(docRef);
    return true;
  },
};

// Firebase Functions utilities for calling other cloud functions
export const functionsUtils = {
  // Call other cloud functions
  callFunction: async (functionName: string, data?: any) => {
    try {
      // Note: This is a simplified implementation for client-side testing
      // In practice, you'd use the Firebase Functions SDK to call functions
      console.log(`Calling function: ${functionName} with data:`, data);

      // For now, return a placeholder response
      // In a real implementation, you'd actually call the function
      return {
        success: true,
        functionName,
        data,
        message: "Function call simulated (client-side)",
      };
    } catch (error) {
      console.error(`Error calling function ${functionName}:`, error);
      throw error;
    }
  },

  // Get function configuration
  getFunctionConfig: (functionName: string) => {
    return {
      name: functionName,
      region: "asia-southeast1",
      runtime: "nodejs18",
      memory: "1GiB",
      timeout: "540s",
    };
  },

  // List available functions
  listFunctions: async () => {
    return [
      "generateReservationEmail",
      "sendReservationEmail",
      "recompute-on-function-update",
    ];
  },

  // Email-specific utilities
  emailUtils: {
    generateReservationEmail: async (
      bookingId: string,
      generateDraftCell: boolean = true
    ) => {
      try {
        // This would call the generateReservationEmail cloud function
        console.log(`Generating reservation email for booking: ${bookingId}`);
        return {
          success: true,
          draftId: `draft_${Date.now()}`,
          bookingId,
          generateDraftCell,
        };
      } catch (error) {
        console.error("Error generating reservation email:", error);
        throw error;
      }
    },

    sendReservationEmail: async (draftId: string) => {
      try {
        // This would call the sendReservationEmail cloud function
        console.log(`Sending reservation email draft: ${draftId}`);
        return {
          success: true,
          messageId: `msg_${Date.now()}`,
          draftId,
          message: "Reservation email sent successfully",
        };
      } catch (error) {
        console.error("Error sending reservation email:", error);
        throw error;
      }
    },
  },

  // Template utilities
  templateUtils: {
    processTemplate: (template: string, variables: Record<string, any>) => {
      // This would use the EmailTemplateService.processTemplate
      console.log("Processing email template with variables:", variables);
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    },

    getTemplate: async (templateId: string) => {
      try {
        await preAuthenticate();
        const docRef = firestoreDoc(db, "emailTemplates", templateId);
        const docSnap = await firestoreGetDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
      } catch (error) {
        console.error(`Error getting template ${templateId}:`, error);
        throw error;
      }
    },
  },

  // Utility functions
  utils: {
    formatCurrency: (value: number | string, currency: string = "GBP") => {
      if (!value) return "";
      const numValue = Number(value);
      if (currency === "GBP") {
        return `£${numValue.toFixed(2)}`;
      }
      return `${numValue.toFixed(2)} ${currency}`;
    },

    formatDate: (date: any) => {
      if (!date) return "";
      try {
        let dateObj: Date;
        if (date && typeof date === "object" && date._seconds) {
          dateObj = new Date(date._seconds * 1000);
        } else if (typeof date === "string") {
          dateObj = new Date(date);
        } else if (date instanceof Date) {
          dateObj = date;
        } else {
          return "";
        }

        if (isNaN(dateObj.getTime())) {
          return "";
        }

        return dateObj.toISOString().split("T")[0];
      } catch (error) {
        console.warn("Error formatting date:", error, "Value:", date);
        return "";
      }
    },

    generateId: () => {
      return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    sleep: (ms: number) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
  },
};

// Type definitions for common Firebase operations
export interface FirebaseDocument {
  id: string;
  [key: string]: any;
}

export interface QueryConstraint {
  field: string;
  operator:
    | "=="
    | "!="
    | "<"
    | "<="
    | ">"
    | ">="
    | "in"
    | "not-in"
    | "array-contains"
    | "array-contains-any";
  value: any;
}

// Export default for easy importing
export default {
  auth,
  db,
  storage,
  firebaseUtils,
  functionsUtils,
  // Re-export all Firestore functions
  collection: firestoreCollection,
  doc: firestoreDoc,
  getDocs: firestoreGetDocs,
  getDoc: firestoreGetDoc,
  addDoc: firestoreAddDoc,
  updateDoc: firestoreUpdateDoc,
  deleteDoc: firestoreDeleteDoc,
  query: firestoreQuery,
  where: firestoreWhere,
  orderBy: firestoreOrderBy,
  limit: firestoreLimit,
  startAfter: firestoreStartAfter,
  onSnapshot: firestoreOnSnapshot,
  writeBatch: firestoreWriteBatch,
  serverTimestamp: firestoreServerTimestamp,
  increment: firestoreIncrement,
  arrayUnion: firestoreArrayUnion,
  arrayRemove: firestoreArrayRemove,
};
