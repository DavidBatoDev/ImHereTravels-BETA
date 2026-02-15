# Cancellation & Refund Scenarios Documentation

## Overview

This document describes the complete cancellation and refund policy for ImHereTravels (IHT). The system handles 12+ distinct scenarios with different refund calculations based on who initiated the cancellation, timing, payment type, and special circumstances.

## Key Principles

### 1. Reservation Fee (RF) Policy

**Reservation Fee is NEVER refundable when guest cancels.**

- ✅ **Refundable**: Only when IHT cancels the tour
- ❌ **Non-refundable**: All guest-initiated cancellations

### 2. Non-Reservation Amount (NRA)

For full payment bookings:

```
NRA = Full Payment Amount - Reservation Fee
```

The NRA is the portion subject to refund calculations in guest cancellations.

### 3. Timing Windows

Three timing buckets determine refund percentages:

| Window    | Days Before Tour | Refund % (NRA/Installments) |
| --------- | ---------------- | --------------------------- |
| Early     | ≥ 100 days       | 100% minus admin fee        |
| Mid-Range | 60-99 days       | 50% minus admin fee         |
| Late      | ≤ 59 days        | 0% (no refund)              |

### 4. Admin Fee

Admin fee = **10% of refundable amount**

**Exceptions** (admin fee = 0):

- IHT-initiated cancellations
- Supplier cost scenarios
- No refund scenarios

### 5. Supplier Costs

When supplier costs are committed, they override normal refund calculations:

```
Refundable Amount = (Calculated Refund) - Supplier Costs
```

If supplier costs exceed calculated refund, refundable amount = 0.

---

## Complete Scenario Matrix

### Guest Cancellations - Full Payment

#### Scenario 1: Guest Cancel Early (Full Payment)

**Trigger**: Guest cancels ≥100 days before tour, paid in full

**Refund Calculation**:

```
NRA = Full Payment - Reservation Fee
Admin Fee = NRA × 10%
Refundable = NRA - Admin Fee
Non-Refundable = RF + Admin Fee
```

**Example** (£2000 tour, £500 RF):

- NRA: £1500
- Admin Fee: £150
- Refundable: £1350
- Non-Refundable: £650 (RF £500 + Admin £150)

**Policy**: "100% of non-reservation amount minus admin fee"

---

#### Scenario 2: Guest Cancel Mid-Range (Full Payment)

**Trigger**: Guest cancels 60-99 days before tour, paid in full

**Refund Calculation**:

```
NRA = Full Payment - Reservation Fee
Admin Fee = NRA × 10%
Refundable = (NRA × 50%) - Admin Fee
Non-Refundable = RF + (NRA × 50%) + Admin Fee
```

**Example** (£2000 tour, £500 RF):

- NRA: £1500
- Admin Fee: £150
- Refundable: £600 (50% of £1500 - £150)
- Non-Refundable: £1400 (RF £500 + £750 + £150)

**Policy**: "50% of non-reservation amount minus admin fee"

---

#### Scenario 3: Guest Cancel Late (Full Payment)

**Trigger**: Guest cancels ≤59 days before tour, paid in full

**Refund Calculation**:

```
Refundable = 0
Non-Refundable = Full Payment (RF + NRA)
Admin Fee = 0
```

**Example** (£2000 tour):

- Refundable: £0
- Non-Refundable: £2000 (everything forfeited)

**Policy**: "No refund - All amounts forfeited"

---

### Guest Cancellations - Installment Plans

#### Scenario 4: Guest Cancel Early (Installment)

**Trigger**: Guest cancels ≥100 days before tour, on installment plan (P1-P4)

**Refund Calculation**:

```
Admin Fee = Paid Terms × 10%
Refundable = Paid Terms - Admin Fee
Non-Refundable = RF + Admin Fee
```

**Example** (P4 plan, paid P1 & P2 = £800, RF = £500):

- Paid Terms: £800
- Admin Fee: £80
- Refundable: £720
- Non-Refundable: £580 (RF £500 + Admin £80)

**Policy**: "100% of paid terms minus admin fee"

**Note**: RF is always non-refundable, only installment payments are refunded.

---

#### Scenario 5: Guest Cancel Mid-Range (Installment)

**Trigger**: Guest cancels 60-99 days before tour, on installment plan

**Refund Calculation**:

```
Admin Fee = Paid Terms × 10%
Refundable = (Paid Terms × 50%) - Admin Fee
Non-Refundable = RF + (Paid Terms × 50%) + Admin Fee
```

**Example** (P3 plan, paid P1 & P2 = £1200, RF = £500):

- Paid Terms: £1200
- Admin Fee: £120
- Refundable: £480 (50% of £1200 - £120)
- Non-Refundable: £1220 (RF £500 + £600 + £120)

**Policy**: "50% of paid terms minus admin fee"

---

#### Scenario 6: Guest Cancel Late (Installment)

**Trigger**: Guest cancels ≤59 days before tour, on installment plan

**Refund Calculation**:

```
Refundable = 0
Non-Refundable = RF + Paid Terms
Admin Fee = 0
```

**Example** (P2 plan, paid P1 = £600, RF = £500):

- Refundable: £0
- Non-Refundable: £1100 (everything forfeited)

**Policy**: "No refund - RF and paid terms forfeited"

---

### Installment Defaults (Missed Payments)

When a guest misses a payment deadline, it's treated as a cancellation.

#### Scenario 7: Installment Default Early

**Trigger**: Payment missed ≥100 days before tour

**Refund Calculation**: Same as Scenario 4 (Guest Cancel Early - Installment)

**Policy**: "Refund after admin fee deduction"

**Auto-Detection**:

- System checks if: `Current Date > Due Date + 7 days grace period`
- Auto-sets:
  - `reasonForCancellation`: "Installment Default - P{x}"
  - `cancellationRequestDate`: Due Date + 7 days
  - `cancellationInitiatedBy`: "Guest"

---

#### Scenario 8: Installment Default Mid-Range

**Trigger**: Payment missed 60-99 days before tour

**Refund Calculation**: Same as Scenario 5 (Guest Cancel Mid-Range - Installment)

**Policy**: "50% refund after admin fee deduction"

---

#### Scenario 9: Installment Default Late

**Trigger**: Payment missed ≤59 days before tour

**Refund Calculation**: Same as Scenario 6 (Guest Cancel Late - Installment)

**Policy**: "No refund"

---

### Special Scenarios

#### Scenario 10: Supplier Costs Committed

**Trigger**: Any cancellation where supplier costs have been incurred

**Refund Calculation**:

```
Base Refundable = Calculated per above scenarios
Supplier Costs = (manual entry by admin)
Admin Fee = 0 (supplier bears this cost)
Refundable = max(0, Base Refundable - Supplier Costs)
Non-Refundable = Total Paid - Refundable
```

**Example** (Early cancellation, £1350 calculated refund, £500 supplier costs):

- Base Refundable: £1350
- Supplier Costs: £500
- Admin Fee: £0
- Refundable: £850
- Non-Refundable: £1150

**Policy**: "Refund minus supplier costs (no admin fee)"

**Admin Action Required**: Manually enter supplier costs in `supplierCostsCommitted` field.

---

#### Scenario 11: Guest No-Show

**Trigger**: Guest doesn't attend tour (marked by admin after tour date)

**Refund Calculation**:

```
Refundable = 0
Non-Refundable = Total Paid
Admin Fee = 0
```

**Policy**: "No refund - Guest did not attend tour"

**Admin Action Required**: Check the "No-Show" checkbox after tour date.

---

#### Scenario 12: Tour Cancelled by IHT (Before Start)

**Trigger**: IHT cancels tour before tour start date

**Refund Calculation**:

```
Refundable = Total Paid (includes RF + all payments)
Non-Refundable = 0
Admin Fee = 0
```

**Alternative**: Issue Travel Credit (TC) equal to `Total Paid`

**Example** (£2000 paid):

- Refundable: £2000 (everything refunded)
- Travel Credit Option: £2000 TC for future booking

**Policy**: "100% refund including RF OR travel credit"

**Admin Action Required**:

1. Set `cancellationInitiatedBy` to "IHT"
2. Choose refund or issue travel credit

**Note**: RF IS refundable when IHT cancels - this is the ONLY scenario where RF is refunded.

---

#### Scenario 13: Tour Cancelled by IHT (After Start)

**Trigger**: IHT cancels tour after it has started

**Refund Calculation**:

```
Days Used = Days from start to cancellation
Days Total = Total tour duration
Used Portion = Days Used / Days Total
Unused Portion = 1 - Used Portion
Refundable = Total Paid × Unused Portion
Non-Refundable = Total Paid × Used Portion
Admin Fee = 0
```

**Alternative**: Issue Travel Credit (TC) equal to `Refundable`

**Example** (7-day tour, cancelled on day 3, £2000 paid):

- Used: 3/7 = 43%
- Unused: 57%
- Refundable: £1140
- Travel Credit Option: £1140 TC

**Policy**: "Partial refund for unused portion OR travel credit"

---

#### Scenario 14: Force Majeure

**Trigger**: Cancellation due to unforeseeable circumstances (natural disaster, war, pandemic, etc.)

**Refund Calculation**: **Case-by-case basis**

Admin reviews and decides:

- Full refund (including RF)
- Partial refund
- Travel credit
- Reschedule at no charge

**Detection**: System checks if `reasonForCancellation` contains "force majeure"

**Policy**: "Case-by-case (refund OR travel credit)"

**Admin Action Required**: Manual review and decision for each case.

---

## Decision Tree

```
Cancelled?
├─ No → No refund calculations
└─ Yes → Who cancelled?
    ├─ Guest
    │   ├─ No-Show? → No refund
    │   ├─ Supplier costs? → Refund minus supplier costs
    │   ├─ Force majeure? → Case-by-case
    │   └─ Payment type?
    │       ├─ Full Payment
    │       │   ├─ ≥100 days → 100% of NRA - admin
    │       │   ├─ 60-99 days → 50% of NRA - admin
    │       │   └─ ≤59 days → No refund
    │       └─ Installment
    │           ├─ ≥100 days → 100% of paid terms - admin
    │           ├─ 60-99 days → 50% of paid terms - admin
    │           └─ ≤59 days → No refund
    └─ IHT
        ├─ Before tour → 100% refund (inc. RF) OR TC
        ├─ After start → Unused portion refund OR TC
        └─ Force majeure → Case-by-case
```

---

## Field Mapping

### Required Fields for Scenario Detection

| Field                     | Source Column             | Purpose                         |
| ------------------------- | ------------------------- | ------------------------------- |
| `reasonForCancellation`   | Reason for Cancellation   | Triggers cancellation logic     |
| `cancellationRequestDate` | Cancellation Request Date | Timing calculations             |
| `cancellationInitiatedBy` | Cancellation Initiated By | Guest vs IHT logic              |
| `tourDate`                | Tour Date                 | Days before tour calculation    |
| `paymentPlan`             | Payment Plan              | Full vs Installment             |
| `paid`                    | Paid                      | Total amount paid               |
| `paidTerms`               | Paid Terms                | Installments only (excludes RF) |
| `reservationFee`          | Reservation Fee           | RF amount                       |
| `fullPaymentAmount`       | Full Payment Amount       | Full payment scenarios          |
| `fullPaymentDatePaid`     | Full Payment Date Paid    | Detect full payment             |
| `supplierCostsCommitted`  | Supplier Costs Committed  | Override refund                 |
| `isNoShow`                | No-Show                   | No-show detection               |

### Calculated Fields

| Field                  | Source Column         | Calculation                   |
| ---------------------- | --------------------- | ----------------------------- |
| `cancellationScenario` | Cancellation Scenario | Detected scenario with timing |
| `eligibleRefund`       | Eligible Refund       | Refund policy string          |
| `adminFee`             | Admin Fee             | 10% of refundable base        |
| `refundableAmount`     | Refundable Amount     | Amount to refund              |
| `nonRefundableAmount`  | Non Refundable Amount | Amount forfeited              |
| `travelCreditIssued`   | Travel Credit Issued  | TC amount (future feature)    |

---

## Admin Workflow

### For Guest Cancellations

1. Guest requests cancellation
2. Admin fills in:
   - ✅ `reasonForCancellation`: Guest's reason
   - ✅ `cancellationRequestDate`: Date of request
   - ✅ `cancellationInitiatedBy`: Select "Guest"
3. If supplier costs exist:
   - ✅ `supplierCostsCommitted`: Enter amount
4. System auto-calculates:
   - `cancellationScenario`
   - `eligibleRefund`
   - `adminFee`
   - `refundableAmount`
   - `nonRefundableAmount`
5. Admin reviews calculations
6. Process refund via payment system
7. Send cancellation email (auto-generated with breakdown)

### For IHT Cancellations

1. IHT determines tour must be cancelled
2. Admin fills in:
   - ✅ `reasonForCancellation`: IHT's reason (e.g., "Insufficient bookings")
   - ✅ `cancellationRequestDate`: Today's date
   - ✅ `cancellationInitiatedBy`: Select "IHT"
3. System auto-calculates:
   - `refundableAmount`: Full amount (includes RF)
   - `travelCreditIssued`: Shows TC option
4. Admin chooses: Refund OR Issue Travel Credit
5. Process refund OR create TC record (manual for now)
6. Send apology email with refund/TC details

### For No-Shows

1. Tour date passes, guest doesn't attend
2. Admin marks:
   - ✅ `isNoShow`: Check the box
   - ✅ `reasonForCancellation`: "No-show"
   - ✅ `cancellationRequestDate`: Tour date
   - ✅ `cancellationInitiatedBy`: Select "Guest"
3. System auto-calculates:
   - `refundableAmount`: 0
   - `nonRefundableAmount`: Total paid
4. Update booking status to "No Show"
5. No refund processed

### For Installment Defaults

**Automated Detection** (future enhancement):

- System checks daily for overdue payments
- If `P{x} Due Date + 7 days < Today` AND `P{x} Date Paid` is empty:
  - Auto-set `reasonForCancellation`: "Installment Default - P{x}"
  - Auto-set `cancellationRequestDate`: Due Date + 7 days
  - Auto-set `cancellationInitiatedBy`: "Guest"
  - Send warning email to guest
  - Flag for admin review

**Manual Process** (current):

1. Admin notices missed payment
2. Admin fills in cancellation fields manually
3. System calculates refund
4. Admin contacts guest to inform

---

## Travel Credit System (Future Feature)

**Status**: Planned but not yet implemented

**Design**:

- `travelCreditIssued` column shows TC amount when applicable
- Display: "TC: £{amount} (not yet implemented)"
- Future features:
  - Create `travelCredits` collection in Firestore
  - Track TC balance per customer
  - Allow TC redemption during booking
  - TC expiration policy (e.g., 12 months)
  - Transfer/gift TCs

**Current Workaround**:

- Admin manually notes TC in customer record
- Apply as `manualCredit` on future booking
- Track in spreadsheet/CRM

---

## Example Walkthrough

### Example 1: Standard Guest Cancellation (Installment, Early)

**Scenario**:

- Tour Package: "Mystical Bali 7D/6N" - £3000
- Reservation Fee: £500 (paid)
- Payment Plan: P4 (4 installments of £625 each)
- Paid: P1 (£625), P2 (£625) = £1250 in installments
- Total Paid: £500 (RF) + £1250 (installments) = £1750
- Tour Date: 2026-08-15
- Cancellation Date: 2026-04-10 (127 days before tour)
- Initiated By: Guest

**Calculation**:

1. **Scenario Detection**: "Guest Cancel Early (Installment)"
2. **Timing**: 127 days → Early (≥100 days)
3. **Eligible Refund**: "100% of paid terms minus admin fee"
4. **Admin Fee**: £1250 × 10% = £125
5. **Refundable Amount**: £1250 - £125 = £1125
6. **Non-Refundable Amount**: £500 (RF) + £125 (admin) = £625
7. **Verification**: £1125 + £625 = £1750 ✅

**Guest Receives**: £1125 refund
**IHT Retains**: £625 (£500 RF + £125 admin fee)

---

### Example 2: IHT Cancellation (Before Tour)

**Scenario**:

- Same booking as Example 1
- Total Paid: £1750
- Tour Date: 2026-08-15
- Cancellation Date: 2026-07-20 (26 days before tour)
- Initiated By: IHT
- Reason: "Insufficient bookings, tour cancelled"

**Calculation**:

1. **Scenario Detection**: "Tour Cancelled by IHT (Before Start)"
2. **Eligible Refund**: "100% refund including RF OR travel credit"
3. **Admin Fee**: £0 (IHT pays)
4. **Refundable Amount**: £1750 (everything)
5. **Non-Refundable Amount**: £0
6. **Travel Credit Option**: £1750 TC

**Guest Receives**: £1750 refund OR £1750 travel credit
**IHT Retains**: £0 (full refund, IHT's responsibility)

**Note**: RF IS refunded - this is the only scenario where RF is refundable.

---

### Example 3: Supplier Costs Override

**Scenario**:

- Same as Example 1 (early cancellation)
- Supplier Costs: £800 (non-refundable hotel deposit)

**Calculation**:

1. **Base Calculation** (without supplier costs):
   - Paid Terms: £1250
   - Base Refundable: £1250 - £125 = £1125
2. **Supplier Cost Override**:
   - Admin Fee: £0 (supplier bears cost)
   - Refundable: £1125 - £800 = £325
   - Non-Refundable: £1750 - £325 = £1425

**Guest Receives**: £325 refund
**IHT Retains**: £1425 (£800 to supplier, £500 RF, £125 for admin costs)

---

## Testing Scenarios

Use these test cases to verify the implementation:

### Test Set 1: Guest Cancellations (Full Payment)

1. ✅ £2000 full payment, 120 days before → £1350 refund
2. ✅ £2000 full payment, 75 days before → £600 refund
3. ✅ £2000 full payment, 40 days before → £0 refund

### Test Set 2: Guest Cancellations (Installment)

4. ✅ P4, paid £1250, 110 days before → £1125 refund
5. ✅ P3, paid £1200, 65 days before → £480 refund
6. ✅ P2, paid £600, 50 days before → £0 refund

### Test Set 3: Special Scenarios

7. ✅ Supplier costs £500, otherwise £1350 refund → £850 refund
8. ✅ No-show after tour date → £0 refund
9. ✅ IHT cancels before tour, £1750 paid → £1750 refund
10. ✅ Installment default 150 days before → same as early cancellation

---

## Change Log

### Version 1.0 (Current Implementation)

- ✅ Basic refund logic (100%/50%/0%)
- ✅ Admin fee calculation (10% of paid terms)
- ✅ RF always non-refundable for guest cancellations
- ❌ No distinction between full payment and installment
- ❌ No IHT cancellation handling
- ❌ No supplier cost override
- ❌ No no-show tracking

### Version 2.0 (This Update)

- ✅ Full scenario detection (12+ scenarios)
- ✅ IHT cancellation logic with RF refund
- ✅ Full payment vs installment distinction
- ✅ NRA calculation for full payments
- ✅ Supplier cost override
- ✅ No-show tracking
- ✅ Installment default detection (manual)
- ✅ Force majeure handling
- ✅ Travel credit field (placeholder)
- ✅ Comprehensive documentation

### Version 2.1 (Planned)

- ⏳ Automated installment default detection
- ⏳ Travel credit redemption system
- ⏳ Partial tour cancellation (after start) calculator
- ⏳ Bulk cancellation tools
- ⏳ Refund approval workflow
- ⏳ Integration with payment gateway for auto-refunds

---

## Support & Questions

For questions about cancellation scenarios, contact:

- **Business Logic**: Product/Operations Team
- **Technical Implementation**: Development Team
- **Policy Updates**: Management/Legal Team

**Last Updated**: February 10, 2026
**Document Version**: 2.0
**System Version**: 2.0
