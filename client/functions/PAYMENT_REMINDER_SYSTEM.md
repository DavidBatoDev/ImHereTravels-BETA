# Payment Reminder System Implementation

## Overview

The Payment Reminder System automates the process of sending payment reminders to customers based on their payment plans. When the "Enable Payment Reminder" checkbox is checked on a booking, the system automatically sends an initial summary email and schedules reminder emails for each payment term (P1-P4).

## Architecture

### Components

1. **Firestore Trigger** (`payment-reminder-trigger.ts`)

   - Listens for changes to booking documents
   - Detects when `enablePaymentReminder` changes from `false` to `true`
   - Sends initial summary email
   - Creates scheduled reminder emails

2. **Scheduled Email Processor** (`scheduled-emails.ts`)

   - Cloud Scheduler function that runs daily at 9 AM
   - Processes pending scheduled emails
   - Sends payment reminders via Gmail API
   - Updates booking documents with sent email links

3. **Email Template Service** (`email-template-service.ts`)

   - Processes Nunjucks templates with variables
   - Supports conditional logic and loops

4. **Gmail API Service** (`gmail-api-service.ts`)
   - Handles OAuth2 authentication
   - Sends emails via Gmail API
   - Returns message IDs for tracking

## How It Works

### Step 1: Booking Setup

An admin creates or edits a booking and fills in:

- **Payment Plan**: P1, P2, P3, or P4 (required)
- **Payment Method**: Credit Card, Bank Transfer, Cash, or PayPal (required)
- **Payment Terms**: For each applicable term (P1-P4):
  - Amount
  - Due Date
  - Scheduled Reminder Date (typically 3 days before due date)

### Step 2: Enable Reminders

When the admin checks the **"Enable Payment Reminder"** checkbox:

1. The Firestore trigger `onPaymentReminderEnabled` fires
2. System validates that Payment Plan and Method are filled
3. System checks if initial email was already sent (prevents duplicates)

### Step 3: Initial Email

The trigger immediately sends an initial summary email containing:

- Payment plan and method
- Complete payment schedule table with all terms
- Amounts, due dates, and payment status
- Remaining balance
- Confirmation that reminders are enabled

The email link is stored in the **"Sent Initial Reminder Link"** column.

### Step 4: Schedule Reminders

For each applicable payment term (based on payment plan):

- System checks if a "Scheduled Reminder Date" exists
- System checks if an email was already scheduled (prevents duplicates)
- Creates a document in the `scheduledEmails` collection with:
  - Recipient email address
  - Subject line (dynamically generated)
  - HTML content (processed from template)
  - Scheduled send time
  - Template variables for rendering
  - Status: "pending"
  - Metadata: bookingId, emailType, templateId

A placeholder is stored in the **"Px Scheduled Email Link"** column (e.g., "Scheduled: doc_id").

### Step 5: Automatic Sending

Every day at 9 AM (Asia/Singapore timezone):

1. `processScheduledEmails` Cloud Scheduler function runs
2. Queries for pending emails where `scheduledFor <= now`
3. For each email:
   - Sends via Gmail API
   - Updates `scheduledEmails` document with "sent" status
   - Updates booking's "Px Scheduled Email Link" with actual Gmail link
   - Logs success/failure

If sending fails:

- Increments attempt counter
- Retries up to `maxAttempts` (default: 3)
- Marks as "failed" if max attempts reached

## Subject Line Logic

Subject lines are dynamically generated based on payment plan and term:

### P1 (Single Payment)

- P1: **"Reminder – Your Final Installment for {Tour} is Due on {Date}"**

### P2 (Two Payments)

- P1: **"Your 1st Installment for {Tour} is Due on {Date}"**
- P2: **"Reminder – Your Final Installment for {Tour} is Due on {Date}"**

### P3 (Three Payments)

- P1: **"Your 1st Installment for {Tour} is Due on {Date}"**
- P2: **"Reminder – Your 2nd Installment for {Tour} is Due on {Date}"**
- P3: **"Reminder – Your Final Installment for {Tour} is Due on {Date}"**

### P4 (Four Payments)

- P1: **"Your 1st Installment for {Tour} is Due on {Date}"**
- P2: **"Reminder – Your 2nd Installment for {Tour} is Due on {Date}"**
- P3: **"Reminder – Your 3rd Installment for {Tour} is Due on {Date}"**
- P4: **"Reminder – Your Final Installment for {Tour} is Due on {Date}"**

## Email Template

The system uses the "Scheduled Reminder Email" template (ID: `GEB3llGzftDaWRFXj8qz`) stored in the `emailTemplates` collection.

### Template Variables

The following variables are passed to the template:

```javascript
{
  fullName: "Customer Name",
  tourPackage: "Tour Package Name",
  paymentMethod: "Credit Card",
  paymentTerm: "P1", // P1, P2, P3, or P4
  amount: "£500.00",
  dueDate: "2025-11-15",
  bookingId: "TR-EC-20250712-JD-01",
  tourDate: "2025-12-01",
  paid: "£1500.00",
  remainingBalance: "£500.00",
  totalAmount: "£2000.00",
  showTable: true, // false for P1 only
  termData: [
    {
      term: "P1",
      amount: "£500.00",
      dueDate: "2025-10-01",
      datePaid: "2025-09-28"
    },
    {
      term: "P2",
      amount: "£500.00",
      dueDate: "2025-11-01",
      datePaid: ""
    }
    // ... more terms
  ]
}
```

## Firestore Collections

### `bookings`

Stores booking data with dynamic fields based on `bookingSheetColumns`.

Key fields:

- Column ID for "Enable Payment Reminder"
- Column IDs for "Payment Plan", "Payment Method"
- Column IDs for "P1/P2/P3/P4 Amount", "Due Date", "Scheduled Reminder Date"
- Column IDs for "P1/P2/P3/P4 Scheduled Email Link"
- Column ID for "Sent Initial Reminder Link"

### `bookingSheetColumns`

Defines the schema for booking columns.

Structure:

```typescript
{
  id: string; // Column ID (used as field key in bookings)
  columnName: string; // Display name
  dataType: string; // date, currency, boolean, etc.
  // ... other metadata
}
```

### `scheduledEmails`

Stores scheduled emails to be sent.

Structure:

```typescript
{
  to: string;
  subject: string;
  htmlContent: string;
  from: string;
  scheduledFor: Timestamp;
  status: "pending" | "sent" | "failed" | "cancelled";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  attempts: number;
  maxAttempts: number;
  messageId?: string; // Gmail message ID after sending
  emailType: "payment-reminder";
  bookingId: string; // Reference to booking
  templateId: string;
  templateVariables: Record<string, any>;
}
```

### `emailTemplates`

Stores email templates with Nunjucks syntax.

Structure:

```typescript
{
  id: string; // GEB3llGzftDaWRFXj8qz for scheduled reminders
  name: string;
  subject: string;
  content: string; // HTML with Nunjucks variables
  variables: string[]; // List of expected variables
  status: "active" | "draft";
  // ... metadata
}
```

## Error Handling

The system includes comprehensive error handling:

### Payment Reminder Trigger

- **Missing Payment Plan/Method**: Logs warning and exits gracefully
- **Missing Email Address**: Logs warning and exits
- **Duplicate Initial Email**: Checks for existing link and skips if found
- **Initial Email Failure**: Logs error but continues with scheduling
- **Scheduled Email Creation Failure**: Logs error for that term but continues with others
- **Duplicate Scheduled Email**: Checks for existing link and skips if found

### Scheduled Email Processor

- **Email Sending Failure**:
  - Increments attempt counter
  - Retries up to maxAttempts (default: 3)
  - Marks as "failed" if max reached
  - Stores error message
- **Booking Update Failure**: Logs error but marks email as sent
- **Template Processing Error**: Falls back to simple HTML

## Testing

### Local Testing

1. **Start Firebase Emulator**:

   ```bash
   cd client/functions
   npm run serve
   ```

2. **Create Test Booking**:

   - Set Payment Plan to "P2"
   - Set Payment Method to "Credit Card"
   - Fill in P1 and P2 amounts and due dates
   - Set scheduled reminder dates

3. **Enable Reminders**:

   - Check "Enable Payment Reminder" checkbox
   - Monitor Firebase Functions logs for trigger execution

4. **Verify Initial Email**:

   - Check that initial email was sent
   - Verify "Sent Initial Reminder Link" is populated

5. **Verify Scheduled Emails**:

   - Check `scheduledEmails` collection
   - Verify two documents created (P1 and P2)
   - Verify "Px Scheduled Email Link" columns contain "Scheduled: {id}"

6. **Test Scheduled Processor**:
   - Wait for 9 AM or manually trigger the function
   - Verify emails are sent
   - Verify booking updated with Gmail links

### Production Deployment

1. **Deploy Functions**:

   ```bash
   firebase deploy --only functions
   ```

2. **Verify Cloud Scheduler**:

   - Go to Firebase Console → Functions → Logs
   - Check that `processScheduledEmails` runs daily at 9 AM
   - Verify no errors in logs

3. **Monitor Scheduled Emails**:
   - Query `scheduledEmails` collection
   - Filter by status: "pending", "sent", "failed"
   - Check attempt counts and error messages

## Monitoring & Maintenance

### Key Metrics

- Number of scheduled emails created per day
- Success rate of email sending
- Failed emails requiring manual intervention
- Average time from scheduling to sending

### Firebase Console Queries

**Pending Emails**:

```javascript
scheduledEmails
  .where("status", "==", "pending")
  .where("scheduledFor", "<=", new Date())
  .orderBy("scheduledFor", "asc");
```

**Failed Emails**:

```javascript
scheduledEmails.where("status", "==", "failed").orderBy("updatedAt", "desc");
```

**Emails for Specific Booking**:

```javascript
scheduledEmails
  .where("bookingId", "==", "booking_id_here")
  .orderBy("scheduledFor", "asc");
```

### Logs to Monitor

- "✅ Payment reminder setup completed successfully"
- "✅ Created scheduled email for P1/P2/P3/P4"
- "✅ Initial email sent successfully"
- "❌ Error in payment reminder trigger"
- "❌ Error sending scheduled email"

## Future Enhancements

Potential improvements:

1. **Google Calendar Integration**: Create calendar events for payment due dates
2. **SMS Reminders**: Send SMS in addition to email
3. **Reminder Logs Sheet**: Create a Firestore collection for audit trail
4. **Custom Reminder Timing**: Allow admins to set custom reminder intervals
5. **Payment Confirmation**: Automatically send confirmation when payment received
6. **Overdue Reminders**: Send additional reminders for overdue payments
7. **Template Customization**: Allow per-booking template selection
8. **Bulk Operations**: Enable/disable reminders for multiple bookings at once

## Troubleshooting

### Initial Email Not Sent

- Check Firebase Functions logs for errors
- Verify Payment Plan and Method are filled
- Verify Email Address is valid
- Check Gmail API quotas

### Scheduled Emails Not Created

- Check that Scheduled Reminder Date columns are filled
- Verify scheduled email links are empty (not "Scheduled: {id}")
- Check Firebase Functions logs

### Scheduled Emails Not Sending

- Verify Cloud Scheduler is running (check Firebase Console)
- Check `scheduledFor` timestamp is in the past
- Verify email status is "pending"
- Check Gmail API quotas
- Review error messages in `scheduledEmails` documents

### Wrong Subject Lines

- Verify Payment Plan value matches expected (P1, P2, P3, P4)
- Check that term values are correct (P1, P2, P3, P4)
- Review subject line generation logic in `payment-reminder-trigger.ts`

### Booking Not Updated After Sending

- Check Firebase Functions logs for booking update errors
- Verify column exists: "Px Scheduled Email Link"
- Check Firestore permissions

## Support

For issues or questions:

1. Review Firebase Functions logs
2. Check this documentation
3. Review the AppScript implementation for comparison
4. Contact the development team

---

**Last Updated**: October 28, 2025  
**Version**: 1.0.0
