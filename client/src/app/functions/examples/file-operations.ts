// file-operations.ts
// Example TypeScript function for file operations with Firebase Storage

import {
  storage,
  firebaseUtils,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
} from "../firebase-utils";

export default function fileOperations(
  operation: "upload" | "download" | "delete" | "list" | "metadata",
  options?: {
    file?: File | string;
    fileName?: string;
    path?: string;
    metadata?: { [key: string]: any };
  }
) {
  // Functions are pre-authenticated, no need to check auth state
  switch (operation) {
    case "upload":
      if (!options?.file || !options?.fileName) {
        throw new Error("File and fileName are required for upload operation");
      }
      return uploadFile(
        options.file,
        options.fileName,
        options.path,
        options.metadata
      );

    case "download":
      if (!options?.fileName) {
        throw new Error("fileName is required for download operation");
      }
      return downloadFile(options.fileName, options.path);

    case "delete":
      if (!options?.fileName) {
        throw new Error("fileName is required for delete operation");
      }
      return deleteFile(options.fileName, options.path);

    case "list":
      return listFiles(options?.path);

    case "metadata":
      if (!options?.fileName) {
        throw new Error("fileName is required for metadata operation");
      }
      return getFileMetadata(options.fileName, options.path);

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// Upload a file to Firebase Storage
async function uploadFile(
  file: File | string,
  fileName: string,
  path?: string,
  metadata?: { [key: string]: any }
) {
  try {
    const storagePath = path
      ? `${path}/${fileName}`
      : `uploads/${firebaseUtils.getUserId()}/${fileName}`;
    const storageRef = firebaseUtils.createStorageRef(storagePath);

    let uploadResult;

    if (typeof file === "string") {
      // Upload string content
      uploadResult = await uploadString(storageRef, file, "raw");
    } else {
      // Upload File object
      uploadResult = await uploadBytes(storageRef, file, {
        customMetadata: {
          uploadedBy: firebaseUtils.getUserId() || "unknown",
          uploadedAt: new Date().toISOString(),
          ...metadata,
        },
      });
    }

    const downloadURL = await getDownloadURL(uploadResult.ref);

    return {
      success: true,
      fileName,
      path: storagePath,
      downloadURL,
      message: "File uploaded successfully",
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
}

// Get download URL for a file
async function downloadFile(fileName: string, path?: string) {
  try {
    const storagePath = path
      ? `${path}/${fileName}`
      : `uploads/${firebaseUtils.getUserId()}/${fileName}`;
    const storageRef = firebaseUtils.createStorageRef(storagePath);

    const downloadURL = await getDownloadURL(storageRef);

    return {
      success: true,
      fileName,
      path: storagePath,
      downloadURL,
    };
  } catch (error) {
    console.error("Error getting download URL:", error);
    throw new Error("Failed to get download URL");
  }
}

// Delete a file from Firebase Storage
async function deleteFile(fileName: string, path?: string) {
  try {
    const storagePath = path
      ? `${path}/${fileName}`
      : `uploads/${firebaseUtils.getUserId()}/${fileName}`;
    const storageRef = firebaseUtils.createStorageRef(storagePath);

    await deleteObject(storageRef);

    return {
      success: true,
      fileName,
      path: storagePath,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

// List files in a directory
async function listFiles(path?: string) {
  try {
    const storagePath = path || `uploads/${firebaseUtils.getUserId()}`;
    const storageRef = firebaseUtils.createStorageRef(storagePath);

    const result = await listAll(storageRef);

    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        const metadata = await getMetadata(itemRef);
        const downloadURL = await getDownloadURL(itemRef);

        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          size: metadata.size,
          contentType: metadata.contentType,
          timeCreated: metadata.timeCreated,
          updated: metadata.updated,
          downloadURL,
        };
      })
    );

    return {
      success: true,
      files,
      count: files.length,
      path: storagePath,
    };
  } catch (error) {
    console.error("Error listing files:", error);
    throw new Error("Failed to list files");
  }
}

// Get file metadata
async function getFileMetadata(fileName: string, path?: string) {
  try {
    const storagePath = path
      ? `${path}/${fileName}`
      : `uploads/${firebaseUtils.getUserId()}/${fileName}`;
    const storageRef = firebaseUtils.createStorageRef(storagePath);

    const metadata = await getMetadata(storageRef);
    const downloadURL = await getDownloadURL(storageRef);

    return {
      success: true,
      fileName,
      path: storagePath,
      metadata: {
        name: metadata.name,
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        customMetadata: metadata.customMetadata,
      },
      downloadURL,
    };
  } catch (error) {
    console.error("Error getting file metadata:", error);
    throw new Error("Failed to get file metadata");
  }
}
