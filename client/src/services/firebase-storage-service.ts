import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  StorageReference,
} from "firebase/storage";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { storage, db, auth } from "@/lib/firebase";
import { ImageItem, StorageFilters, StorageStats } from "@/types/storage";

export interface FirebaseFileObject {
  id: string;
  name: string;
  originalName: string;
  size: number;
  contentType: string;
  storagePath: string;
  downloadURL: string;
  uploadedAt: Date | any; // Firestore Timestamp when retrieved
  uploadedBy: string;
  tags: string[];
  metadata: {
    description: string;
    location: string;
    category: string;
    width?: number;
    height?: number;
  };
  lastModified: Date | any; // Firestore Timestamp when retrieved
}

export class FirebaseStorageService {
  private static instance: FirebaseStorageService;
  private readonly COLLECTION_NAME = "file_objects";
  private readonly STORAGE_PATH = "images";

  private constructor() {}

  public static getInstance(): FirebaseStorageService {
    if (!FirebaseStorageService.instance) {
      FirebaseStorageService.instance = new FirebaseStorageService();
    }
    return FirebaseStorageService.instance;
  }

  /**
   * Upload a file to Firebase Storage and create a Firestore document
   */
  async uploadFile(
    file: File,
    tags: string[] = [],
    metadata: Partial<ImageItem["metadata"]> = {}
  ): Promise<ImageItem> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User must be authenticated to upload files");
      }

      // Generate unique filename
      const timestamp = Date.now();
      const uniqueName = `${timestamp}_${file.name}`;
      const storagePath = `${this.STORAGE_PATH}/${uniqueName}`;

      // Create storage reference
      const storageRef = ref(storage, storagePath);

      // Upload file to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file);
      console.log("File uploaded to Firebase Storage:", snapshot);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Clean metadata to remove undefined values
      const cleanMetadata: FirebaseFileObject["metadata"] = {
        description: metadata.description || "",
        location: metadata.location || "",
        category: metadata.category || "uncategorized",
      };

      // Only add width/height if they are defined
      if (metadata.width !== undefined) {
        cleanMetadata.width = metadata.width;
      }
      if (metadata.height !== undefined) {
        cleanMetadata.height = metadata.height;
      }

      // Debug: Log the cleaned metadata
      console.log("Original metadata:", metadata);
      console.log("Cleaned metadata:", cleanMetadata);

      // Create Firestore document
      const fileObject: FirebaseFileObject = {
        id: uniqueName,
        name: uniqueName,
        originalName: file.name,
        size: file.size,
        contentType: file.type,
        storagePath: storagePath,
        downloadURL: downloadURL,
        uploadedAt: new Date(),
        uploadedBy: currentUser.uid,
        tags: tags,
        metadata: cleanMetadata,
        lastModified: new Date(),
      };

      // Validate file object before saving
      this.validateFileObject(fileObject);

      // Save to Firestore
      const docRef = doc(collection(db, this.COLLECTION_NAME), uniqueName);
      await setDoc(docRef, fileObject);

      // Convert to ImageItem format for compatibility
      const imageItem: ImageItem = {
        id: uniqueName,
        name: file.name,
        url: downloadURL,
        size: this.formatFileSize(file.size),
        type: file.type,
        uploadedAt: fileObject.uploadedAt.toISOString().split("T")[0],
        tags: tags,
        metadata: fileObject.metadata,
        firebaseStoragePath: storagePath,
        firestoreId: uniqueName,
        downloadURL: downloadURL,
        contentType: file.type,
        lastModified: fileObject.lastModified,
        uploadedBy: currentUser.uid,
      };

      return imageItem;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Get all files from Firestore (no filtering - all done on frontend)
   */
  async getFiles(): Promise<ImageItem[]> {
    try {
      // Simple query - just get all files, no filtering or ordering
      const q = query(collection(db, this.COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      const files: ImageItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirebaseFileObject;
        files.push(this.convertFirebaseObjectToImageItem(data));
      });

      return files;
    } catch (error) {
      console.error("Error getting files:", error);
      throw new Error(`Failed to get files: ${error}`);
    }
  }

  /**
   * Get a single file by ID
   */
  async getFileById(id: string): Promise<ImageItem | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as FirebaseFileObject;
        return this.convertFirebaseObjectToImageItem(data);
      }

      return null;
    } catch (error) {
      console.error("Error getting file:", error);
      throw new Error(`Failed to get file: ${error}`);
    }
  }

  /**
   * Delete a file from both Firebase Storage and Firestore
   */
  async deleteFile(id: string): Promise<boolean> {
    try {
      // Get file document first
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("File not found");
      }

      const fileData = docSnap.data() as FirebaseFileObject;

      // Delete from Firebase Storage
      const storageRef = ref(storage, fileData.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(docRef);

      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Bulk delete multiple files
   */
  async bulkDeleteFiles(ids: string[]): Promise<boolean> {
    try {
      const deletePromises = ids.map((id) => this.deleteFile(id));
      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error("Error bulk deleting files:", error);
      throw new Error(`Failed to bulk delete files: ${error}`);
    }
  }

  /**
   * Update file metadata in Firestore
   */
  async updateFile(
    id: string,
    updates: Partial<ImageItem>
  ): Promise<ImageItem | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("File not found");
      }

      // Prepare update data
      const updateData: Partial<FirebaseFileObject> = {
        lastModified: new Date(),
      };

      if (updates.tags) {
        updateData.tags = updates.tags;
      }

      if (updates.metadata) {
        // Clean the metadata to remove undefined values
        const cleanMetadata = {
          ...docSnap.data().metadata,
          ...this.cleanObject(updates.metadata),
        };
        updateData.metadata = cleanMetadata;
      }

      // Update in Firestore
      await updateDoc(docRef, updateData);

      // Get updated document
      const updatedDoc = await getDoc(docRef);
      const data = updatedDoc.data() as FirebaseFileObject;
      return this.convertFirebaseObjectToImageItem(data);
    } catch (error) {
      console.error("Error updating file:", error);
      throw new Error(`Failed to update file: ${error}`);
    }
  }

  /**
   * Update the display name of a file in Firestore
   * Note: This only changes the display name, not the actual file in storage
   */
  async renameFile(id: string, newName: string): Promise<ImageItem | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("File not found");
      }

      const currentData = docSnap.data() as FirebaseFileObject;

      // Validate the new name
      if (!newName.trim()) {
        throw new Error("New name cannot be empty");
      }

      // Extract file extension from current name
      const lastDotIndex = currentData.name.lastIndexOf(".");
      const extension =
        lastDotIndex !== -1 ? currentData.name.substring(lastDotIndex) : "";

      // Ensure the new name has the file extension
      let finalName = newName;
      if (
        extension &&
        !newName.toLowerCase().endsWith(extension.toLowerCase())
      ) {
        finalName = newName + extension;
      }

      // Check if name already exists (per user)
      const existingFilesQuery = query(
        collection(db, this.COLLECTION_NAME),
        where("name", "==", finalName),
        where("uploadedBy", "==", currentData.uploadedBy)
      );
      const existingFiles = await getDocs(existingFilesQuery);

      if (!existingFiles.empty && existingFiles.docs[0].id !== id) {
        throw new Error("A file with this name already exists");
      }

      // Update only the display name in Firestore
      const updateData: Partial<FirebaseFileObject> = {
        name: finalName,
        lastModified: new Date(),
      };

      await updateDoc(docRef, updateData);

      // Get updated document
      const updatedDoc = await getDoc(docRef);
      const data = updatedDoc.data() as FirebaseFileObject;
      return this.convertFirebaseObjectToImageItem(data);
    } catch (error) {
      console.error("Error renaming file:", error);
      throw new Error(`Failed to rename file: ${error}`);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      const files: FirebaseFileObject[] = [];

      querySnapshot.forEach((doc) => {
        files.push(doc.data() as FirebaseFileObject);
      });

      // Calculate total size
      const totalSizeBytes = files.reduce((acc, file) => acc + file.size, 0);
      const totalSizeMB = totalSizeBytes / (1024 * 1024);

      // Group by content type
      const imagesByType = files.reduce((acc, file) => {
        const type = file.contentType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by month
      const imagesByMonth = files.reduce((acc, file) => {
        const month = file.uploadedAt.toISOString().substring(0, 7); // YYYY-MM format
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Popular tags
      const tagCounts = files.reduce((acc, file) => {
        file.tags.forEach((tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      const popularTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalImages: files.length,
        totalSize: `${totalSizeMB.toFixed(1)} MB`,
        imagesByType,
        imagesByMonth,
        popularTags,
      };
    } catch (error) {
      console.error("Error getting storage stats:", error);
      throw new Error(`Failed to get storage stats: ${error}`);
    }
  }

  /**
   * Convert Firebase FileObject to ImageItem for compatibility
   */
  private convertFirebaseObjectToImageItem(
    fileObject: FirebaseFileObject
  ): ImageItem {
    // Convert Firestore Timestamps to Date objects if needed
    const uploadedAt = this.convertTimestamp(fileObject.uploadedAt);
    const lastModified = this.convertTimestamp(fileObject.lastModified);

    return {
      id: fileObject.id,
      name: fileObject.name, // Use the display name, not originalName
      url: fileObject.downloadURL,
      size: this.formatFileSize(fileObject.size),
      type: fileObject.contentType,
      uploadedAt: uploadedAt ? uploadedAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      tags: fileObject.tags || [],
      metadata: fileObject.metadata || {
        description: "",
        location: "",
        category: "uncategorized",
      },
      firebaseStoragePath: fileObject.storagePath,
      firestoreId: fileObject.id,
      downloadURL: fileObject.downloadURL,
      contentType: fileObject.contentType,
      lastModified: lastModified || new Date(),
      uploadedBy: fileObject.uploadedBy,
    };
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * List all files in Firebase Storage (for cleanup purposes)
   */
  async listStorageFiles(): Promise<string[]> {
    try {
      const storageRef = ref(storage, this.STORAGE_PATH);
      const result = await listAll(storageRef);
      return result.items.map((item) => item.fullPath);
    } catch (error) {
      console.error("Error listing storage files:", error);
      throw new Error(`Failed to list storage files: ${error}`);
    }
  }

  /**
   * Clean object by removing undefined values
   */
  private cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleaned[key as keyof T] = value;
      }
    });
    return cleaned;
  }

  /**
   * Convert Firestore Timestamp to Date
   */
  private convertTimestamp(timestamp: Date | any): Date | null {
    // Handle null or undefined
    if (!timestamp) {
      return null;
    }
    // Already a Date object
    if (timestamp instanceof Date) {
      // Validate the date is not invalid
      if (isNaN(timestamp.getTime())) {
        return null;
      }
      return timestamp;
    }
    // Handle Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === "function") {
      try {
        const date = timestamp.toDate();
        // Validate the converted date
        if (isNaN(date.getTime())) {
          return null;
        }
        return date;
      } catch (error) {
        console.warn("Failed to convert Firestore timestamp:", error);
        return null;
      }
    }
    // Try to parse as string or number
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch (error) {
      console.warn("Failed to parse timestamp:", timestamp, error);
      return null;
    }
  }

  /**
   * Validate file object before saving to Firestore
   */
  private validateFileObject(fileObject: FirebaseFileObject): void {
    const requiredFields = [
      "id",
      "name",
      "originalName",
      "size",
      "contentType",
      "storagePath",
      "downloadURL",
      "uploadedAt",
      "uploadedBy",
      "tags",
      "metadata",
      "lastModified",
    ];

    for (const field of requiredFields) {
      if (fileObject[field as keyof FirebaseFileObject] === undefined) {
        throw new Error(
          `Required field '${field}' is undefined in file object`
        );
      }
    }

    // Validate metadata fields
    if (
      fileObject.metadata.description === undefined ||
      fileObject.metadata.location === undefined ||
      fileObject.metadata.category === undefined
    ) {
      throw new Error("Required metadata fields are undefined");
    }
  }
}

export default FirebaseStorageService.getInstance();
