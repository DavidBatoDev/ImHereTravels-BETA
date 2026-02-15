# Cancellation & Refund System - UAT Testing Guide

## Overview

This document provides comprehensive User Acceptance Testing (UAT) scenarios for the cancellation and refund system. Each test case includes setup instructions, steps to execute, and expected results.

---

## Test Prerequisites

### Setup Required Before Testing

1. **Test Booking Data**
   - Create test bookings with various payment structures
   - Ensure test tour dates are set 100+ days, 60-99 days, and <60 days from today
   - Have bookings with both Full Payment and Installment plans (P1-P4)

2. **Test Data Values**
   ```
   Tour Package Price: £2000
   Reservation Fee: £500
   P1 Payment: £400
   P2 Payment: £400
   P3 Payment: £400
   P4 Payment: £300 (balance)
   ```

3. **Access Requirements**
   - Admin access to Edit Booking Modal
   - Access to Cancellation tab in booking sheet
   - Ability to modify booking fields

---

## Test Scenarios

### Category 1: Guest Cancellations - Full Payment

#### Test Case 1.1: Guest Cancel Early (≥100 days) - Full Payment

**Objective**: Verify 100% refund minus admin fee for early guest cancellations with full payment

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Reservation Fee: £500
- Tour Date: 120 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Personal/medical reasons`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Guest Cancel Early (Full Payment)"
- ✅ **Eligible Refund**: "100% of non-reservation amount minus admin fee"
- ✅ **Refundable Amount**: £1,350
  - Calculation: (£2000 - £500) × 100% - £150 admin fee
- ✅ **Non-Refundable Amount**: £650
  - Calculation: £500 RF + £150 admin fee
- ✅ **Admin Fee**: £150 (10% of £1500 NRA)

**Validation Points**:
- [ ] Reservation Fee NOT included in refund
- [ ] Admin fee correctly calculated at 10%
- [ ] All calculated fields auto-update
- [ ] Scenario correctly detected

---

#### Test Case 1.2: Guest Cancel Mid-Range (60-99 days) - Full Payment

**Objective**: Verify 50% refund minus admin fee for mid-range guest cancellations

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Reservation Fee: £500
- Tour Date: 80 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Change of plans`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Guest Cancel Mid-Range (Full Payment)"
- ✅ **Eligible Refund**: "50% of non-reservation amount minus admin fee"
- ✅ **Refundable Amount**: £600
  - Calculation: (£2000 - £500) × 50% - £150 admin fee
- ✅ **Non-Refundable Amount**: £1,400
  - Calculation: £500 RF + £750 + £150 admin fee
- ✅ **Admin Fee**: £150

**Validation Points**:
- [ ] Only 50% of NRA refunded
- [ ] Reservation Fee forfeited
- [ ] Admin fee applied correctly
- [ ] Scenario matches timing window

---

#### Test Case 1.3: Guest Cancel Late (≤59 days) - Full Payment

**Objective**: Verify no refund for late guest cancellations

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Reservation Fee: £500
- Tour Date: 40 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Financial reasons`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Guest Cancel Late (Full Payment)"
- ✅ **Eligible Refund**: "No refund - All amounts forfeited"
- ✅ **Refundable Amount**: £0
- ✅ **Non-Refundable Amount**: £2,000
- ✅ **Admin Fee**: £0 (no admin fee when no refund)

**Validation Points**:
- [ ] Zero refund given
- [ ] All payments forfeited
- [ ] No admin fee charged
- [ ] Clear messaging about no refund

---

### Category 2: Guest Cancellations - Installment Plans

#### Test Case 2.1: Guest Cancel Early (≥100 days) - Installment

**Objective**: Verify 100% refund of paid terms minus admin fee

**Test Data**:
- Payment Type: P4 Installment Plan
- Paid Terms: P1 (£400) + P2 (£400) = £800
- Reservation Fee: £500
- Tour Date: 120 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Personal/medical reasons`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Verify booking shows installment payments paid (P1, P2)
9. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Guest Cancel Early (Installment)"
- ✅ **Eligible Refund**: "100% of paid terms minus admin fee"
- ✅ **Refundable Amount**: £720
  - Calculation: £800 paid terms - £80 admin fee
- ✅ **Non-Refundable Amount**: £580
  - Calculation: £500 RF + £80 admin fee
- ✅ **Admin Fee**: £80 (10% of £800 paid terms)

**Validation Points**:
- [ ] Only paid installments refunded (not future P3/P4)
- [ ] Reservation Fee NOT refunded
- [ ] Admin fee based on paid terms only
- [ ] Unpaid installments not considered

---

#### Test Case 2.2: Guest Cancel Mid-Range (60-99 days) - Installment

**Objective**: Verify 50% refund of paid terms minus admin fee

**Test Data**:
- Payment Type: P4 Installment Plan
- Paid Terms: P1 (£400) + P2 (£400) = £800
- Reservation Fee: £500
- Tour Date: 75 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Change of plans`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Guest Cancel Mid-Range (Installment)"
- ✅ **Eligible Refund**: "50% of paid terms minus admin fee"
- ✅ **Refundable Amount**: £320
  - Calculation: (£800 × 50%) - £80 admin fee
- ✅ **Non-Refundable Amount**: £980
  - Calculation: £500 RF + £400 + £80 admin fee
- ✅ **Admin Fee**: £80

**Validation Points**:
- [ ] Only 50% of paid terms refunded
- [ ] Admin fee still at 10%
- [ ] Calculations correct
- [ ] Timing bucket properly detected

---

#### Test Case 2.3: Guest Cancel Late (≤59 days) - Installment

**Objective**: Verify no refund for late installment cancellations

**Test Data**:
- Payment Type: P4 Installment Plan
- Paid Terms: P1 (£400) + P2 (£400) = £800
- Reservation Fee: £500
- Tour Date: 45 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Financial reasons`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Guest Cancel Late (Installment)"
- ✅ **Eligible Refund**: "No refund - All paid amounts forfeited"
- ✅ **Refundable Amount**: £0
- ✅ **Non-Refundable Amount**: £800
  - All paid amounts forfeited (£500 RF + £300 paid terms)
- ✅ **Admin Fee**: £0

**Validation Points**:
- [ ] Zero refund
- [ ] All paid amounts forfeited
- [ ] Unpaid installments not charged

---

### Category 3: Payment Default Scenarios

#### Test Case 3.1: Payment Default - Early (≥100 days)

**Objective**: Verify partial refund for payment defaults > 100 days before tour

**Test Data**:
- Payment Type: P4 Installment Plan
- Paid Terms: P1 (£400) only = £400
- Reservation Fee: £500
- P2 Deadline: Missed (overdue)
- Tour Date: 110 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Payment default/missed deadline`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Verify P2 deadline is past due
9. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Payment Default - Early"
- ✅ **Eligible Refund**: "Partial refund (80% of paid minus admin)"
- ✅ **Refundable Amount**: £288
  - Calculation: (£400 × 80%) - £32 admin fee
- ✅ **Non-Refundable Amount**: £612
  - Calculation: £500 RF + £80 + £32 admin fee
- ✅ **Admin Fee**: £32 (10% of refundable portion)

**Validation Points**:
- [ ] Reason contains "default" or "missed payment"
- [ ] 80% refund policy applied
- [ ] Admin fee calculated correctly
- [ ] Default penalty (20%) applied

---

#### Test Case 3.2: Payment Default - Mid-Range (60-99 days)

**Objective**: Verify reduced refund for mid-range payment defaults

**Test Data**:
- Payment Type: P4 Installment Plan
- Paid Terms: P1 (£400) + P2 (£400) = £800
- Reservation Fee: £500
- Tour Date: 70 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Payment default/missed deadline`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Payment Default - Mid-Range"
- ✅ **Eligible Refund**: "Minimal refund (40% of paid minus admin)"
- ✅ **Refundable Amount**: £288
  - Calculation: (£800 × 40%) - £32 admin fee
- ✅ **Non-Refundable Amount**: £1,012
  - Calculation: £500 RF + £480 + £32 admin fee
- ✅ **Admin Fee**: £32

**Validation Points**:
- [ ] 40% refund policy applied
- [ ] Penalty more severe than early default
- [ ] Reason triggers default logic
- [ ] Calculations accurate

---

#### Test Case 3.3: Payment Default - Late (≤59 days)

**Objective**: Verify no refund for late payment defaults

**Test Data**:
- Payment Type: P4 Installment Plan
- Paid Terms: P1 (£400) only
- Reservation Fee: £500
- Tour Date: 50 days from today
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Payment default/missed deadline`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Payment Default - Late"
- ✅ **Eligible Refund**: "No refund - All paid amounts forfeited"
- ✅ **Refundable Amount**: £0
- ✅ **Non-Refundable Amount**: £900
  - All paid (£500 RF + £400 P1)
- ✅ **Admin Fee**: £0

**Validation Points**:
- [ ] Complete forfeiture
- [ ] Default reason recognized
- [ ] Late timing enforced
- [ ] No admin fee (no refund)

---

### Category 4: IHT-Initiated Cancellations

#### Test Case 4.1: IHT Cancel - Full Payment (Any timing)

**Objective**: Verify 100% refund including Reservation Fee for IHT cancellations

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Reservation Fee: £500
- Tour Date: Any (60 days from today)
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `IHT` ⚠️ (KEY FIELD)
5. Set **Reason for Cancellation**: `IHT - Tour cancelled/unavailable`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "IHT Cancel (Full Payment)"
- ✅ **Eligible Refund**: "100% including Reservation Fee"
- ✅ **Refundable Amount**: £2,000 (FULL AMOUNT)
  - **INCLUDES Reservation Fee** ⭐
- ✅ **Non-Refundable Amount**: £0
- ✅ **Admin Fee**: £0 (no admin fee for IHT cancellations)

**Validation Points**:
- [ ] **Reservation Fee IS refunded** (only case where RF refunds)
- [ ] 100% refund regardless of timing
- [ ] No admin fee charged
- [ ] "IHT" initiated by correctly set
- [ ] Full amount returned to guest

---

#### Test Case 4.2: IHT Cancel - Installment (Any timing)

**Objective**: Verify 100% refund of paid terms + RF for IHT installment cancellations

**Test Data**:
- Payment Type: P4 Installment Plan
- Paid Terms: P1 (£400) + P2 (£400) = £800
- Reservation Fee: £500
- Tour Date: Any (90 days from today)
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `IHT`
5. Set **Reason for Cancellation**: `IHT - Insufficient bookings`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "IHT Cancel (Installment)"
- ✅ **Eligible Refund**: "100% of paid including Reservation Fee"
- ✅ **Refundable Amount**: £1,300
  - £500 RF + £800 paid terms
- ✅ **Non-Refundable Amount**: £0
- ✅ **Admin Fee**: £0

**Validation Points**:
- [ ] Reservation Fee refunded
- [ ] All paid installments refunded
- [ ] No admin fee
- [ ] Unpaid installments not charged/refunded

---

### Category 5: Special Circumstances

#### Test Case 5.1: Supplier Costs Override - Full Payment

**Objective**: Verify supplier costs reduce calculated refund

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Reservation Fee: £500
- Tour Date: 120 days from today (early)
- Cancellation Date: Today
- Supplier Costs: £800

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Personal/medical reasons`
6. Set **Supplier Costs Committed**: `800` ⚠️ (KEY FIELD)
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Supplier Costs Override (Full Payment)"
- ✅ **Eligible Refund**: "Calculated refund minus supplier costs (no admin fee)"
- ✅ **Refundable Amount**: £700
  - Would be £1500 (100% NRA) - £800 supplier costs
- ✅ **Non-Refundable Amount**: £1,300
  - £500 RF + £800 supplier costs
- ✅ **Admin Fee**: £0 (waived when supplier costs apply)

**Validation Points**:
- [ ] Supplier costs deducted from refund
- [ ] No admin fee charged
- [ ] Scenario correctly identified
- [ ] Time-based percentage ignored when costs present

---

#### Test Case 5.2: Supplier Costs Exceed Refund

**Objective**: Verify refund cannot go negative

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Reservation Fee: £500
- Tour Date: 80 days from today (mid-range)
- Cancellation Date: Today
- Supplier Costs: £1200

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Change of plans`
6. Set **Supplier Costs Committed**: `1200`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Supplier Costs Override (Full Payment)"
- ✅ **Eligible Refund**: "No refund - Supplier costs exceed calculated amount"
- ✅ **Refundable Amount**: £0
  - Would be £750 (50% NRA) but costs are £1200
  - Refund cannot be negative, so = £0
- ✅ **Non-Refundable Amount**: £2,000
  - All paid amounts forfeited
- ✅ **Admin Fee**: £0

**Validation Points**:
- [ ] Refund capped at £0 (not negative)
- [ ] All amounts forfeited
- [ ] Supplier costs recognition
- [ ] Admin fee not applied

---

#### Test Case 5.3: No-Show Scenario

**Objective**: Verify no-shows receive zero refund regardless of other factors

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Reservation Fee: £500
- Tour Date: 150 days from today (early)
- Cancellation Date: Tour date (guest didn't show)

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Tour date
4. Set **Cancellation Initiated By**: `Guest`
5. Set **Reason for Cancellation**: `Guest - Personal/medical reasons`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `checked` ⚠️ (KEY FIELD)
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "No-Show"
- ✅ **Eligible Refund**: "No refund - Guest failed to show"
- ✅ **Refundable Amount**: £0
- ✅ **Non-Refundable Amount**: £2,000
- ✅ **Admin Fee**: £0

**Validation Points**:
- [ ] No-show checkbox overrides all timing
- [ ] Zero refund enforced
- [ ] Would normally be 100% refund (early timing)
- [ ] No-show takes precedence

---

#### Test Case 5.4: Force Majeure - IHT Cancellation

**Objective**: Verify force majeure handling (100% refund OR travel credit)

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Reservation Fee: £500
- Tour Date: Any (75 days from today)
- Cancellation Date: Today

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Request Date**: Today's date
4. Set **Cancellation Initiated By**: `IHT`
5. Set **Reason for Cancellation**: `IHT - Force majeure (weather, safety, government restrictions)`
6. Set **Supplier Costs Committed**: `0`
7. Set **No-Show**: `unchecked`
8. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Force Majeure"
- ✅ **Eligible Refund**: "Case-by-case (refund OR travel credit)"
- ✅ **Refundable Amount**: £2,000 (if refund chosen)
  - OR Travel Credit of £2,000 (if TC chosen)
- ✅ **Non-Refundable Amount**: £0
- ✅ **Admin Fee**: £0
- ✅ **Travel Credit Issued**: (Manual field - admin decides)

**Validation Points**:
- [ ] Reason contains "force majeure"
- [ ] Full amount available
- [ ] Admin has option for refund OR TC
- [ ] Travel Credit Issued field available

---

### Category 6: Edge Cases & Data Validation

#### Test Case 6.1: Missing Required Fields

**Objective**: Verify system handles incomplete data gracefully

**Test Data**:
- Payment Type: Full Payment
- Total Amount Paid: £2000
- Missing: Cancellation Request Date

**Steps**:
1. Open booking in Edit Booking Modal
2. Navigate to Cancellation tab
3. Set **Cancellation Initiated By**: `Guest`
4. Leave **Cancellation Request Date**: Empty
5. Set other fields normally
6. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Incomplete Data"
- ✅ **Eligible Refund**: "Cannot determine - Missing required fields"
- ✅ **Refundable Amount**: `---` or blank
- ✅ **Non-Refundable Amount**: `---` or blank

**Validation Points**:
- [ ] System doesn't crash
- [ ] Clear error/warning message
- [ ] Fields show incomplete state
- [ ] Admin prompted to complete data

---

#### Test Case 6.2: Tour Date Missing

**Objective**: Verify timing cannot be calculated without tour date

**Test Data**:
- Missing: Tour Date
- All other cancellation fields complete

**Steps**:
1. Open booking WITHOUT tour date set
2. Navigate to Cancellation tab
3. Complete all cancellation fields
4. Save booking

**Expected Results**:
- ✅ **Cancellation Scenario**: "Incomplete Data"
- ✅ **Eligible Refund**: "Cannot determine - Missing tour date"
- ✅ Days calculation: Cannot compute

**Validation Points**:
- [ ] Missing tour date detected
- [ ] Cannot determine timing bucket
- [ ] Clear messaging about requirement

---

#### Test Case 6.3: Boundary Testing - Exactly 100 Days

**Objective**: Verify boundary at 100 days (early vs mid-range)

**Test Data**:
- Payment Type: Full Payment
- Tour Date: Exactly 100 days from today
- Cancellation: Today

**Steps**:
1. Set tour date to exactly 100 days in future
2. Complete cancellation fields (Guest initiated)
3. Save booking

**Expected Results**:
- ✅ **Days Before Tour**: 100
- ✅ Should use "Early" bucket (≥100 days)
- ✅ **Refundable Percentage**: 100%

**Validation Points**:
- [ ] Boundary inclusive at 100
- [ ] 100 days = Early bucket (not mid-range)
- [ ] Correct refund percentage

---

#### Test Case 6.4: Boundary Testing - Exactly 60 Days

**Objective**: Verify boundary at 60 days (mid-range vs late)

**Test Data**:
- Payment Type: Full Payment
- Tour Date: Exactly 60 days from today
- Cancellation: Today

**Steps**:
1. Set tour date to exactly 60 days in future
2. Complete cancellation fields (Guest initiated)
3. Save booking

**Expected Results**:
- ✅ **Days Before Tour**: 60
- ✅ Should use "Mid-Range" bucket (60-99 days)
- ✅ **Refundable Percentage**: 50%

**Validation Points**:
- [ ] Boundary inclusive at 60
- [ ] 60 days = Mid-range (not late)
- [ ] Correct refund percentage

---

#### Test Case 6.5: Boundary Testing - Exactly 59 Days

**Objective**: Verify 59 days = Late bucket

**Test Data**:
- Tour Date: Exactly 59 days from today

**Steps**:
1. Set tour date to exactly 59 days in future
2. Complete cancellation fields

**Expected Results**:
- ✅ **Days Before Tour**: 59
- ✅ Should use "Late" bucket (≤59 days)
- ✅ **Refundable Percentage**: 0%

**Validation Points**:
- [ ] 59 days = Late bucket
- [ ] No refund applied
- [ ] Clear boundary definition

---

#### Test Case 6.6: Negative Days (Cancellation After Tour Date)

**Objective**: Verify system handles past tour dates

**Test Data**:
- Tour Date: 10 days ago (in the past)
- Cancellation Date: Today

**Steps**:
1. Set tour date in the past
2. Set cancellation date as today
3. Complete other fields

**Expected Results**:
- ✅ **Days Before Tour**: -10 (negative)
- ✅ Should treat as "Late" (≤59 days)
- ✅ **Refundable Amount**: £0

**Validation Points**:
- [ ] Negative days handled gracefully
- [ ] Treated as late cancellation
- [ ] No refund given

---

### Category 7: Tooltip Validation

#### Test Case 7.1: Verify Tooltips Display

**Objective**: Ensure help tooltips render correctly

**Steps**:
1. Open Edit Booking Modal
2. Navigate to Cancellation tab
3. Hover over `?` icon next to **Cancellation Initiated By**
4. Hover over `?` icon next to **Supplier Costs Committed**
5. Hover over `?` icon next to **No-Show**

**Expected Results**:
- ✅ All three fields have `?` help icons
- ✅ Icons show HelpCircle with cursor-help styling
- ✅ Tooltips appear on hover:
  - **Cancellation Initiated By**: Explains Guest vs IHT and RF policy
  - **Supplier Costs Committed**: Explains entering supplier costs
  - **No-Show**: Explains no-show zero refund policy
- ✅ Tooltips position to the right
- ✅ Text is readable and helpful

**Validation Points**:
- [ ] Icons visible
- [ ] Tooltips trigger on hover
- [ ] Content accurate
- [ ] Helps admin understand fields

---

### Category 8: Calculated Fields Auto-Update

#### Test Case 8.1: Real-Time Calculation Updates

**Objective**: Verify all calculated fields update when inputs change

**Steps**:
1. Open booking with cancellation partially filled
2. Change **Cancellation Initiated By** from `Guest` to `IHT`
3. Observe calculated fields
4. Change **Supplier Costs Committed** from `0` to `500`
5. Observe updates again
6. Toggle **No-Show** checkbox
7. Observe final updates

**Expected Results**:
- ✅ **Cancellation Scenario** updates immediately
- ✅ **Eligible Refund** text changes
- ✅ **Refundable Amount** recalculates
- ✅ **Non-Refundable Amount** updates
- ✅ **Admin Fee** adjusts
- ✅ All updates occur without saving

**Validation Points**:
- [ ] Real-time updates work
- [ ] No need to refresh page
- [ ] All dependencies tracked
- [ ] Function columns recalculate

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Backup production data (if testing in prod)
- [ ] Create test bookings with various payment structures
- [ ] Set tour dates at various timing windows
- [ ] Verify admin access to all required fields

### Core Scenarios (Must Test)
- [ ] Test Case 1.1: Guest Early Full Payment
- [ ] Test Case 1.2: Guest Mid-Range Full Payment
- [ ] Test Case 1.3: Guest Late Full Payment
- [ ] Test Case 2.1: Guest Early Installment
- [ ] Test Case 2.2: Guest Mid-Range Installment
- [ ] Test Case 2.3: Guest Late Installment
- [ ] Test Case 4.1: IHT Cancel Full Payment
- [ ] Test Case 4.2: IHT Cancel Installment

### Special Cases (High Priority)
- [ ] Test Case 5.1: Supplier Costs Override
- [ ] Test Case 5.2: Supplier Costs Exceed Refund
- [ ] Test Case 5.3: No-Show
- [ ] Test Case 5.4: Force Majeure

### Payment Default Cases (Medium Priority)
- [ ] Test Case 3.1: Default Early
- [ ] Test Case 3.2: Default Mid-Range
- [ ] Test Case 3.3: Default Late

### Edge Cases (Essential)
- [ ] Test Case 6.1: Missing Required Fields
- [ ] Test Case 6.2: Missing Tour Date
- [ ] Test Case 6.3: Exactly 100 Days Boundary
- [ ] Test Case 6.4: Exactly 60 Days Boundary
- [ ] Test Case 6.5: Exactly 59 Days Boundary
- [ ] Test Case 6.6: Negative Days (Past Tour)

### UI/UX Validation
- [ ] Test Case 7.1: Tooltip Display
- [ ] Test Case 8.1: Real-Time Updates

---

## Bug Reporting Template

When issues are found, report using this format:

```
**Test Case**: [Test Case Number & Name]
**Severity**: Critical / High / Medium / Low
**Environment**: Dev / Staging / Production

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots/Evidence**:
[Attach screenshots if applicable]

**Additional Context**:
[Any other relevant information]
```

---

## Success Criteria

Testing is complete and successful when:

✅ All 24 test cases pass without critical/high bugs  
✅ Calculations match expected results within £1 tolerance  
✅ All timing boundaries (100, 60, 59 days) work correctly  
✅ RF refund policy enforced (only IHT cancellations)  
✅ Admin fees calculated correctly (10% when applicable, £0 when not)  
✅ Supplier costs properly override normal calculations  
✅ No-show enforcement (zero refund regardless of timing)  
✅ Tooltips display and provide helpful information  
✅ Real-time field updates work smoothly  
✅ Edge cases handled gracefully (missing data, boundaries, etc.)  
✅ All calculated fields auto-update correctly  
✅ System stability maintained (no crashes or data corruption)  

---

## Notes for Testers

1. **Use Real Currency**: Test with actual tour prices (£1500-£3000 range)
2. **Timing Sensitivity**: Set up bookings at exact boundary dates (100, 60, 59 days)
3. **Payment Verification**: Ensure installment bookings have correct payment history
4. **Document Everything**: Take screenshots of unexpected behavior
5. **Test Tooltips**: Verify all help text is accurate and useful
6. **Cross-Check Math**: Use a calculator to verify refund amounts
7. **Test Sequentially**: Run tests in order to build confidence progressively

## Questions During Testing?

If you encounter unclear scenarios or edge cases not covered:
1. Refer to [CANCELLATION_SCENARIOS.md](CANCELLATION_SCENARIOS.md)
2. Check the scenario decision tree
3. Document the question for product team review
4. Make a reasonable assumption and note it in test results

---

**Document Version**: 1.0  
**Last Updated**: February 10, 2026  
**Related Docs**: `CANCELLATION_SCENARIOS.md`, Migration 025, Migration 026
