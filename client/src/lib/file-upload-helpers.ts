// ============================================================================
// FILE UPLOAD UTILITIES AND HELPERS
// ============================================================================

import type { FileUploadOptions } from './file-upload-service';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const DEFAULT_UPLOAD_OPTIONS: Required<FileUploadOptions> = {
  bucket: 'tour-images',
  folder: 'general',
  fileName: '',
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  quality: 0.8,
  resize: {
    width: 1920,
    height: 1080,
    maintainAspectRatio: true,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique filename with timestamp and random string
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
  const sanitizedName = nameWithoutExtension.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${sanitizedName}_${timestamp}_${randomString}.${extension}`;
}

/**
 * Validate file type and size
 */
export function validateFile(file: File, options: Partial<FileUploadOptions> = {}): string | null {
  const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...options };
  
  // Check file size
  if (file.size > opts.maxSize) {
    return `File size exceeds ${(opts.maxSize / (1024 * 1024)).toFixed(1)}MB limit`;
  }
  
  // Check file type
  if (!opts.allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`;
  }
  
  return null;
}

/**
 * Compress and resize image file
 */
export function compressImage(file: File, options: Partial<FileUploadOptions> = {}): Promise<File> {
  return new Promise((resolve) => {
    const opts = { ...DEFAULT_UPLOAD_OPTIONS, ...options };
    
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = opts.resize!;
      
      if (opts.resize!.maintainAspectRatio) {
        const aspectRatio = img.width / img.height;
        
        if (img.width > img.height) {
          height = width / aspectRatio;
        } else {
          width = height * aspectRatio;
        }
      }
      
      // Set canvas size
      canvas.width = Math.min(width, img.width);
      canvas.height = Math.min(height, img.height);
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        opts.quality
      );
    };
    
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  
  return mimeToExt[mimeType] || 'bin';
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a document
 */
export function isDocumentFile(file: File): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  
  return documentTypes.includes(file.type);
}

/**
 * Get file type category
 */
export function getFileTypeCategory(file: File): 'image' | 'document' | 'other' {
  if (isImageFile(file)) return 'image';
  if (isDocumentFile(file)) return 'document';
  return 'other';
}

/**
 * Create a preview URL for a file (blob URL)
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Read file as data URL (base64)
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Read file as array buffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove or replace unsafe characters
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Extract file info for display
 */
export function extractFileInfo(file: File) {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    sizeFormatted: formatFileSize(file.size),
    category: getFileTypeCategory(file),
    isImage: isImageFile(file),
    isDocument: isDocumentFile(file),
    extension: getExtensionFromMimeType(file.type),
  };
}
