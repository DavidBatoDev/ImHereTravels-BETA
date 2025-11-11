# Version History System

A comprehensive version history system for bookings with Google Sheets-style branching, complete document snapshots, and visual change highlighting.

## Overview

The version history system captures complete snapshots of booking documents whenever they are modified, allowing users to:

- View the complete history of changes to any booking
- See exactly what changed in each version with visual highlighting
- Restore any previous version with Google Sheets-style branching
- Compare different versions side by side
- Track who made changes and when

## Architecture

### Core Components

1. **Types** (`/types/version-history.ts`)
   - Comprehensive TypeScript interfaces for version data
   - Support for branching, metadata, and change tracking

2. **Service** (`/services/booking-version-history-service.ts`)
   - Manages version snapshots in Firestore `bookingVersions` collection
   - Handles version creation, retrieval, comparison, and restoration
   - Implements Google Sheets-style branching logic

3. **Components**
   - `BookingVersionHistoryModal.tsx` - Main modal interface
   - `BookingVersionHistoryGrid.tsx` - Data grid with change highlighting
   - `use-version-history.ts` - React hook for easy integration

### Key Features

#### Automatic Version Tracking
- Snapshots created automatically on booking updates
- Complete document state preservation
- Metadata tracking (user, timestamp, change type)

#### Visual Change Highlighting
- Color-coded cells showing modifications
- Tooltips with old vs new values
- Timeline view of changes

#### Google Sheets-Style Branching
- Non-destructive restore creates new version
- Preserves all historical versions
- Branch visualization and tracking

#### Advanced Filtering
- Search by user, change type, or content
- Filter by branch type (main/restore)
- Date range filtering

## Usage

### Basic Integration

```tsx
import BookingVersionHistoryModal from "@/components/version-history/BookingVersionHistoryModal";

function MyComponent() {
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setIsVersionHistoryOpen(true)}>
        View Version History
      </Button>
      
      <BookingVersionHistoryModal
        bookingId="booking-123" // Optional: specific booking or all bookings
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        onRestore={(versionId) => console.log("Restored:", versionId)}
        columns={bookingColumns}
        currentUserId="user-123"
        currentUserName="John Doe"
      />
    </>
  );
}
```

### Using the Hook

```tsx
import { useVersionHistory } from "@/hooks/use-version-history";

function MyComponent() {
  const {
    versions,
    isLoading,
    selectedVersionId,
    selectVersion,
    restoreVersion,
    loadVersions
  } = useVersionHistory({
    bookingId: "booking-123",
    autoLoad: true
  });
  
  const handleRestore = async (versionId: string) => {
    const result = await restoreVersion(versionId, "user-123", "John Doe");
    if (result.success) {
      console.log("Version restored successfully!");
    }
  };
  
  return (
    <div>
      {versions.map(version => (
        <div key={version.id} onClick={() => selectVersion(version.id)}>
          Version {version.versionNumber} - {version.metadata.changeDescription}
        </div>
      ))}
    </div>
  );
}
```

## Data Structure

### Version Snapshot
Each version contains:
- Complete document snapshot
- Version metadata (timestamp, user, change type)
- Field-level change tracking
- Branching information

### Firestore Collections

#### `bookingVersions`
Stores version snapshots with structure:
```typescript
{
  id: string,
  bookingId: string,
  versionNumber: number,
  branchId: string,
  documentSnapshot: SheetData,
  metadata: VersionMetadata,
  changes: FieldChange[],
  branchInfo: BranchInfo
}
```

## Branching Logic

### Main Timeline
- Sequential version numbers (1, 2, 3, ...)
- Linear progression of changes
- Default branch for normal updates

### Restore Points
- Create new branch when restoring old version
- Preserve original timeline
- Allow multiple restore branches

### Example Timeline
```
v1 → v2 → v3 → v4 (main branch)
      ↓
      v5 (restore of v1)
      ↓
      v6 (edit after restore)
```

## Performance Considerations

### Optimization Strategies
- Batch version creation for bulk operations
- Efficient querying with Firestore indexes
- Lazy loading of version details
- Debounced version creation

### Storage Management
- Consider cleanup policies for old versions
- Compress large document snapshots
- Archive old versions to cold storage

## Security

### Access Control
- Version history respects same permissions as booking data
- User tracking for audit purposes
- Secure restoration with user confirmation

### Data Integrity
- Atomic operations for version creation
- Validation of restored data
- Rollback capabilities on failure

## Future Enhancements

### Planned Features
- Bulk version operations
- Version annotations/comments
- Advanced diff visualization
- Export version history
- Automated cleanup policies

### Integration Opportunities
- Webhook notifications for version events
- API endpoints for external access
- Integration with audit systems
- Backup/restore workflows

## Troubleshooting

### Common Issues

1. **Version creation fails**
   - Check Firestore permissions
   - Verify document structure
   - Review error logs

2. **Restore operation fails**
   - Ensure target version exists
   - Check user permissions
   - Verify booking document exists

3. **Performance issues**
   - Review query limits
   - Check Firestore indexes
   - Consider pagination

### Debug Tools
- Browser console logging
- Firestore query monitoring
- Version history service debugging
- Component state inspection
