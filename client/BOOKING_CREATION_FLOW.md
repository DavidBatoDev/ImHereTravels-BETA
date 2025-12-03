# Booking Creation Flow

This document explains the complete flow of how bookings are created in the system when a customer completes the reservation booking form.

## Overview

The booking creation process involves 3 steps:

1. **Step 1**: Customer fills out the reservation form
2. **Step 2**: Customer pays the reservation fee (dynamic, based on tour package) → Booking document created
3. **Step 3**: Customer selects payment plan → Booking updated with payment details → Notification sent

> **Note**: The reservation fee is **dynamic** and varies per tour package. It is NOT a fixed £250 - it depends on the tour package's configured reservation fee amount.

---

## Step 1: Form Submission

**Location**: `/reservation-booking-form/page.tsx`

Customer fills out:

- Personal information (name, email, phone)
- Tour package selection
- Tour date
- Number of travelers
- Additional details

At this point, no booking or payment document exists yet.

---

## Step 2: Reservation Fee Payment

### 2.1 Payment Initialization

**Location**: `/api/stripe-payments/init-payment/route.ts`

When customer clicks "Pay Now":

1. Frontend calls `/api/stripe-payments/init-payment` with `amountGBP` (the tour's reservation fee)
2. API creates a Stripe PaymentIntent for the dynamic amount
3. API creates a `stripePayments` document with:
   ```typescript
   {
     bookingId: "unique-booking-id",
     status: "pending",
     type: "reservationFee",
     amount: 35000,        // Amount in cents (e.g., £350)
     amountGBP: 350,       // Amount in GBP (dynamic per tour)
     customerEmail: "customer@example.com",
     tourPackageId: "...",
     tourDate: Timestamp,
     // ... other form data
   }
   ```

> **Important**: The `amountGBP` field stores the actual reservation fee for this tour package.

### 2.2 Payment Confirmation (Webhook)

**Location**: `/api/stripe-payments/webhook/route.ts`

When Stripe confirms payment succeeded:

1. Stripe sends `payment_intent.succeeded` webhook
2. Webhook finds the matching `stripePayments` document
3. Updates status to `"succeeded"`
4. **Creates booking document** in `bookings` collection:

```typescript
// Booking created with:
{
  // Identity fields
  bookingId: "unique-booking-id",
  bookingCode: "TP25001",  // Generated from tour + year + sequence

  // Traveler info
  travelerName: "John Doe",
  travellerInitials: "JD",
  email: "john@example.com",

  // Tour info
  tourPackageName: "Premium Package",
  tourDate: Timestamp,
  numberOfTravelers: 2,

  // Pricing (reservation fee is dynamic from stripePayments.amountGBP)
  originalTourCost: 2500,
  discountedTourCost: null,
  reservationFee: 350,     // Dynamic! From paymentData.amountGBP

  // Status
  bookingStatus: "reserve_paid",
  paymentProgress: "0%",

  // Tags
  tags: ["auto"],  // Marks as auto-created from form

  // Timestamps
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
}
```

5. Stores `bookingDocumentId` in the `stripePayments` document

### Flow Diagram - Step 2

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Customer      │     │   Stripe API     │     │  Firebase       │
│   Browser       │     │                  │     │  (Firestore)    │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │  1. Click Pay Now     │                        │
         │──────────────────────>│                        │
         │                       │                        │
         │                       │  2. Create PaymentIntent
         │                       │<───────────────────────│
         │                       │                        │
         │  3. Show Payment Form │                        │
         │<──────────────────────│                        │
         │                       │                        │
         │  4. Enter Card Details│                        │
         │──────────────────────>│                        │
         │                       │                        │
         │                       │  5. Payment Succeeded  │
         │                       │  (Webhook)             │
         │                       │───────────────────────>│
         │                       │                        │
         │                       │  6. Create Booking Doc │
         │                       │                        │
         │  7. Success!          │                        │
         │<──────────────────────│                        │
         │                       │                        │
```

---

## Step 3: Payment Plan Selection

### 3.1 Plan Selection UI

**Location**: `/reservation-booking-form/page.tsx`

After successful payment, customer sees available payment plans:

- **Full Payment** (48hrs) - Pay remaining balance immediately
- **P1** - Single installment on the 2nd of month
- **P2** - Two installments
- **P3** - Three installments
- **P4** - Four installments

### 3.2 Confirm Booking

**Location**: `/api/stripe-payments/select-plan/route.ts`

When customer clicks "Confirm Booking":

1. Frontend calls `/api/stripe-payments/select-plan` with:

   ```typescript
   {
     paymentDocId: "stripe-payment-doc-id",
     selectedPaymentPlan: "p2_two_installments",
     paymentPlanDetails: { /* plan info */ }
   }
   ```

2. API fetches the `stripePayments` document
3. Gets `bookingDocumentId` from it
4. Fetches the booking document
5. Calculates all payment fields using `calculatePaymentPlanUpdate()`:

```typescript
// Payment plan update includes:
{
  paymentPlan: "P2",
  bookingStatus: "reserve_paid",
  paymentProgress: "0%",
  enablePaymentReminder: true,

  // Due dates (2nd of each eligible month)
  fullPaymentDueDate: null,  // Only for Full Payment
  p1DueDate: "2025-01-02",
  p2DueDate: "2025-02-02",
  p3DueDate: null,
  p4DueDate: null,

  // Installment amounts
  p1DueAmount: 1125,  // Half of remaining
  p2DueAmount: 1125,
  p3DueAmount: null,
  p4DueAmount: null,

  // Reminder dates (7 days before due)
  scheduledReminderDateP1: "2024-12-26",
  scheduledReminderDateP2: "2025-01-26",
  // ...
}
```

6. Updates the booking document with payment plan details
7. Updates `stripePayments` status to `"terms_selected"`

### 3.3 Notification Trigger

**Location**: `functions/src/on-stripe-payment-success.ts`

When `stripePayments.status` changes to `"terms_selected"`:

1. Cloud Function `onStripePaymentSuccess` triggers
2. Fetches booking details
3. Creates notification in `notifications` collection:

```typescript
{
  type: "payment_received",
  title: "New Booking Confirmed",
  body: "John Doe booked Premium Package (£350 reservation fee paid)",
  data: {
    bookingId: "...",
    bookingDocumentId: "...",
    travelerName: "John Doe",
    tourPackageName: "Premium Package",
    amount: 35000,  // Dynamic amount in cents
    selectedPaymentPlan: "p2_two_installments",
  },
  targetType: "global",  // All admin users see this
  readBy: {},
  createdAt: Timestamp,
}
```

4. Updates `stripePayments` with `notificationSent: true`

### Flow Diagram - Step 3

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Customer      │     │   Next.js API    │     │  Cloud Function │
│   Browser       │     │                  │     │                 │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │  1. Select Plan       │                        │
         │──────────────────────>│                        │
         │                       │                        │
         │                       │  2. Calculate Payments │
         │                       │  (booking-calculations)│
         │                       │                        │
         │                       │  3. Update Booking     │
         │                       │  (with payment plan)   │
         │                       │                        │
         │                       │  4. Update stripePayments
         │                       │  status: "terms_selected"
         │                       │                        │
         │                       │                        │
         │                       │  5. Firestore Trigger  │
         │                       │───────────────────────>│
         │                       │                        │
         │                       │  6. Create Notification│
         │                       │                        │
         │  7. Booking Confirmed!│                        │
         │<──────────────────────│                        │
         │                       │                        │
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │   Admin Dashboard       │
                              │   🔔 New Booking!       │
                              └─────────────────────────┘
```

---

## Key Files

| File                                         | Purpose                                       |
| -------------------------------------------- | --------------------------------------------- |
| `/api/stripe-payments/init-payment/route.ts` | Creates PaymentIntent and stripePayments doc  |
| `/api/stripe-payments/webhook/route.ts`      | Handles Stripe webhooks, creates booking      |
| `/api/stripe-payments/select-plan/route.ts`  | Updates booking with payment plan             |
| `/lib/booking-calculations.ts`               | Pure functions for calculating booking fields |
| `functions/src/on-stripe-payment-success.ts` | Creates notifications on terms_selected       |
| `/reservation-booking-form/page.tsx`         | Customer-facing booking form                  |

---

## Database Collections

### `stripePayments` Collection

Tracks the payment lifecycle:

| Status           | Description                             |
| ---------------- | --------------------------------------- |
| `pending`        | PaymentIntent created, awaiting payment |
| `succeeded`      | Payment confirmed by Stripe             |
| `terms_selected` | Customer selected payment plan          |

### `bookings` Collection

Created after Step 2 payment succeeds. Contains:

- Traveler information
- Tour details
- Payment plan and due dates
- Installment amounts
- Reminder schedules
- Tags: `["auto"]` for form-created bookings

### `notifications` Collection

Created after Step 3 when terms are selected:

- Global notification to all admin users
- Contains booking summary
- `readBy` map tracks which users have read it

---

## Payment Calculation Logic

Located in `/lib/booking-calculations.ts`:

### Key Functions

1. **`getEligible2ndOfMonths()`** - Finds eligible payment dates (2nd of each month between reservation and tour)

2. **`generateInstallmentDueDates()`** - Assigns due dates based on payment plan:

   - Full Payment: 48 hours from reservation
   - P1: First eligible 2nd
   - P2: First two eligible 2nds
   - P3/P4: Spreads across available dates

3. **`calculateInstallmentAmounts()`** - Splits remaining balance:

   - Remaining = Tour Cost - Reservation Fee (dynamic) - Credits
   - Divides evenly across installments

4. **`calculateScheduledReminderDates()`** - Sets reminders 7 days before each due date

---

## Tags System

Bookings created from the form have `tags: ["auto"]`:

- Distinguishes from manually created bookings
- Can be used for filtering in admin dashboard
- Helps track conversion from form to booking
