# Storage Component

This component provides a comprehensive image storage and management system for the ImHereTravels admin panel.

## Features

### Gallery Tab

- **Grid/List View**: Toggle between grid and list view modes
- **Image Management**: View, select, and manage uploaded images
- **Search & Filter**: Search images by name or tags
- **Bulk Operations**: Select multiple images for bulk deletion
- **Responsive Design**: Works on all device sizes

### File Upload

- **Drag & Drop**: Intuitive drag and drop interface
- **Multiple Files**: Upload multiple images at once
- **Progress Tracking**: Real-time upload progress indicators
- **File Validation**: Automatic image file type validation
- **Size Limits**: Configurable file size limits

## Components

### StorageTabs

Main container component with tabs for different storage types:

- Gallery (images)
- Documents (coming soon)
- Media (coming soon)

### GalleryTab

Core gallery functionality with:

- Image grid/list display
- Search and filtering
- Bulk selection and deletion
- Upload functionality

### FileUpload

Modal component for file uploads with:

- File selection interface
- Progress tracking
- File validation
- Upload management

## Usage

```tsx
import StorageTabs from "@/components/storage/StorageTabs";

export default function StoragePage() {
  return (
    <DashboardLayout>
      <StorageTabs />
    </DashboardLayout>
  );
}
```

## Data Structure

### ImageItem

```typescript
interface ImageItem {
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
}
```

## Service Integration

The component currently uses a mock storage service (`StorageService`) that can be easily replaced with Firebase Storage integration.

### Planned Firebase Integration

- **Firebase Storage**: For actual file storage
- **Firestore**: For metadata and image information
- **Authentication**: Secure access control
- **Real-time Updates**: Live synchronization

## Styling

Uses Tailwind CSS with custom components from the UI library:

- Responsive grid layouts
- Hover effects and transitions
- Loading states and animations
- Consistent spacing and typography

## Future Enhancements

- [ ] Image editing and cropping
- [ ] Advanced filtering and sorting
- [ ] Image categories and collections
- [ ] Sharing and collaboration features
- [ ] Image optimization and compression
- [ ] Backup and restore functionality
