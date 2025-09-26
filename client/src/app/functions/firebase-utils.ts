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
