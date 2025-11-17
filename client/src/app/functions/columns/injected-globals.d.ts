/**
 * Type declarations for runtime-injected globals
 *
 * These utilities are injected by the function-execution-service at runtime
 * when column functions are executed. They don't need to be imported.
 */

import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import type { Functions } from "firebase/functions";

declare global {
  // Firebase instances
  const auth: Auth;
  const db: Firestore;
  const storage: FirebaseStorage;
  const functions: Functions;

  // Firebase utilities object
  const firebaseUtils: {
    ensureAuthenticated: () => Promise<any>;
    getCurrentUser: () => any;
    isAuthenticated: () => boolean;
    getUserId: () => string | undefined;
    reAuthenticate: () => Promise<void>;
    createDocRef: (collectionName: string, docId?: string) => any;
    createCollectionRef: (collectionName: string) => any;
    createStorageRef: (path: string) => any;
    getDocumentData: (collectionName: string, docId: string) => Promise<any>;
    getCollectionData: (
      collectionName: string,
      constraints?: any[]
    ) => Promise<any[]>;
    addDocument: (collectionName: string, data: any) => Promise<string>;
    updateDocument: (
      collectionName: string,
      docId: string,
      data: any
    ) => Promise<string>;
    deleteDocument: (collectionName: string, docId: string) => Promise<boolean>;
  };

  // Functions utilities object
  const functionsUtils: {
    callFunction: (functionName: string, data?: any) => Promise<any>;
    getFunctionConfig: (functionName: string) => any;
    listFunctions: () => Promise<string[]>;
    emailUtils: {
      generateReservationEmail: (
        bookingId: string,
        generateDraftCell?: boolean
      ) => Promise<any>;
      sendReservationEmail: (draftId: string) => Promise<any>;
    };
    templateUtils: {
      processTemplate: (
        template: string,
        variables: Record<string, any>
      ) => string;
      getTemplate: (templateId: string) => Promise<any>;
    };
    utils: {
      formatCurrency: (value: number | string, currency?: string) => string;
      formatDate: (date: any) => string;
      generateId: () => string;
      sleep: (ms: number) => Promise<void>;
    };
  };

  // Firestore functions
  const collection: typeof import("firebase/firestore").collection;
  const doc: typeof import("firebase/firestore").doc;
  const getDocs: typeof import("firebase/firestore").getDocs;
  const getDoc: typeof import("firebase/firestore").getDoc;
  const addDoc: typeof import("firebase/firestore").addDoc;
  const updateDoc: typeof import("firebase/firestore").updateDoc;
  const deleteDoc: typeof import("firebase/firestore").deleteDoc;
  const query: typeof import("firebase/firestore").query;
  const where: typeof import("firebase/firestore").where;
  const orderBy: typeof import("firebase/firestore").orderBy;
  const limit: typeof import("firebase/firestore").limit;
  const serverTimestamp: typeof import("firebase/firestore").serverTimestamp;
  const Timestamp: typeof import("firebase/firestore").Timestamp;

  // Firebase Functions
  const httpsCallable: typeof import("firebase/functions").httpsCallable;
}

export {};
