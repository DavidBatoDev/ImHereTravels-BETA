export interface ImageItem {
  id: string;
  name: string;
  url: string;
  size: string;
  type: string;
  uploadedAt: string;
  tags: string[];
  metadata?: {
    width?: number;
    height?: number;
    description?: string;
    location?: string;
    category?: string;
  };
  // Firebase-specific fields
  firebaseStoragePath?: string;
  firestoreId?: string;
  downloadURL?: string;
  contentType?: string;
  lastModified?: Date;
  uploadedBy?: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

export interface StorageFilters {
  search: string;
  tags: string[];
  type: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  size: {
    min: number;
    max: number;
  };
}

export interface StorageStats {
  totalImages: number;
  totalSize: string;
  imagesByType: Record<string, number>;
  imagesByMonth: Record<string, number>;
  popularTags: Array<{ tag: string; count: number }>;
}
