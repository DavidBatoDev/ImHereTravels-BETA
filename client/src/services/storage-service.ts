import {
  ImageItem,
  UploadProgress,
  StorageFilters,
  StorageStats,
  StorageFolder,
} from "@/types/storage";
import firebaseStorageService from "./firebase-storage-service";

// Firebase Storage integration
export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Get all images with optional filtering
  async getImages(): Promise<ImageItem[]> {
    try {
      return await firebaseStorageService.getFiles();
    } catch (error) {
      console.error("Error getting images:", error);
      return [];
    }
  }

  // Get image by ID
  async getImageById(id: string): Promise<ImageItem | null> {
    try {
      return await firebaseStorageService.getFileById(id);
    } catch (error) {
      console.error("Error getting image:", error);
      return null;
    }
  }

  // Upload image to Firebase
  async uploadImage(file: File, tags: string[] = [], folder?: string): Promise<ImageItem> {
    try {
      return await firebaseStorageService.uploadFile(file, tags, {}, folder);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }

  // Get all videos
  async getVideos(): Promise<ImageItem[]> {
    try {
      return await firebaseStorageService.getVideos();
    } catch (error) {
      console.error("Error getting videos:", error);
      return [];
    }
  }

  // Upload video to Firebase (videos/ path)
  async uploadVideo(file: File, tags: string[] = []): Promise<ImageItem> {
    try {
      return await firebaseStorageService.uploadVideo(file, tags);
    } catch (error) {
      console.error("Error uploading video:", error);
      throw error;
    }
  }

  // Delete image from Firebase
  async deleteImage(id: string): Promise<boolean> {
    try {
      return await firebaseStorageService.deleteFile(id);
    } catch (error) {
      console.error("Error deleting image:", error);
      return false;
    }
  }

  // Bulk delete images from Firebase
  async bulkDeleteImages(ids: string[]): Promise<boolean> {
    try {
      return await firebaseStorageService.bulkDeleteFiles(ids);
    } catch (error) {
      console.error("Error bulk deleting images:", error);
      return false;
    }
  }

  // Update image metadata in Firebase
  async updateImage(
    id: string,
    updates: Partial<ImageItem>
  ): Promise<ImageItem | null> {
    try {
      return await firebaseStorageService.updateFile(id, updates);
    } catch (error) {
      console.error("Error updating image:", error);
      return null;
    }
  }

  // Update image display name in Firebase
  async renameImage(id: string, newName: string): Promise<ImageItem | null> {
    try {
      return await firebaseStorageService.renameFile(id, newName);
    } catch (error) {
      console.error("Error updating image name:", error);
      return null;
    }
  }

  // ─── Folder methods ────────────────────────────────────────────────────────

  async getFilesByFolder(folder: string): Promise<ImageItem[]> {
    try { return await firebaseStorageService.getFilesByFolder(folder); }
    catch (error) { console.error("Error getting files by folder:", error); return []; }
  }

  async getFolders(parentPath: string): Promise<StorageFolder[]> {
    try { return await firebaseStorageService.getFolders(parentPath); }
    catch (error) { console.error("Error getting folders:", error); return []; }
  }

  async createFolder(name: string, parentPath: string): Promise<StorageFolder> {
    return firebaseStorageService.createFolder(name, parentPath);
  }

  async deleteFolder(id: string): Promise<void> {
    return firebaseStorageService.deleteFolder(id);
  }

  // Get storage statistics from Firebase
  async getStorageStats(): Promise<StorageStats> {
    try {
      return await firebaseStorageService.getStorageStats();
    } catch (error) {
      console.error("Error getting storage stats:", error);
      return {
        totalImages: 0,
        totalSize: "0 MB",
        imagesByType: {},
        imagesByMonth: {},
        popularTags: [],
      };
    }
  }
}

export default StorageService.getInstance();
