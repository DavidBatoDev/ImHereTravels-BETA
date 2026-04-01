# Reservation Booking Refactor Behavior Baseline

Purpose: protect existing behavior while splitting page.tsx into smaller modules.

## Step flow invariants

1. Step 1 -> Step 2 only after validate() passes and payment orchestration starts.
2. Step 2 -> Step 3 only after reserve fee payment is confirmed (reserve_paid path).
3. terms_selected restore path must keep booking in confirmed/complete flow.

## Booking type invariants

1. Single Booking has 1 traveler and no additional guest details required.
2. Duo Booking has exactly 1 additional guest entry.
3. Group Booking has groupSize total travelers and groupSize - 1 additional guests.

## Date and payment term invariants

1. Dates with daysBetween < 2 are invalid for installment planning.
2. Dates with 2 <= daysBetween < 30 require full payment in last-minute mode.
3. Dates farther out map to P1/P2/P3/P4 based on months until 30-day cutoff.

## Data-sync invariants

1. paymentid in URL has precedence over tour/tourdate query syncing.
2. sessionStorage key stripe*payment_doc*<email>\_<tourPackage> must continue to restore in-progress payment state.
3. Existing API request shapes for Stripe/payment-plan endpoints must not change.

## UI/validation invariants

1. Validation key naming stays stable (including guest-<index>-<field> keys).
2. Guest tab auto-focus on first guest validation error must remain intact.
3. Step indicators and completion badges must remain consistent with current transitions.
