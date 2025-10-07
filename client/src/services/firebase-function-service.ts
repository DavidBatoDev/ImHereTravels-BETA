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
  TSFile,
  TSFolder,
  TSArgument,
  CreateFileData,
  CreateFolderData,
  FileAnalysisResult,
} from "@/types/functions";
import { astParser } from "./ast-parser";

// Firestore collection names
const COLLECTIONS = {
  FOLDERS: "ts_folders", // Updated to reflect TypeScript focus
  FILES: "ts_files", // Updated to reflect TypeScript focus
} as const;

// Convert Firestore timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Convert Firestore document to TSFolder
const convertFolderDoc = (
  doc: QueryDocumentSnapshot<DocumentData>
): TSFolder => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    isCollapsed: data.isCollapsed || false,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    description: data.description,
    fileCount: data.fileCount || 0,
  };
};

// Convert Firestore document to TSFile
const convertFileDoc = (doc: QueryDocumentSnapshot<DocumentData>): TSFile => {
  const data = doc.data();
  const content = data.content || "";

  // Parse the TS content using AST for comprehensive analysis
  const analysis = parseTSContent(content);

  return {
    id: doc.id,
    name: data.name,
    content: data.content,
    lastModified: convertTimestamp(data.lastModified),
    isActive: data.isActive || false,
    folderId: data.folderId,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    hasExportDefault: analysis.hasExportDefault,
    arguments: analysis.arguments,
    fileType: analysis.fileType,
    hasTypeAnnotations: analysis.hasTypeAnnotations,
    complexity: analysis.complexity,
    exportType: analysis.exportType,
    functionName: analysis.functionName || null,
    parameterCount: analysis.parameterCount,
    hasGenerics: analysis.hasGenerics,
    hasUnionTypes: analysis.hasUnionTypes,
    hasIntersectionTypes: analysis.hasIntersectionTypes,
    hasDestructuring: analysis.hasDestructuring,
    hasRestParameters: analysis.hasRestParameters,
    functionDependencies: analysis.functionDependencies || [],
    isAsync: analysis.isAsync,
    hasAwait: analysis.hasAwait,
    returnType: analysis.returnType,
  };
};

// Helper function to parse TS content for export default functions using AST
const parseTSContent = (content: string): FileAnalysisResult => {
  try {
    // Use AST parser for comprehensive parsing and analysis
    return astParser.parseContent(content);
  } catch (error) {
    console.error("Error parsing TS content with AST:", error);
    return {
      hasExportDefault: false,
      arguments: [],
      fileType: "javascript",
      hasTypeAnnotations: false,
      complexity: "simple",
      exportType: "none",
      parameterCount: 0,
      hasGenerics: false,
      hasUnionTypes: false,
      hasIntersectionTypes: false,
      hasDestructuring: false,
      hasRestParameters: false,
      functionDependencies: [],
      isAsync: false,
      hasAwait: false,
      returnType: "sync",
    };
  }
};

// TypeScript Function Service
export class TypeScriptFunctionService {
  // Initialize service (no-op for Firebase)
  initialize() {
    // Firebase is already initialized in lib/firebase.ts
    console.log("TypeScript Function Service initialized");
  }

  // Folder CRUD Operations
  folders = {
    // Get all folders
    async getAll(): Promise<TSFolder[]> {
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
    async getById(id: string): Promise<TSFolder | undefined> {
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
    async create(folderData: CreateFolderData): Promise<TSFolder> {
      try {
        const folderRef = await addDoc(collection(db, COLLECTIONS.FOLDERS), {
          ...folderData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const newFolder: TSFolder = {
          id: folderRef.id,
          name: folderData.name,
          isCollapsed: folderData.isCollapsed || false,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: folderData.description,
          fileCount: 0,
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
    ): Promise<TSFolder | null> {
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
    async toggleCollapse(id: string): Promise<TSFolder | null> {
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
    async getAll(): Promise<TSFile[]> {
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
    async getById(id: string): Promise<TSFile | undefined> {
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
    async getByFolderId(folderId: string): Promise<TSFile[]> {
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
    async create(fileData: CreateFileData): Promise<TSFile> {
      try {
        // Parse the TS content using AST for comprehensive analysis
        const analysis = parseTSContent(fileData.content);

        const fileRef = await addDoc(collection(db, COLLECTIONS.FILES), {
          ...fileData,
          hasExportDefault: analysis.hasExportDefault,
          arguments: analysis.arguments,
          fileType: analysis.fileType,
          hasTypeAnnotations: analysis.hasTypeAnnotations,
          complexity: analysis.complexity,
          exportType: analysis.exportType,
          functionName: analysis.functionName || null,
          parameterCount: analysis.parameterCount,
          hasGenerics: analysis.hasGenerics,
          hasUnionTypes: analysis.hasUnionTypes,
          hasIntersectionTypes: analysis.hasIntersectionTypes,
          hasDestructuring: analysis.hasDestructuring,
          hasRestParameters: analysis.hasRestParameters,
          functionDependencies: analysis.functionDependencies || [],
          isAsync: analysis.isAsync || false,
          hasAwait: analysis.hasAwait || false,
          returnType: analysis.returnType || "sync",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastModified: serverTimestamp(),
        });

        const newFile: TSFile = {
          id: fileRef.id,
          name: fileData.name,
          content: fileData.content,
          lastModified: new Date(),
          isActive: fileData.isActive || false,
          folderId: fileData.folderId,
          createdAt: new Date(),
          updatedAt: new Date(),
          hasExportDefault: analysis.hasExportDefault,
          arguments: analysis.arguments,
          fileType: analysis.fileType,
          hasTypeAnnotations: analysis.hasTypeAnnotations,
          complexity: analysis.complexity,
          exportType: analysis.exportType,
          functionName: analysis.functionName || null,
          parameterCount: analysis.parameterCount,
          hasGenerics: analysis.hasGenerics,
          hasUnionTypes: analysis.hasUnionTypes,
          hasIntersectionTypes: analysis.hasIntersectionTypes,
          hasDestructuring: analysis.hasDestructuring,
          hasRestParameters: analysis.hasRestParameters,
          functionDependencies: analysis.functionDependencies || [],
          isAsync: analysis.isAsync || false,
          hasAwait: analysis.hasAwait || false,
          returnType: analysis.returnType || "sync",
        };

        // Update folder file count
        await this.updateFolderFileCounts([fileData.folderId]);

        return newFile;
      } catch (error) {
        console.error("Error creating file:", error);
        throw new Error("Failed to create file");
      }
    },

    // Update file
    async update(
      id: string,
      updates: Partial<Omit<TSFile, "id" | "createdAt">>
    ): Promise<TSFile | null> {
      try {
        // If content is being updated, parse it for comprehensive analysis
        let analysis = null;
        if (updates.content) {
          analysis = parseTSContent(updates.content);
        }

        const fileRef = doc(db, COLLECTIONS.FILES, id);
        const updateData: any = {
          ...updates,
          updatedAt: serverTimestamp(),
          lastModified: serverTimestamp(),
        };

        // Add parsed content data if content was updated
        if (analysis) {
          updateData.hasExportDefault = analysis.hasExportDefault;
          updateData.arguments = analysis.arguments;
          updateData.fileType = analysis.fileType;
          updateData.hasTypeAnnotations = analysis.hasTypeAnnotations;
          updateData.complexity = analysis.complexity;
          updateData.exportType = analysis.exportType;
          updateData.functionName = analysis.functionName || null;
          updateData.parameterCount = analysis.parameterCount;
          updateData.hasGenerics = analysis.hasGenerics;
          updateData.hasUnionTypes = analysis.hasUnionTypes;
          updateData.hasIntersectionTypes = analysis.hasIntersectionTypes;
          updateData.hasDestructuring = analysis.hasDestructuring;
          updateData.hasRestParameters = analysis.hasRestParameters;
          updateData.functionDependencies = analysis.functionDependencies || [];
        }

        await updateDoc(fileRef, updateData);

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
    async updateContent(id: string, content: string): Promise<TSFile | null> {
      try {
        // Parse the TS content using AST for comprehensive analysis
        const analysis = parseTSContent(content);

        const fileRef = doc(db, COLLECTIONS.FILES, id);
        await updateDoc(fileRef, {
          content,
          hasExportDefault: analysis.hasExportDefault,
          arguments: analysis.arguments,
          fileType: analysis.fileType,
          hasTypeAnnotations: analysis.hasTypeAnnotations,
          complexity: analysis.complexity,
          exportType: analysis.exportType,
          functionName: analysis.functionName || null,
          parameterCount: analysis.parameterCount,
          hasGenerics: analysis.hasGenerics,
          hasUnionTypes: analysis.hasUnionTypes,
          hasIntersectionTypes: analysis.hasIntersectionTypes,
          hasDestructuring: analysis.hasDestructuring,
          hasRestParameters: analysis.hasRestParameters,
          functionDependencies: analysis.functionDependencies || [],
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
        // Get the file to find its folder before deleting
        const file = await this.getById(id);
        if (!file) {
          throw new Error("File not found");
        }

        const fileRef = doc(db, COLLECTIONS.FILES, id);
        await deleteDoc(fileRef);

        // Update folder file count
        await this.updateFolderFileCounts([file.folderId]);

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
    async search(searchQuery: string): Promise<TSFile[]> {
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

    // Get files by complexity
    async getByComplexity(
      complexity: "simple" | "moderate" | "complex"
    ): Promise<TSFile[]> {
      try {
        const q = query(
          collection(db, COLLECTIONS.FILES),
          where("complexity", "==", complexity),
          orderBy("lastModified", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(convertFileDoc);
      } catch (error) {
        console.error("Error fetching files by complexity:", error);
        throw new Error("Failed to fetch files by complexity");
      }
    },

    // Get files by file type
    async getByFileType(
      fileType: "typescript" | "javascript"
    ): Promise<TSFile[]> {
      try {
        const q = query(
          collection(db, COLLECTIONS.FILES),
          where("fileType", "==", fileType),
          orderBy("lastModified", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(convertFileDoc);
      } catch (error) {
        console.error("Error fetching files by type:", error);
        throw new Error("Failed to fetch files by type");
      }
    },

    // Move file to different folder
    async moveToFolder(
      fileId: string,
      newFolderId: string
    ): Promise<TSFile | null> {
      try {
        // Get the file to find its current folder
        const file = await this.getById(fileId);
        if (!file) {
          throw new Error("File not found");
        }

        const oldFolderId = file.folderId;

        // Update the file's folder
        const fileRef = doc(db, COLLECTIONS.FILES, fileId);
        await updateDoc(fileRef, {
          folderId: newFolderId,
          updatedAt: serverTimestamp(),
          lastModified: serverTimestamp(),
        });

        // Update file counts for both folders
        await this.updateFolderFileCounts([oldFolderId, newFolderId]);

        // Return updated file
        const updatedDoc = await getDoc(fileRef);
        if (updatedDoc.exists()) {
          return convertFileDoc(
            updatedDoc as QueryDocumentSnapshot<DocumentData>
          );
        }
        return null;
      } catch (error) {
        console.error("Error moving file to folder:", error);
        throw new Error("Failed to move file to folder");
      }
    },

    // Update file counts for folders
    async updateFolderFileCounts(folderIds: string[]): Promise<void> {
      try {
        const batch = writeBatch(db);

        for (const folderId of folderIds) {
          // Count files in this folder
          const filesQuery = query(
            collection(db, COLLECTIONS.FILES),
            where("folderId", "==", folderId)
          );
          const filesSnapshot = await getDocs(filesQuery);
          const fileCount = filesSnapshot.size;

          // Update folder with new file count
          const folderRef = doc(db, COLLECTIONS.FOLDERS, folderId);
          batch.update(folderRef, {
            fileCount,
            updatedAt: serverTimestamp(),
          });
        }

        await batch.commit();
      } catch (error) {
        console.error("Error updating folder file counts:", error);
        throw new Error("Failed to update folder file counts");
      }
    },
  };

  // Real-time listeners for live updates
  subscribeToFolders(callback: (folders: TSFolder[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.FOLDERS),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (querySnapshot) => {
      const folders = querySnapshot.docs.map(convertFolderDoc);
      callback(folders);
    });
  }

  subscribeToFiles(callback: (files: TSFile[]) => void) {
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
    callback: (files: TSFile[]) => void
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
export const typescriptFunctionService = new TypeScriptFunctionService();

// Legacy aliases for backward compatibility
export const firebaseFunctionService = typescriptFunctionService;
export const jsFunctionService = typescriptFunctionService;

// Export default for backward compatibility
export default typescriptFunctionService;
