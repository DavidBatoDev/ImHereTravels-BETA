# Stripe Payment Document Structure Migration

## Summary

Migrated the stripePayments Firestore collection from a flat structure to a nested, organized structure with proper grouping of related fields.

## Changes Made

### 1. Type Definitions (Already Complete)

- ✅ Created `src/types/stripe-payment.ts` with organized interfaces
- ✅ Exported types from `src/types/index.ts`

### 2. API Route Updates

#### `init-payment/route.ts`

- ✅ Imported `StripePaymentDocument` type
- ✅ Updated query to use nested paths: `customer.email`, `tour.packageId`, `payment.type`, `payment.status`
- ✅ Updated document creation to use nested structure:
  - `customer: { email }`
  - `booking: { id, documentId, type, groupSize, additionalGuests }`
  - `tour: { packageId, packageName, date }`
  - `payment: { stripeIntentId, clientSecret, amount, currency, status, type }`
  - `timestamps: { createdAt, updatedAt }`

#### `verify/route.ts`

- ✅ Updated query: `payment.stripeIntentId`
- ✅ Updated response: `payment.status`, `timestamps.paidAt`

#### `webhook/route.ts`

- ✅ Updated query: `payment.stripeIntentId`
- ✅ Updated field access throughout to use nested paths:
  - `payment.type`, `payment.status`
  - `tour.packageId`, `tour.packageName`, `tour.date`, `tour.returnDate`
  - `customer.email`, `customer.firstName`, `customer.lastName`
  - `booking.type`, `booking.groupCode`
- ✅ Updated document updates to use dot notation:
  - `"payment.status": "reserve_paid"`
  - `"booking.documentId": newBookingRef.id`
  - `"timestamps.paidAt": serverTimestamp()`

#### `create-booking/route.ts`

- ✅ Updated field access to use nested paths throughout
- ✅ Updated document updates to use dot notation:
  - `"booking.documentId"`
  - `"booking.id"`
  - `"timestamps.updatedAt"`

#### `select-plan/route.ts`

- ✅ Updated field access: `booking.documentId`
- ✅ Updated document updates to use dot notation:
  - `"payment.status": "terms_selected"`
  - `"payment.selectedPaymentPlan"`
  - `"payment.paymentPlanDetails"`
  - `"timestamps.confirmedAt"`
  - `"timestamps.updatedAt"`

### 3. Frontend Updates

#### `reservation-booking-form/page.tsx`

- ✅ Updated `createPlaceholder()` to create documents with nested structure
- ✅ Updated query in `checkExistingPaymentsAndMaybeProceed()`:
  - `where("customer.email", "==", email)`
  - `orderBy("timestamps.createdAt", "desc")`
- ✅ Updated query in `handleConfirmBooking()`:
  - `where("booking.id", "==", bookingId)`

### 4. Firestore Indexes

- ✅ Created `firestore.indexes.json` with composite indexes for:
  - `customer.email` + `timestamps.createdAt` (for existing payments query)
  - `customer.email` + `tour.packageId` + `payment.type` + `payment.status` (for reusing pending intents)

## New Document Structure

```typescript
{
  id: string;

  customer: {
    email: string;
    firstName?: string;
    lastName?: string;
    birthdate?: string;
    nationality?: string;
  };

  booking: {
    id: string;              // e.g., "PENDING" or "IMH-SWF-001"
    documentId: string;      // Firestore doc ID
    type?: string;           // "Single Booking", "Duo Booking", "Group Booking"
    groupSize?: number;
    groupCode?: string;
    additionalGuests?: Array<any>;
  };

  tour: {
    packageId: string;       // Reference to tourPackages collection
    packageName: string;
    date?: any;              // Tour start date
    returnDate?: string;
  };

  payment: {
    stripeIntentId?: string;
    clientSecret?: string;
    amount: number;          // in GBP (not pence)
    currency: string;        // "GBP"
    status: string;          // "pending", "reserve_pending", "reserve_paid", "succeeded", "failed", "terms_selected"
    type: string;            // "reservationFee", "fullPayment", etc.
    selectedPaymentPlan?: string;  // "full_payment", "P1", "P2", "P3", "P4"
    paymentPlanDetails?: any;
  };

  timestamps: {
    createdAt: any;
    updatedAt: any;
    paidAt?: string;
    failedAt?: string;
    confirmedAt?: any;
  };
}
```

## Migration Notes

1. **Backward Compatibility**: The type definitions include both `StripePaymentDocument` (nested) and `StripePaymentDocumentFlat` for backward compatibility, along with converter functions.

2. **Dot Notation for Updates**: Firestore updates use dot notation (e.g., `"payment.status"`) to update nested fields without overwriting the entire parent object.

3. **Index Requirements**: The new nested field queries require composite indexes. Deploy the indexes using:

   ```bash
   firebase deploy --only firestore:indexes
   ```

4. **Existing Documents**: Old documents with flat structure will no longer be queryable by the new code. Consider:
   - Running a migration script to convert existing documents
   - Or implementing a fallback query for old structure during transition period

## Next Steps

1. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
2. Test the complete booking flow in development
3. Consider migrating existing payment documents if any exist in production
4. Monitor for any query errors in production logs

## Files Modified

- `src/types/stripe-payment.ts` (created)
- `src/types/index.ts`
- `src/app/api/stripe-payments/init-payment/route.ts`
- `src/app/api/stripe-payments/verify/route.ts`
- `src/app/api/stripe-payments/webhook/route.ts`
- `src/app/api/stripe-payments/create-booking/route.ts`
- `src/app/api/stripe-payments/select-plan/route.ts`
- `src/app/reservation-booking-form/page.tsx`
- `firestore.indexes.json` (created)
