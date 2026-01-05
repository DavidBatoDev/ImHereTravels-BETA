# Abandoned Payments Cleanup Function

## Overview

The `cleanupAbandonedPayments` Cloud Function automatically removes stale `stripePayments` documents to prevent database bloat from incomplete booking attempts.

## Schedule

- **Runs:** Daily at 2:00 AM UTC
- **Cron Expression:** `0 2 * * *`

## What It Cleans

The function deletes documents that meet ALL of the following criteria:

1. **Status:** `reserve_pending` or `pending`
2. **Age:** Created more than 7 days ago
3. **No Booking:** No associated booking document (or `booking.documentId` is empty/`"PENDING"`)
4. **Not Recently Updated:** Not updated within the last 24 hours

## Safety Checks

The function includes multiple safety checks to prevent accidental deletion:

- ✅ Skips documents with valid `booking.documentId`
- ✅ Skips documents with status other than `reserve_pending`/`pending`
- ✅ Skips documents updated within the last 24 hours
- ✅ Uses Firestore batch operations (max 500 per batch)
- ✅ Creates audit logs in `cleanup-logs` collection

## Deployment

The function is automatically deployed when you deploy Cloud Functions:

```bash
firebase deploy --only functions:cleanupAbandonedPayments
```

## Monitoring

### Check Logs

View function execution logs in Firebase Console:

```
Functions > cleanupAbandonedPayments > Logs
```

Or via CLI:

```bash
firebase functions:log --only cleanupAbandonedPayments
```

### Audit Trail

Review cleanup history in Firestore:

```
Collection: cleanup-logs
Filter: type == "abandoned-payments"
```

Each log entry contains:

- `deletedCount`: Number of documents deleted
- `skippedCount`: Number of documents skipped
- `totalProcessed`: Total documents evaluated
- `cutoffDate`: The 7-day cutoff timestamp
- `timestamp`: When the cleanup ran
- `error`: Error message (if cleanup failed)

## Example Log Output

```
🧹 Starting cleanup of abandoned payments...
📅 Cutoff date: 2025-12-05T02:00:00.000Z
🔍 Found 15 potential abandoned payments
⏭️ Skipping abc123: has booking document xyz789
🗑️ Deleting abandoned payment def456 (created: 2025-11-28T10:30:00.000Z)
🗑️ Deleting abandoned payment ghi789 (created: 2025-11-30T14:45:00.000Z)
✅ Cleanup complete: 12 deleted, 3 skipped
```

## Manual Execution

You can manually trigger the function via Firebase Console:

1. Go to **Functions** > `cleanupAbandonedPayments`
2. Click **Test function**
3. Leave event data empty (uses current date/time)
4. Click **Run function**

Or via gcloud CLI:

```bash
gcloud functions call cleanupAbandonedPayments --region=us-central1
```

## Configuration

To modify the cleanup criteria, edit `functions/src/scheduled-cleanup-abandoned-payments.ts`:

### Change Retention Period

```typescript
// Current: 7 days
const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(
  now.toMillis() - 7 * 24 * 60 * 60 * 1000
);

// Example: 14 days
const fourteenDaysAgo = admin.firestore.Timestamp.fromMillis(
  now.toMillis() - 14 * 24 * 60 * 60 * 1000
);
```

### Change Schedule

```typescript
// Current: Daily at 2 AM UTC
.schedule("0 2 * * *")

// Example: Every Sunday at 3 AM UTC
.schedule("0 3 * * 0")

// Example: Every 6 hours
.schedule("0 */6 * * *")
```

## Troubleshooting

### Function Not Running

1. Check function deployment status:

   ```bash
   firebase functions:list
   ```

2. Verify schedule is active:

   ```bash
   firebase functions:config:get
   ```

3. Check for errors in logs:
   ```bash
   firebase functions:log --only cleanupAbandonedPayments --limit 50
   ```

### Documents Not Being Deleted

Common reasons:

- Documents are less than 7 days old
- Documents have `booking.documentId` set
- Documents were updated within last 24 hours
- Status is not `reserve_pending` or `pending`

Check the logs for `⏭️ Skipping` messages to see why specific documents were skipped.

## Related Documentation

- [Stripe Payment Document Structure](../STRIPE_PAYMENT_STRUCTURE_MIGRATION.md)
- [Booking Creation Flow](../BOOKING_CREATION_FLOW.md)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
