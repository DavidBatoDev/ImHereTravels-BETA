# Migration 034: Import Booking Columns

## Purpose

Imports booking sheet columns from the exported JSON file into Firestore's `bookingSheetColumns` collection.

## What it does

1. Locates the latest `booking-columns-*.json` file in the `exports/` directory
2. Parses the JSON and revives Firestore timestamp objects
3. Imports all columns into the `bookingSheetColumns` collection
4. Uses merge strategy to update existing columns while preserving other fields

## Prerequisites

- Ensure you have a `booking-columns-*.json` file in the `exports/` directory
- Firebase credentials must be configured in `firebase-config.ts`

## Running the migration

### Dry run (preview changes without writing)

```bash
cd client/migrations
npx ts-node 034-import-booking-columns.ts --dry-run
```

### Production run

```bash
cd client/migrations
npx ts-node 034-import-booking-columns.ts
```

## Expected Output

```
🚀 Running 034-import-booking-columns
📦 Target collection: bookingSheetColumns
🔧 Dry run: NO
📄 Using export file: booking-columns-2025-10-01T15-30-18-522Z.json
📊 Found 62 columns in export file
📚 Found 50 existing columns in Firestore
✅ Batch 1 committed (62 columns)

📊 Migration Summary:
   Created: 12
   Updated: 50
   Skipped: 0
   Errors: 0
   File: booking-columns-2025-10-01T15-30-18-522Z.json

✅ Successfully imported 62 booking columns from booking-columns-2025-10-01T15-30-18-522Z.json
```

## Features

- ✅ Automatically finds the latest export file
- ✅ Revives Firestore Timestamp objects
- ✅ Supports batch operations (500 documents per batch)
- ✅ Merge strategy preserves existing fields
- ✅ Dry run mode for testing
- ✅ Detailed progress logging
- ✅ Error handling and reporting

## Notes

- The migration uses `merge: true` to update existing columns without overwriting other fields
- Column IDs are used as document IDs in Firestore
- The `id` field is removed from the document data since it's stored as the document ID
- Timestamps are automatically converted from the export format to Firestore Timestamp objects

## Rollback

To rollback, you would need to:

1. Export the current state before running the migration
2. Restore from a backup if available
3. Or manually delete/revert the imported columns

## Related Files

- Export file: `exports/booking-columns-2025-10-01T15-30-18-522Z.json`
- Collection: `bookingSheetColumns`
