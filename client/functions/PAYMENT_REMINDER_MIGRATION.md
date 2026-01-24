# Payment Reminder Migration Script - Usage Guide

## Overview

This script creates payment reminder scheduled emails for bookings rows 1-128 that have `enablePaymentReminder` set to `true`. It will NOT send any initial payment reminder emails.

## Features

✅ **Dry Run Mode** - Preview all changes before execution  
✅ **Smart Skipping** - Avoids creating duplicate scheduled emails  
✅ **Status Tracking** - Marks emails as "sent" if `pxScheduledEmailLink` exists  
✅ **Comprehensive Logging** - Shows email address, count, and sent/skipped status  
✅ **Safe Execution** - Requires explicit flag to run in production mode

## Usage

### 1. Dry Run (Preview Changes)

```bash
cd client/functions
npm run create-payment-reminders -- --dry-run
```

This will:
- Fetch all bookings with `enablePaymentReminder === true` and row numbers 1-128
- Show what scheduled emails would be created
- Display which emails would be marked as "sent"
- **NOT modify the database**

### 2. Production Run (Make Changes)

After reviewing the dry run output:

```bash
cd client/functions
npm run create-payment-reminders -- --production
```

This will:
- Create scheduled email documents in Firebase
- Update booking documents with scheduled email links
- Mark emails as "sent" if corresponding `pxScheduledEmailLink` exists

## Output Example

```
================================================================================
📧 PAYMENT REMINDER MIGRATION SCRIPT
================================================================================
Mode: DRY RUN (no changes will be made)
Target: Bookings rows 1-128 with enablePaymentReminder = true
================================================================================

📥 Fetching bookings...

Found 45 bookings with enablePaymentReminder = true

32 bookings have row numbers 1-128

================================================================================

📋 Row 4: DYbgGkJzwlpdntKaHVyD
   Email: alexpaun.hair@yahoo.com
   Name: Alex Paun
   Package: Philippine Sunset
   Payment Plan: P4

  [DRY RUN] P1: Would create scheduled email (MARKED AS SENT)
  [DRY RUN] P2: Would create scheduled email (MARKED AS SENT)
  [DRY RUN] P3: Would create scheduled email (pending)
  [DRY RUN] P4: Would create scheduled email (pending)

   ✅ Created 4 scheduled emails
   📨 Marked 2 as sent: P1, P2

================================================================================
📊 SUMMARY
================================================================================
Total bookings found: 45
Eligible bookings (rows 1-128): 32
Successfully processed: 28
Skipped: 4
Errors: 0
Scheduled emails created: 95
Scheduled emails marked as sent: 23
================================================================================
```

## Logic Details

### When is an email marked as "sent"?

An email is marked with `status: "sent"` if the booking has a corresponding `pxScheduledEmailLink` field (e.g., `p1ScheduledEmailLink`, `p2ScheduledEmailLink`).

**Example:**
- Booking has `p1ScheduledEmailLink` and `p2ScheduledEmailLink` set
- Payment plan is P4
- Script will create 4 scheduled emails:
  - P1: marked as "sent" ✅
  - P2: marked as "sent" ✅
  - P3: pending
  - P4: pending

### What gets skipped?

The script skips:
1. Bookings without `enablePaymentReminder === true`
2. Bookings with row numbers outside 1-128
3. Bookings without payment plan
4. Bookings without email address
5. Payment terms that already have `pxScheduledEmailLink` set
6. Payment terms without scheduled reminder date

## Important Notes

⚠️ **No Initial Emails**: This script does NOT send initial payment reminder emails  
⚠️ **Always Dry Run First**: Review the output before running in production  
⚠️ **One-Time Migration**: This is meant to be run once to backfill missing data

## Troubleshooting

### Error: "You must specify either --dry-run or --production"

Make sure to include the flag:
```bash
npm run create-payment-reminders -- --dry-run
# or
npm run create-payment-reminders -- --production
```

### No bookings found

Check that:
1. Bookings have `enablePaymentReminder` set to `true`
2. Bookings have row numbers between 1-128
3. Firebase credentials are configured correctly

## File Location

Script: `client/functions/src/create-payment-reminders-script.ts`
