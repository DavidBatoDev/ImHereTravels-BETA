# Scripts Directory

This directory contains utility scripts for managing the ImHereTravels application data.

## Export Scripts

### export-booking-sheet-columns.js

Exports all documents from the `bookingSheetColumns` Firestore collection to a JSON file.

**Usage:**

```bash
cd client/scripts
node export-booking-sheet-columns.js
```

**Features:**

- Exports all documents from the `bookingSheetColumns` collection
- Includes document IDs in the export
- Converts Firestore Timestamps to ISO strings for JSON compatibility
- Sorts results by `order` field (if available) or by document ID
- Saves to `../exports/` directory with timestamp
- Provides detailed console output with progress and summary

**Output:**

- JSON file in `client/exports/` directory
- Filename format: `booking-sheet-columns-YYYY-MM-DDTHH-MM-SS-sssZ.json`
- Console summary showing column details

**Requirements:**

- Firebase Admin SDK service account key in `../keys/serviceAcc.json`
- Node.js environment with Firebase Admin SDK installed

**Example Output Structure:**

```json
[
  {
    "id": "bookingId",
    "name": "Booking ID",
    "type": "string",
    "required": true,
    "width": 120,
    "order": 1,
    "visible": true,
    "editable": false,
    "sortable": true,
    "filterable": true,
    "parentTab": "Core Booking"
  }
]
```
