import {
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
  serverTimestamp,
  writeBatch,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  JSFile,
  JSFolder,
  CreateFileData,
  CreateFolderData,
} from "@/types/functions";

// Firestore collection names
const COLLECTIONS = {
  FOLDERS: "js_folders",
  FILES: "js_files",
} as const;

// Convert Firestore timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Convert Firestore document to JSFolder
const convertFolderDoc = (
  doc: QueryDocumentSnapshot<DocumentData>
): JSFolder => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    isCollapsed: data.isCollapsed || false,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  };
};

// Convert Firestore document to JSFile
const convertFileDoc = (doc: QueryDocumentSnapshot<DocumentData>): JSFile => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    content: data.content,
    lastModified: convertTimestamp(data.lastModified),
    isActive: data.isActive || false,
    folderId: data.folderId,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  };
};

// Firebase Function Service
export class FirebaseFunctionService {
  // Initialize service (no-op for Firebase)
  initialize() {
    // Firebase is already initialized in lib/firebase.ts
    console.log("Firebase Function Service initialized");
  }

  // Folder CRUD Operations
  folders = {
    // Get all folders
    async getAll(): Promise<JSFolder[]> {
      try {
        const q = query(
          collection(db, COLLECTIONS.FOLDERS),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(convertFolderDoc);
      } catch (error) {
        console.error("Error fetching folders:", error);
        throw new Error("Failed to fetch folders");
      }
    },

    // Get folder by ID
    async getById(id: string): Promise<JSFolder | undefined> {
      try {
        const docRef = doc(db, COLLECTIONS.FOLDERS, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          return convertFolderDoc(
            docSnap as QueryDocumentSnapshot<DocumentData>
          );
        }
        return undefined;
      } catch (error) {
        console.error("Error fetching folder:", error);
        throw new Error("Failed to fetch folder");
      }
    },

    // Create new folder
    async create(folderData: CreateFolderData): Promise<JSFolder> {
      try {
        const folderRef = await addDoc(collection(db, COLLECTIONS.FOLDERS), {
          ...folderData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const newFolder: JSFolder = {
          id: folderRef.id,
          name: folderData.name,
          isCollapsed: folderData.isCollapsed || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return newFolder;
      } catch (error) {
        console.error("Error creating folder:", error);
        throw new Error("Failed to create folder");
      }
    },

    // Update folder
    async update(
      id: string,
      updates: Partial<CreateFolderData>
    ): Promise<JSFolder | null> {
      try {
        const folderRef = doc(db, COLLECTIONS.FOLDERS, id);
        await updateDoc(folderRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });

        // Return updated folder
        const updatedDoc = await getDoc(folderRef);
        if (updatedDoc.exists()) {
          return convertFolderDoc(
            updatedDoc as QueryDocumentSnapshot<DocumentData>
          );
        }
        return null;
      } catch (error) {
        console.error("Error updating folder:", error);
        throw new Error("Failed to update folder");
      }
    },

    // Delete folder and all its files
    async delete(id: string): Promise<boolean> {
      try {
        const batch = writeBatch(db);

        // Delete all files in the folder
        const filesQuery = query(
          collection(db, COLLECTIONS.FILES),
          where("folderId", "==", id)
        );
        const filesSnapshot = await getDocs(filesQuery);

        filesSnapshot.docs.forEach((fileDoc) => {
          batch.delete(fileDoc.ref);
        });

        // Delete the folder
        const folderRef = doc(db, COLLECTIONS.FOLDERS, id);
        batch.delete(folderRef);

        // Commit the batch
        await batch.commit();
        return true;
      } catch (error) {
        console.error("Error deleting folder:", error);
        throw new Error("Failed to delete folder");
      }
    },

    // Toggle folder collapse state
    async toggleCollapse(id: string): Promise<JSFolder | null> {
      try {
        const folderRef = doc(db, COLLECTIONS.FOLDERS, id);
        const folderDoc = await getDoc(folderRef);

        if (!folderDoc.exists()) return null;

        const currentData = folderDoc.data();
        const newCollapsedState = !currentData.isCollapsed;

        await updateDoc(folderRef, {
          isCollapsed: newCollapsedState,
          updatedAt: serverTimestamp(),
        });

        // Return updated folder
        const updatedDoc = await getDoc(folderRef);
        if (updatedDoc.exists()) {
          return convertFolderDoc(
            updatedDoc as QueryDocumentSnapshot<DocumentData>
          );
        }
        return null;
      } catch (error) {
        console.error("Error toggling folder collapse:", error);
        throw new Error("Failed to toggle folder collapse");
      }
    },
  };

  // File CRUD Operations
  files = {
    // Get all files
    async getAll(): Promise<JSFile[]> {
      try {
        const q = query(
          collection(db, COLLECTIONS.FILES),
          orderBy("lastModified", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(convertFileDoc);
      } catch (error) {
        console.error("Error fetching files:", error);
        throw new Error("Failed to fetch files");
      }
    },

    // Get file by ID
    async getById(id: string): Promise<JSFile | undefined> {
      try {
        const docRef = doc(db, COLLECTIONS.FILES, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          return convertFileDoc(docSnap as QueryDocumentSnapshot<DocumentData>);
        }
        return undefined;
      } catch (error) {
        console.error("Error fetching file:", error);
        throw new Error("Failed to fetch file");
      }
    },

    // Get files by folder ID
    async getByFolderId(folderId: string): Promise<JSFile[]> {
      try {
        const q = query(
          collection(db, COLLECTIONS.FILES),
          where("folderId", "==", folderId),
          orderBy("lastModified", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(convertFileDoc);
      } catch (error) {
        console.error("Error fetching files by folder:", error);
        throw new Error("Failed to fetch files by folder");
      }
    },

    // Create new file
    async create(fileData: CreateFileData): Promise<JSFile> {
      try {
        const fileRef = await addDoc(collection(db, COLLECTIONS.FILES), {
          ...fileData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastModified: serverTimestamp(),
        });

        const newFile: JSFile = {
          id: fileRef.id,
          name: fileData.name,
          content: fileData.content,
          lastModified: new Date(),
          isActive: fileData.isActive || false,
          folderId: fileData.folderId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return newFile;
      } catch (error) {
        console.error("Error creating file:", error);
        throw new Error("Failed to create file");
      }
    },

    // Update file
    async update(
      id: string,
      updates: Partial<Omit<JSFile, "id" | "createdAt">>
    ): Promise<JSFile | null> {
      try {
        const fileRef = doc(db, COLLECTIONS.FILES, id);
        await updateDoc(fileRef, {
          ...updates,
          updatedAt: serverTimestamp(),
          lastModified: serverTimestamp(),
        });

        // Return updated file
        const updatedDoc = await getDoc(fileRef);
        if (updatedDoc.exists()) {
          return convertFileDoc(
            updatedDoc as QueryDocumentSnapshot<DocumentData>
          );
        }
        return null;
      } catch (error) {
        console.error("Error updating file:", error);
        throw new Error("Failed to update file");
      }
    },

    // Update file content
    async updateContent(id: string, content: string): Promise<JSFile | null> {
      try {
        const fileRef = doc(db, COLLECTIONS.FILES, id);
        await updateDoc(fileRef, {
          content,
          updatedAt: serverTimestamp(),
          lastModified: serverTimestamp(),
        });

        // Return updated file
        const updatedDoc = await getDoc(fileRef);
        if (updatedDoc.exists()) {
          return convertFileDoc(
            updatedDoc as QueryDocumentSnapshot<DocumentData>
          );
        }
        return null;
      } catch (error) {
        console.error("Error updating file content:", error);
        throw new Error("Failed to update file content");
      }
    },

    // Delete file
    async delete(id: string): Promise<boolean> {
      try {
        const fileRef = doc(db, COLLECTIONS.FILES, id);
        await deleteDoc(fileRef);
        return true;
      } catch (error) {
        console.error("Error deleting file:", error);
        throw new Error("Failed to delete file");
      }
    },

    // Set file as active (update all files to set only one as active)
    async setActive(id: string): Promise<void> {
      try {
        const batch = writeBatch(db);

        // Get the file to activate
        const activeFileRef = doc(db, COLLECTIONS.FILES, id);
        const activeFileDoc = await getDoc(activeFileRef);

        if (!activeFileDoc.exists()) {
          throw new Error("File not found");
        }

        // Get all files in the same folder
        const folderId = activeFileDoc.data().folderId;
        const filesQuery = query(
          collection(db, COLLECTIONS.FILES),
          where("folderId", "==", folderId)
        );
        const filesSnapshot = await getDocs(filesQuery);

        // Set all files in the folder as inactive
        filesSnapshot.docs.forEach((fileDoc) => {
          batch.update(fileDoc.ref, { isActive: false });
        });

        // Set the target file as active
        batch.update(activeFileRef, { isActive: true });

        // Commit the batch
        await batch.commit();
      } catch (error) {
        console.error("Error setting file as active:", error);
        throw new Error("Failed to set file as active");
      }
    },

    // Search files by name
    async search(searchQuery: string): Promise<JSFile[]> {
      try {
        // Note: Firestore doesn't support full-text search natively
        // This is a simple prefix search implementation
        // For production, consider using Algolia or similar service
        const q = query(
          collection(db, COLLECTIONS.FILES),
          orderBy("name"),
          orderBy("lastModified", "desc")
        );
        const querySnapshot = await getDocs(q);

        const files = querySnapshot.docs.map(convertFileDoc);
        const lowercaseQuery = searchQuery.toLowerCase();

        return files.filter((file) =>
          file.name.toLowerCase().includes(lowercaseQuery)
        );
      } catch (error) {
        console.error("Error searching files:", error);
        throw new Error("Failed to search files");
      }
    },
  };

  // Real-time listeners for live updates
  subscribeToFolders(callback: (folders: JSFolder[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.FOLDERS),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (querySnapshot) => {
      const folders = querySnapshot.docs.map(convertFolderDoc);
      callback(folders);
    });
  }

  subscribeToFiles(callback: (files: JSFile[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.FILES),
      orderBy("lastModified", "desc")
    );

    return onSnapshot(q, (querySnapshot) => {
      const files = querySnapshot.docs.map(convertFileDoc);
      callback(files);
    });
  }

  subscribeToFilesByFolder(
    folderId: string,
    callback: (files: JSFile[]) => void
  ) {
    const q = query(
      collection(db, COLLECTIONS.FILES),
      where("folderId", "==", folderId),
      orderBy("lastModified", "desc")
    );

    return onSnapshot(q, (querySnapshot) => {
      const files = querySnapshot.docs.map(convertFileDoc);
      callback(files);
    });
  }
}

// Export singleton instance
export const firebaseFunctionService = new FirebaseFunctionService();

// Export default for backward compatibility
export default firebaseFunctionService;
