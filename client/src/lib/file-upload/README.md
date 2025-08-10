# File Upload Module

This module provides comprehensive file upload functionality for the ImHere Travels application.

## Structure

### Core Files

- **`file-upload-service.ts`** - Main service with upload, delete, and bucket management functions
- **`file-upload-helpers.ts`** - Utility functions for file validation, compression, and manipulation
- **`blob-upload-service.ts`** - Service for handling blob-first uploads
- **`use-file-upload.ts`** - React hooks for file upload functionality

### Barrel Export

- **`file-upload/index.ts`** - Barrel export for easy imports

## Usage

### Basic Import (Recommended)

```typescript
import { uploadFile, useFileUpload, validateFile } from "@/lib/file-upload";
```

### Specific Imports

```typescript
// Service functions
import { uploadFile, uploadTourCoverImage } from "@/lib/file-upload-service";

// Helper functions
import {
  validateFile,
  compressImage,
  generateUniqueFileName,
} from "@/lib/file-upload-helpers";

// React hooks
import { useFileUpload, useTourUpload } from "@/hooks/use-file-upload";

// Blob uploads
import { uploadCoverBlobToStorage } from "@/lib/blob-upload-service";
```

## Key Features

### File Upload Service

- Single and bulk file uploads
- Tour-specific upload functions
- Bucket management
- File deletion and copying

### File Upload Helpers

- File validation (size, type)
- Image compression and resizing
- Unique filename generation
- File type detection
- Preview URL management

### React Hooks

- `useFileUpload` - General file upload hook
- `useTourUpload` - Tour-specific upload hook
- `useTourCoverUpload` - Cover image upload hook
- `useTourGalleryUpload` - Gallery upload hook

### Blob Upload Service

- Blob-first upload workflow
- Memory management with cleanup
- Two-stage upload process

## Benefits of This Structure

1. **Separation of Concerns** - Core service logic separated from utilities
2. **Reusability** - Helpers can be used independently
3. **Tree Shaking** - Import only what you need
4. **Maintainability** - Easier to locate and modify specific functionality
5. **Testing** - Each module can be tested independently
