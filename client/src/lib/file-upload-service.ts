import { supabase, supabaseAdmin } from './supabase';
import {
  generateUniqueFileName,
  validateFile,
  compressImage,
  DEFAULT_UPLOAD_OPTIONS,
} from './file-upload-helpers';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface UploadResult {
  success: boolean;
  data?: {
    path: string;
    fullPath: string;
    publicUrl: string;
  };
  error?: string;
}

export interface FileUploadOptions {
  bucket?: string;
  folder?: string;
  fileName?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  quality?: number; // for image compression (0-1)
  resize?: {
    width: number;
    height: number;
    maintainAspectRatio?: boolean;
  };
}

export interface BulkUploadResult {
  successful: UploadResult[];
  failed: { file: File; error: string }[];
  totalUploaded: number;
  totalFailed: number;
}

// ============================================================================
// BUCKET CONFIGURATION
// ============================================================================

const DEFAULT_BUCKETS = {
  TOURS: 'tour-images',
  PROFILES: 'profile-images',
  DOCUMENTS: 'documents',
  TEMP: 'temp-uploads',
} as const;

// ============================================================================
// BUCKET MANAGEMENT
// ============================================================================

/**
 * Create a storage bucket if it doesn't exist
 */
export async function createBucket(bucketName: string, isPublic: boolean = true): Promise<boolean> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: isPublic,
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'application/pdf',
          'text/plain',
        ],
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in createBucket:', error);
    return false;
  }
}

/**
 * Initialize default buckets
 */
export async function initializeDefaultBuckets(): Promise<void> {
  const buckets = Object.values(DEFAULT_BUCKETS);
  
  for (const bucket of buckets) {
    await createBucket(bucket, true);
  }
}

// ============================================================================
// SINGLE FILE UPLOAD
// ============================================================================

/**
 * Upload a single file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  options: Partial<FileUploadOptions> = {}
): Promise<UploadResult> {
  try {
    const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...options };
    
    // Validate file
    const validationError = validateFile(file, opts);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }
    
    // Compress image if needed
    const processedFile = await compressImage(file, opts);
    
    // Generate file path
    const fileName = opts.fileName || generateUniqueFileName(processedFile.name);
    const filePath = opts.folder ? `${opts.folder}/${fileName}` : fileName;
    
    // Ensure bucket exists
    await createBucket(opts.bucket);
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(opts.bucket)
      .upload(filePath, processedFile, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(opts.bucket)
      .getPublicUrl(filePath);
    
    return {
      success: true,
      data: {
        path: filePath,
        fullPath: data.path,
        publicUrl: urlData.publicUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// BULK FILE UPLOAD
// ============================================================================

/**
 * Upload multiple files concurrently
 */
export async function uploadMultipleFiles(
  files: File[],
  options: Partial<FileUploadOptions> = {}
): Promise<BulkUploadResult> {
  const results = await Promise.allSettled(
    files.map(file => uploadFile(file, options))
  );
  
  const successful: UploadResult[] = [];
  const failed: { file: File; error: string }[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successful.push(result.value);
    } else {
      const error = result.status === 'fulfilled' 
        ? result.value.error || 'Upload failed'
        : result.reason?.message || 'Upload failed';
      
      failed.push({
        file: files[index],
        error,
      });
    }
  });
  
  return {
    successful,
    failed,
    totalUploaded: successful.length,
    totalFailed: failed.length,
  };
}

// ============================================================================
// FILE MANAGEMENT
// ============================================================================

/**
 * Delete a file from storage
 */
export async function deleteFile(filePath: string, bucket: string = DEFAULT_BUCKETS.TOURS): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    return !error;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Delete multiple files
 */
export async function deleteMultipleFiles(
  filePaths: string[], 
  bucket: string = DEFAULT_BUCKETS.TOURS
): Promise<{ success: string[]; failed: string[] }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);
    
    if (error) {
      return {
        success: [],
        failed: filePaths,
      };
    }
    
    const successful = data?.map(item => item.name) || [];
    const failed = filePaths.filter(path => !successful.includes(path.split('/').pop() || ''));
    
    return {
      success: successful,
      failed,
    };
  } catch (error) {
    console.error('Error deleting files:', error);
    return {
      success: [],
      failed: filePaths,
    };
  }
}

/**
 * Get file info
 */
export async function getFileInfo(filePath: string, bucket: string = DEFAULT_BUCKETS.TOURS) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: filePath.split('/').pop(),
      });
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
}

/**
 * Copy/move file to different location
 */
export async function copyFile(
  sourcePath: string,
  destinationPath: string,
  sourceBucket: string = DEFAULT_BUCKETS.TOURS,
  destinationBucket: string = DEFAULT_BUCKETS.TOURS
): Promise<boolean> {
  try {
    const { data: sourceData, error: downloadError } = await supabase.storage
      .from(sourceBucket)
      .download(sourcePath);
    
    if (downloadError || !sourceData) {
      return false;
    }
    
    const { error: uploadError } = await supabase.storage
      .from(destinationBucket)
      .upload(destinationPath, sourceData);
    
    return !uploadError;
  } catch (error) {
    console.error('Error copying file:', error);
    return false;
  }
}

// ============================================================================
// TOUR-SPECIFIC HELPERS
// ============================================================================

/**
 * Upload tour cover image
 */
export async function uploadTourCoverImage(file: File, tourId: string): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: DEFAULT_BUCKETS.TOURS,
    folder: `covers/${tourId}`,
    fileName: `cover_${generateUniqueFileName(file.name)}`,
    maxSize: 5 * 1024 * 1024, // 5MB
    resize: {
      width: 1200,
      height: 800,
      maintainAspectRatio: true,
    },
    quality: 0.85,
  });
}

/**
 * Upload tour gallery images
 */
export async function uploadTourGalleryImages(files: File[], tourId: string): Promise<BulkUploadResult> {
  return uploadMultipleFiles(files, {
    bucket: DEFAULT_BUCKETS.TOURS,
    folder: `gallery/${tourId}`,
    maxSize: 8 * 1024 * 1024, // 8MB
    resize: {
      width: 1920,
      height: 1080,
      maintainAspectRatio: true,
    },
    quality: 0.8,
  });
}

/**
 * Upload tour documents (itinerary, terms, etc.)
 */
export async function uploadTourDocument(file: File, tourId: string, documentType: string): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: DEFAULT_BUCKETS.DOCUMENTS,
    folder: `tours/${tourId}/${documentType}`,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    maxSize: 20 * 1024 * 1024, // 20MB
  });
}

// ============================================================================
// EXPORT BUCKET CONSTANTS AND HELPERS
// ============================================================================

export { DEFAULT_BUCKETS };

// Re-export helpers for backward compatibility
export {
  generateUniqueFileName,
  validateFile,
  compressImage,
  getExtensionFromMimeType,
  DEFAULT_UPLOAD_OPTIONS,
} from './file-upload-helpers';
