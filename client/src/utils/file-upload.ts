import { supabase, supabaseAdmin } from "@/lib/supabase";

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

// Main storage bucket for all tour images
export const STORAGE_BUCKET = 'images';

// ============================================================================
// FILE UPLOAD TYPES
// ============================================================================

export interface UploadResult {
  success: boolean;
  data?: {
    publicUrl: string;
    path: string;
  };
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadOptions {
  bucket: string;
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  generateUniqueName?: boolean;
  onProgress?: (progress: UploadProgress) => void;
}

// ============================================================================
// FILE VALIDATION
// ============================================================================

export const validateFile = (
  file: File,
  options: Partial<FileUploadOptions> = {}
): { valid: boolean; error?: string } => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options; // Default 10MB

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check file type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
};

// ============================================================================
// FILE UPLOAD UTILITIES
// ============================================================================

export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");
  const sanitizedName = nameWithoutExtension.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${sanitizedName}_${timestamp}_${randomString}.${extension}`;
};

export const getFilePath = (
  fileName: string,
  folder?: string,
  tourId?: string
): string => {
  const basePath = folder || 'uploads';
  
  if (tourId) {
    return `${basePath}/tours/${tourId}/${fileName}`;
  }
  
  return `${basePath}/${fileName}`;
};

// ============================================================================
// BUCKET MANAGEMENT
// ============================================================================

/**
 * List all storage buckets in the Supabase project
 */
export async function listStorageBuckets() {
  console.log('Listing storage buckets...');
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return { success: false, error: error.message, buckets: [] };
    }
    
    console.log('Available buckets:', data);
    return { 
      success: true, 
      buckets: data.map(bucket => ({
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        created_at: bucket.created_at
      }))
    };
  } catch (error) {
    console.error('Failed to list buckets:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      buckets: [] 
    };
  }
}

/**
 * Debug helper to check storage setup - call this in console
 */
export async function debugStorageSetup() {
  console.log('🔍 Checking Supabase storage setup...');
  
  const bucketResult = await listStorageBuckets();
  
  if (!bucketResult.success) {
    console.error('❌ Failed to check buckets:', bucketResult.error);
    return;
  }
  
  const buckets = bucketResult.buckets;
  console.log(`📦 Found ${buckets.length} bucket(s):`);
  
  if (buckets.length === 0) {
    console.warn('⚠️  No storage buckets found!');
    console.log(`📖 Please create an "${STORAGE_BUCKET}" bucket in your Supabase dashboard.`);
    console.log('📝 See SUPABASE_STORAGE_SETUP.md for detailed instructions.');
    return;
  }
  
  buckets.forEach(bucket => {
    console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
  });
  
  const hasImagesBucket = buckets.some(bucket => bucket.name === STORAGE_BUCKET);
  
  if (hasImagesBucket) {
    console.log(`✅ "${STORAGE_BUCKET}" bucket found!`);
    
    // Test upload permissions
    console.log('🔐 Testing upload permissions...');
    
    // Try a simple test upload
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload('test/permissions-test.txt', testFile);
      
      if (error) {
        if (error.message.includes('row-level security')) {
          console.error('❌ RLS is blocking uploads!');
          console.log('💡 Quick fix: Go to Authentication > Policies > Disable RLS for storage.objects table');
          console.log('🔒 Secure fix: Create RLS policies as shown in SUPABASE_STORAGE_SETUP.md');
        } else {
          console.error('❌ Upload test failed:', error.message);
        }
      } else {
        console.log('✅ Upload permissions work correctly!');
        // Clean up test file
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(['test/permissions-test.txt']);
      }
    } catch (testError) {
      console.error('❌ Permission test failed:', testError);
    }
  } else {
    console.warn(`⚠️  No "${STORAGE_BUCKET}" bucket found.`);
    console.log(`📖 Please create an "${STORAGE_BUCKET}" bucket in your Supabase dashboard.`);
    console.log(`📝 The upload system now uses only the "${STORAGE_BUCKET}" bucket.`);
  }
}

// Make debug function available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugStorageSetup = debugStorageSetup;
  console.log('🛠️  Debug helper available: call debugStorageSetup() in console to check storage setup');
}

export const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return false;
    }
    
    const bucketExists = data.some(bucket => bucket.name === bucketName);
    console.log('Bucket check result:', { bucketName, exists: bucketExists });
    
    return bucketExists;
  } catch (error) {
    console.error('Error checking bucket:', error);
    return false;
  }
};

export const createBucket = async (
  bucketName: string, 
  isPublic: boolean = true
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Use admin client for bucket creation as it requires elevated permissions
    const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
      public: isPublic,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('Bucket created successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Error creating bucket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create bucket',
    };
  }
};

export const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
  console.log('Ensuring bucket exists:', bucketName);
  
  const exists = await checkBucketExists(bucketName);
  
  if (!exists) {
    console.log('Bucket does not exist, creating:', bucketName);
    const createResult = await createBucket(bucketName);
    return createResult.success;
  }
  
  return true;
};

// ============================================================================
// CORE UPLOAD FUNCTIONS
// ============================================================================

export const uploadFile = async (
  file: File,
  options: FileUploadOptions
): Promise<UploadResult> => {
  console.log('uploadFile called with:', { 
    fileName: file.name, 
    bucket: options.bucket,
    folder: options.folder 
  });
  
  try {
    // Validate file
    const validation = validateFile(file, options);
    if (!validation.valid) {
      console.error('File validation failed:', validation.error);
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate file name
    const fileName = options.generateUniqueName 
      ? generateUniqueFileName(file.name)
      : file.name;

    // Generate file path
    const filePath = getFilePath(fileName, options.folder);
    
    console.log('Uploading to path:', filePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(filePath);

    console.log('Generated public URL:', publicUrlData.publicUrl);

    return {
      success: true,
      data: {
        publicUrl: publicUrlData.publicUrl,
        path: filePath,
      },
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

// ============================================================================
// BULK UPLOAD FUNCTIONS
// ============================================================================

export const uploadMultipleFiles = async (
  files: File[],
  options: FileUploadOptions
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  
  for (const file of files) {
    const result = await uploadFile(file, options);
    results.push(result);
  }
  
  return results;
};

export const uploadFilesParallel = async (
  files: File[],
  options: FileUploadOptions
): Promise<UploadResult[]> => {
  const uploadPromises = files.map(file => uploadFile(file, options));
  return Promise.all(uploadPromises);
};

// ============================================================================
// TOUR-SPECIFIC UPLOAD FUNCTIONS
// ============================================================================

export const uploadTourCoverImage = async (
  file: File,
  tourId: string
): Promise<UploadResult> => {
  console.log(`Uploading cover image to ${STORAGE_BUCKET} bucket`);
  
  const result = await uploadFile(file, {
    bucket: STORAGE_BUCKET,
    folder: 'tours/covers',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    generateUniqueName: true,
  });
  
  if (result.success) {
    console.log(`Successfully uploaded cover image to ${STORAGE_BUCKET} bucket`);
  } else {
    console.error(`Failed to upload cover image:`, result.error);
  }
  
  return result;
};

export const uploadTourGalleryImages = async (
  files: File[],
  tourId: string
): Promise<UploadResult[]> => {
  console.log(`Uploading ${files.length} gallery images to ${STORAGE_BUCKET} bucket`);
  
  const results = await uploadFilesParallel(files, {
    bucket: STORAGE_BUCKET,
    folder: 'tours/gallery',
    maxSize: 8 * 1024 * 1024, // 8MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    generateUniqueName: true,
  });
  
  // Check if all uploads were successful
  const allSuccessful = results.every(result => result.success);
  
  if (allSuccessful) {
    console.log(`Successfully uploaded all gallery images to ${STORAGE_BUCKET} bucket`);
  } else {
    console.log(`Some gallery uploads failed`);
  }
  
  return results;
};

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

export const deleteFile = async (
  filePath: string,
  bucket: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
};

export const deleteMultipleFiles = async (
  filePaths: string[],
  bucket: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
};

// ============================================================================
// URL UTILITIES
// ============================================================================

export const getFileUrl = (filePath: string, bucket: string): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

export const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const objectIndex = pathParts.findIndex(part => part === 'object');
    
    if (objectIndex !== -1 && objectIndex < pathParts.length - 2) {
      return pathParts.slice(objectIndex + 2).join('/');
    }
    
    return null;
  } catch {
    return null;
  }
};
