# Google Sheets Sync Feature

## Overview

The Google Sheets Sync feature allows users to sync bookings data from the official ImHereTravels Google Spreadsheet directly to the database. This feature uses Bella's authenticated Google account (imheretravels@gmail.com) to access the hardcoded spreadsheet.

**Hardcoded Spreadsheet ID:** `1n9nghnDLhZronH1Ax7-LYUUqY_mQJqGMHtRfLAJHNKM`

## Architecture

### Client-Side Components

- **SpreadsheetSync.tsx** - Modal component with user interface
- **google-sheets-sync-service.ts** - Client-side service that calls API routes

### Server-Side Components

- **google-sheets-server-service.ts** - Server-side service using Google Sheets API
- **/api/sheets/sync/route.ts** - API endpoint for syncing spreadsheet data
- **/api/sheets/validate/route.ts** - API endpoint for validating spreadsheet access

## How It Works

1. User clicks "Sync from Spreadsheet" button in BookingsDataGrid
2. Modal opens with input fields for:
   - Spreadsheet ID or full URL
   - Sheet name (defaults to "Main Dashboard")
3. User confirms the sync (warned about data replacement)
4. Client calls `/api/sheets/sync` with spreadsheet details
5. Server authenticates with Google using Bella's refresh token
6. Server downloads CSV data from the specified spreadsheet
7. Server converts spreadsheet data to CSV format
8. Server imports CSV using existing `csv-import-service`
9. All bookings in database are replaced with new data
10. Client shows success message and refreshes grid

## Authentication

Uses OAuth2 with refresh token stored in environment variables:

- `GMAIL_CLIENT_ID` - Google OAuth client ID
- `GMAIL_CLIENT_SECRET` - Google OAuth client secret
- `GMAIL_REFRESH_TOKEN` - Bella's refresh token

These are the same credentials used for Gmail API integration.

## Spreadsheet Requirements

1. **Access**: Spreadsheet must be shared with `imheretravels@gmail.com` (Bella's account)

   - Minimum permission: Viewer
   - Can be private spreadsheet, just needs to be shared

2. **Structure**:

   - Must contain a sheet named "Main Dashboard" (or user can specify different name)
   - First row must contain column headers
   - Data format should match existing booking structure

3. **Spreadsheet ID**:
   - Can be extracted from URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
   - Or user can paste full URL and it will be automatically extracted

## API Endpoints

### POST /api/sheets/sync

Syncs data from Google Spreadsheet to database.

**Request Body:**

```json
{
  "spreadsheetId": "1abc123...",
  "sheetName": "Main Dashboard"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully synced 50 bookings from Google Sheets",
  "data": {
    "totalRows": 51,
    "validRows": 50
  }
}
```

### POST /api/sheets/validate

Validates if a spreadsheet is accessible.

**Request Body:**

```json
{
  "spreadsheetId": "1abc123..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Spreadsheet is accessible"
}
```

## Security Considerations

1. **Server-Side Only**: OAuth credentials are only used server-side, never exposed to client
2. **Authenticated Access**: Uses Bella's account, so only spreadsheets shared with her are accessible
3. **No Public Access**: Unlike public CSV export URLs, this requires proper Google authentication
4. **Environment Variables**: All credentials stored in secure environment variables

## Error Handling

- Invalid spreadsheet ID → User-friendly error message
- Spreadsheet not shared → Clear instructions to share with Bella's account
- Missing sheet → Error indicates sheet name not found
- Network errors → Graceful degradation with retry option
- Import errors → Detailed error messages from CSV import service

## User Experience

1. **Warning Modal**: Users are warned that sync will replace all bookings
2. **Progress Indicator**: Shows sync progress during operation
3. **Success Feedback**: Shows number of rows synced
4. **Auto-close**: Modal closes automatically after successful sync
5. **Error Recovery**: Clear error messages with actionable steps

## Future Enhancements

- [ ] Auto-sync on schedule (cron job)
- [ ] Selective sync (update only changed rows)
- [ ] Sync history/logs
- [ ] Multiple spreadsheet support
- [ ] Conflict resolution strategies
- [ ] Preview changes before applying
- [ ] Rollback functionality
