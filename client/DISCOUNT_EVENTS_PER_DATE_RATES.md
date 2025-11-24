# Per-Date Discount Rates Feature

## Overview

Updated the discount events system to support **different discount rates for different dates** within the same tour package.

## What Changed

### Before

- Each tour package in an event had a single discount rate
- That discount rate applied to ALL selected dates
- Structure: `Tour Package → Single Discount Rate → Multiple Dates`

### After

- Each tour package can have different discount rates for each date
- Full flexibility to customize pricing per departure date
- Structure: `Tour Package → Multiple (Date + Discount Rate) pairs`

## Data Structure

### Old Structure (Deprecated)

```typescript
interface DiscountEventItem {
  tourPackageId: string;
  tourPackageName: string;
  originalCost: number;
  discountRate: number; // Single rate for all dates
  discountedCost: number; // Single discounted price
  dates: string[]; // Array of date strings
}
```

### New Structure

```typescript
interface DateDiscount {
  date: string; // ISO date string (YYYY-MM-DD)
  discountRate: number; // Discount % for this specific date
  discountedCost: number; // Calculated discounted price
}

interface DiscountEventItem {
  tourPackageId: string;
  tourPackageName: string;
  originalCost: number;
  dateDiscounts: DateDiscount[]; // Each date has its own discount
}
```

## UI Changes

### Creating/Editing Events

1. Select a tour package
2. Available dates are shown with checkboxes
3. When you select a date, a discount rate input appears next to it
4. Each date can have a different discount rate (0-100%)
5. The discounted price is calculated and shown in real-time

### Existing Events Display

- Shows total number of dates with discounts
- Displays average discount rate across all dates for quick reference
- Format: `Tour Name - 3 dates (avg 15% off)`

## Migration

If you have existing discount events, run the migration script:

```bash
cd client
npx ts-node migrations/020-migrate-discount-events-structure.ts
```

The migration will:

- Convert old structure to new structure automatically
- Apply the original discount rate to all dates
- Skip events that are already migrated
- Show progress and summary

## Example Use Case

**Black Friday Sale - India Discovery Tour**

- Nov 18, 2025: 20% off (£799.20)
- Nov 25, 2025: 15% off (£849.15)
- Dec 2, 2025: 10% off (£899.10)

This allows you to:

- Offer bigger discounts on less popular dates
- Create tiered pricing based on demand
- Run flash sales on specific dates
- Have flexible pricing strategies

## Files Modified

1. **`src/services/discount-events-service.ts`**

   - Updated `DiscountEventItem` interface
   - Added `DateDiscount` interface

2. **`src/app/tours/DiscountedToursTab.tsx`**

   - Complete refactor to support per-date discounts
   - New UI with discount rate input per date
   - Real-time price calculation
   - Improved visual feedback

3. **`migrations/020-migrate-discount-events-structure.ts`** (NEW)
   - Automatic migration script
   - Converts old format to new format
   - Safe to run multiple times

## Testing

1. Create a new discount event
2. Add a tour package with multiple dates
3. Set different discount rates for different dates
4. Save and verify
5. Edit the event and verify rates are preserved
6. Check existing events display correctly

## Notes

- The migration preserves all existing data
- Old events will have the same discount rate applied to all dates initially
- You can edit them to set different rates per date
- The UI shows the average discount rate in the events list for quick reference
