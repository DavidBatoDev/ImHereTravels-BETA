# Cancellation Email Examples by Scenario

This document shows how the cancellation email will appear for each cancellation scenario. The email template dynamically adapts its content based on who cancelled, when they cancelled, and the financial details.

---

## Table of Contents

1. [Guest Cancellations - Full Payment](#guest-cancellations---full-payment)
   - [Scenario 1: Guest Cancel Early (Full Payment)](#scenario-1-guest-cancel-early-full-payment)
   - [Scenario 2: Guest Cancel Mid-Range (Full Payment)](#scenario-2-guest-cancel-mid-range-full-payment)
   - [Scenario 3: Guest Cancel Late (Full Payment)](#scenario-3-guest-cancel-late-full-payment)

2. [Guest Cancellations - Installment Plans](#guest-cancellations---installment-plans)
   - [Scenario 4: Guest Cancel Early (Installment)](#scenario-4-guest-cancel-early-installment)
   - [Scenario 5: Guest Cancel Mid-Range (Installment)](#scenario-5-guest-cancel-mid-range-installment)
   - [Scenario 6: Guest Cancel Late (Installment)](#scenario-6-guest-cancel-late-installment)

3. [IHT-Initiated Cancellations](#iht-initiated-cancellations)
   - [Scenario 12: Tour Cancelled by IHT (Before Start)](#scenario-12-tour-cancelled-by-iht-before-start)

4. [Special Scenarios](#special-scenarios)
   - [Scenario 10: Supplier Costs Committed](#scenario-10-supplier-costs-committed)
   - [Scenario 11: Guest No-Show](#scenario-11-guest-no-show)

---

## Guest Cancellations - Full Payment

### Scenario 1: Guest Cancel Early (Full Payment)

**Situation:**

- Guest paid in full: £2000 (RF £500 + Payment £1500)
- Tour Date: Aug 15, 2026
- Cancellation Date: Apr 10, 2026 (127 days before)
- Refundable: £1350
- Non-Refundable: £650

**Email Variables:**

```javascript
{
  fullName: "John Smith",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Apr 10, 2026",
  daysBeforeTour: 127,
  timingWindow: "Early",
  initiatedBy: "Guest",
  paymentPlan: "Full Payment",
  cancelledRefundAmount: "500.00",
  refundableAmount: "1350.00",
  nonRefundableAmount: "650.00",
  adminFee: "150.00",
  supplierCostsCommitted: "0.00"
}
```

**What Guest Sees:**

> **Dear John Smith,**
>
> This email confirms the cancellation of your upcoming **Mystical Bali 7D/6N** scheduled for **Aug 15, 2026**.
>
> You requested to cancel your booking on **Apr 10, 2026**, which was **127 days before your tour date**. Based on our cancellation timeline, your booking falls under the **Early** cancellation window.

**💰 Refund Breakdown**

> **Cancellation Date:** Apr 10, 2026  
> **Tour Date:** Aug 15, 2026  
> **Notice Period:** 127 days before tour
>
> **Policy Applied:** Cancellations made 100+ days in advance receive a full refund of your non-reservation payment, minus a 10% administrative fee.
>
> **Important:** Your reservation fee of £500.00 is **non-refundable** for guest-initiated cancellations. This fee secures your booking and covers initial administrative costs.
>
> **Refundable Amount:** **£1,350.00**  
> **Non-Refundable Amount:** £650.00  
> _(Includes £150.00 administrative fee)_

**💳 Next Steps: Receiving Your Refund**

> To process your refund of **£1,350.00**, please reply to this email with your bank account details:
>
> - Account Holder Name
> - Bank Name
> - Account Number
> - Sort Code (UK) or IBAN/SWIFT (International)
>
> ⏱️ Processing time: 5-7 business days after receiving your bank details.

**Options moving forward:**

> - **Reschedule:** We'd be happy to help you rebook the same tour for a future date
> - **Refund:** Receive your refund of £1,350.00 by sending us your bank details

---

### Scenario 2: Guest Cancel Mid-Range (Full Payment)

**Situation:**

- Guest paid in full: £2000 (RF £500 + Payment £1500)
- Tour Date: Aug 15, 2026
- Cancellation Date: Jun 10, 2026 (66 days before)
- Refundable: £600
- Non-Refundable: £1400

**Email Variables:**

```javascript
{
  fullName: "Sarah Johnson",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Jun 10, 2026",
  daysBeforeTour: 66,
  timingWindow: "Mid-Range",
  initiatedBy: "Guest",
  paymentPlan: "Full Payment",
  cancelledRefundAmount: "500.00",
  refundableAmount: "600.00",
  nonRefundableAmount: "1400.00",
  adminFee: "150.00",
  supplierCostsCommitted: "0.00"
}
```

**What Guest Sees:**

> **Dear Sarah Johnson,**
>
> This email confirms the cancellation of your upcoming **Mystical Bali 7D/6N** scheduled for **Aug 15, 2026**.
>
> You requested to cancel your booking on **Jun 10, 2026**, which was **66 days before your tour date**. Based on our cancellation timeline, your booking falls under the **Mid-Range** cancellation window.

**💰 Refund Breakdown**

> **Notice Period:** 66 days before tour
>
> **Policy Applied:** Cancellations made 60-99 days in advance receive a 50% refund of your non-reservation payment, minus a 10% administrative fee.
>
> **Important:** Your reservation fee of £500.00 is **non-refundable** for guest-initiated cancellations. This fee secures your booking and covers initial administrative costs.
>
> **Refundable Amount:** **£600.00**  
> **Non-Refundable Amount:** £1,400.00  
> _(Includes £150.00 administrative fee)_

**Calculation:**

```
Non-Reservation Amount (NRA) = £2000 - £500 = £1500
50% of NRA = £750
Admin Fee (10% of NRA) = £150
Refundable = £750 - £150 = £600
Non-Refundable = £500 (RF) + £750 (50% NRA) + £150 (admin) = £1400
```

---

### Scenario 3: Guest Cancel Late (Full Payment)

**Situation:**

- Guest paid in full: £2000
- Tour Date: Aug 15, 2026
- Cancellation Date: Jul 1, 2026 (45 days before)
- Refundable: £0
- Non-Refundable: £2000

**Email Variables:**

```javascript
{
  fullName: "Michael Brown",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Jul 1, 2026",
  daysBeforeTour: 45,
  timingWindow: "Late",
  initiatedBy: "Guest",
  paymentPlan: "Full Payment",
  cancelledRefundAmount: "500.00",
  refundableAmount: "0.00",
  nonRefundableAmount: "2000.00",
  adminFee: "0.00",
  supplierCostsCommitted: "0.00"
}
```

**What Guest Sees:**

> **Dear Michael Brown,**
>
> This email confirms the cancellation of your upcoming **Mystical Bali 7D/6N** scheduled for **Aug 15, 2026**.
>
> You requested to cancel your booking on **Jul 1, 2026**, which was **45 days before your tour date**. Based on our cancellation timeline, your booking falls under the **Late** cancellation window.

**💰 Refund Breakdown**

> **Notice Period:** 45 days before tour
>
> **Policy Applied:** Cancellations made less than 60 days in advance are non-refundable as per our cancellation policy. This includes your reservation fee (£500.00) and all payments made.
>
> **Refundable Amount:** **£0.00**  
> **Non-Refundable Amount:** £2,000.00

**⚠️ NO Refund Instructions Box Shown**

**Options moving forward:**

> We'd like to offer you an option moving forward:
>
> - **Reschedule:** We'd be happy to help you rebook the same tour for a future date

---

## Guest Cancellations - Installment Plans

### Scenario 4: Guest Cancel Early (Installment)

**Situation:**

- P4 Plan: Guest paid P1 (£625) + P2 (£625) = £1250 in installments
- Reservation Fee: £500 (already paid)
- Tour Date: Aug 15, 2026
- Cancellation Date: Apr 10, 2026 (127 days before)
- Refundable: £1125 (paid installments minus admin fee)
- Non-Refundable: £625 (RF + admin fee)

**Email Variables:**

```javascript
{
  fullName: "Emily Davis",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Apr 10, 2026",
  daysBeforeTour: 127,
  timingWindow: "Early",
  initiatedBy: "Guest",
  paymentPlan: "P4",
  cancelledRefundAmount: "500.00",
  refundableAmount: "1125.00",
  nonRefundableAmount: "625.00",
  adminFee: "125.00",
  supplierCostsCommitted: "0.00"
}
```

**What Guest Sees:**

> **Dear Emily Davis,**
>
> This email confirms the cancellation of your upcoming **Mystical Bali 7D/6N** scheduled for **Aug 15, 2026**.
>
> You requested to cancel your booking on **Apr 10, 2026**, which was **127 days before your tour date**. Based on our cancellation timeline, your booking falls under the **Early** cancellation window.

**💰 Refund Breakdown**

> **Policy Applied:** Cancellations made 100+ days in advance receive a full refund of your **paid installments**, minus a 10% administrative fee.
>
> **Important:** Your reservation fee of £500.00 is **non-refundable** for guest-initiated cancellations. This fee secures your booking and covers initial administrative costs.
>
> **Refundable Amount:** **£1,125.00**  
> **Non-Refundable Amount:** £625.00  
> _(Includes £125.00 administrative fee)_

**Calculation:**

```
Paid Installments = £625 + £625 = £1250
Admin Fee (10% of paid installments) = £125
Refundable = £1250 - £125 = £1125
Non-Refundable = £500 (RF) + £125 (admin) = £625
```

**Note:** RF is NEVER part of the refund calculation for installments. Only the actual installment payments (P1, P2, etc.) are considered.

---

### Scenario 5: Guest Cancel Mid-Range (Installment)

**Situation:**

- P3 Plan: Guest paid P1 (£800) + P2 (£800) = £1600
- RF: £500
- Tour Date: Aug 15, 2026
- Cancellation Date: Jun 10, 2026 (66 days before)
- Refundable: £680
- Non-Refundable: £1420

**Email Variables:**

```javascript
{
  fullName: "David Wilson",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Jun 10, 2026",
  daysBeforeTour: 66,
  timingWindow: "Mid-Range",
  initiatedBy: "Guest",
  paymentPlan: "P3",
  cancelledRefundAmount: "500.00",
  refundableAmount: "680.00",
  nonRefundableAmount: "1420.00",
  adminFee: "160.00",
  supplierCostsCommitted: "0.00"
}
```

**What Guest Sees:**

**💰 Refund Breakdown**

> **Policy Applied:** Cancellations made 60-99 days in advance receive a 50% refund of your **paid installments**, minus a 10% administrative fee.
>
> **Important:** Your reservation fee of £500.00 is **non-refundable** for guest-initiated cancellations.
>
> **Refundable Amount:** **£680.00**  
> **Non-Refundable Amount:** £1,420.00  
> _(Includes £160.00 administrative fee)_

**Calculation:**

```
Paid Installments = £1600
50% of Paid Installments = £800
Admin Fee (10% of paid installments) = £160
Refundable = £800 - £160 = £680
Non-Refundable = £500 (RF) + £800 (50%) + £160 (admin) = £1420
```

---

### Scenario 6: Guest Cancel Late (Installment)

**Situation:**

- P2 Plan: Guest paid P1 (£1000) only
- RF: £500
- Tour Date: Aug 15, 2026
- Cancellation Date: Jul 10, 2026 (36 days before)
- Refundable: £0
- Non-Refundable: £1500

**Email Variables:**

```javascript
{
  fullName: "Lisa Martinez",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Jul 10, 2026",
  daysBeforeTour: 36,
  timingWindow: "Late",
  initiatedBy: "Guest",
  paymentPlan: "P2",
  cancelledRefundAmount: "500.00",
  refundableAmount: "0.00",
  nonRefundableAmount: "1500.00",
  adminFee: "0.00",
  supplierCostsCommitted: "0.00"
}
```

**What Guest Sees:**

**💰 Refund Breakdown**

> **Policy Applied:** Cancellations made less than 60 days in advance are non-refundable as per our cancellation policy. This includes your reservation fee (£500.00) and all payments made.
>
> **Refundable Amount:** **£0.00**  
> **Non-Refundable Amount:** £1,500.00

---

## IHT-Initiated Cancellations

### Scenario 12: Tour Cancelled by IHT (Before Start)

**Situation:**

- IHT cancels tour due to insufficient bookings
- Guest paid: £1750 (RF £500 + installments £1250)
- Tour Date: Aug 15, 2026
- Cancellation Date: Jul 20, 2026 (26 days before)
- Refundable: £1750 (INCLUDES RF)
- Non-Refundable: £0

**Email Variables:**

```javascript
{
  fullName: "Robert Taylor",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Jul 20, 2026",
  daysBeforeTour: 26,
  timingWindow: "N/A",
  initiatedBy: "IHT",
  paymentPlan: "P4",
  reasonForCancellation: "IHT - Insufficient bookings",
  cancelledRefundAmount: "500.00",
  refundableAmount: "1750.00",
  nonRefundableAmount: "0.00",
  adminFee: "0.00",
  supplierCostsCommitted: "0.00"
}
```

**What Guest Sees:**

> **Dear Robert Taylor,**
>
> We're reaching out with unfortunate news regarding your upcoming **Mystical Bali 7D/6N** scheduled for **Aug 15, 2026**.
>
> Due to **IHT - Insufficient bookings**, we regret to inform you that this tour has been **cancelled**. We understand how disappointing this may be and sincerely apologize for the inconvenience.

**💰 Refund Breakdown**

> **Cancellation Date:** Jul 20, 2026  
> **Tour Date:** Aug 15, 2026
>
> **Policy Applied:** When I'm Here Travels cancels a tour, we provide a **full refund including your reservation fee**. This is our commitment to you when we cannot fulfill the tour.
>
> **Refundable Amount:** **£1,750.00**  
> **Non-Refundable Amount:** £0.00

**💳 Next Steps: Receiving Your Refund**

> To process your refund of **£1,750.00**, please reply to this email with your bank account details...

**Options moving forward:**

> - **Reschedule:** We'd be happy to help you rebook the same tour for a future date
> - **Refund:** Receive your refund of £1,750.00 by sending us your bank details

**Key Difference:**

- ✅ RF IS REFUNDABLE when IHT cancels
- ❌ RF is NOT refundable when guest cancels
- No admin fee charged (IHT bears the cost)

---

## Special Scenarios

### Scenario 10: Supplier Costs Committed

**Situation:**

- Guest cancels early (would normally get £1350 refund)
- Supplier costs already committed: £500 (hotel deposits, permits)
- Tour Date: Aug 15, 2026
- Cancellation Date: Apr 10, 2026 (127 days before)
- Calculated Refund: £1350
- Supplier Costs: -£500
- Actual Refundable: £850

**Email Variables:**

```javascript
{
  fullName: "Amanda Clark",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Apr 10, 2026",
  daysBeforeTour: 127,
  timingWindow: "Early",
  initiatedBy: "Guest",
  paymentPlan: "Full Payment",
  cancelledRefundAmount: "500.00",
  refundableAmount: "850.00",
  nonRefundableAmount: "1150.00",
  adminFee: "0.00",  // Admin fee is 0 when supplier costs exist
  supplierCostsCommitted: "500.00"
}
```

**What Guest Sees:**

**💰 Refund Breakdown**

> **Policy Applied:** Cancellations made 100+ days in advance receive a full refund of your non-reservation payment, minus a 10% administrative fee.
>
> **Important:** Your reservation fee of £500.00 is **non-refundable** for guest-initiated cancellations.
>
> ⚠️ **Additional Deduction:** Supplier costs of **£500.00** have been deducted as they were already committed for your booking (e.g., hotel deposits, permits, etc.).
>
> **Refundable Amount:** **£850.00**  
> **Non-Refundable Amount:** £1,150.00

**Calculation:**

```
Base Calculation (without supplier costs):
NRA = £2000 - £500 = £1500
Admin Fee = £150
Base Refundable = £1500 - £150 = £1350

With Supplier Costs:
Admin Fee = £0 (supplier bears this)
Refundable = £1350 - £500 = £850
Non-Refundable = £2000 - £850 = £1150
```

---

### Scenario 11: Guest No-Show

**Situation:**

- Guest didn't attend tour
- Tour Date: Aug 15, 2026 (past)
- Admin marked as no-show after tour date
- Total Paid: £2000
- Refundable: £0
- Non-Refundable: £2000

**Email Variables:**

```javascript
{
  fullName: "James Anderson",
  tourPackage: "Mystical Bali 7D/6N",
  tourDate: "Aug 15, 2026",
  cancellationRequestDate: "Aug 16, 2026",
  daysBeforeTour: 0,
  timingWindow: "N/A",
  initiatedBy: "Guest",
  paymentPlan: "Full Payment",
  reasonForCancellation: "Guest - No-show",
  cancelledRefundAmount: "500.00",
  refundableAmount: "0.00",
  nonRefundableAmount: "2000.00",
  adminFee: "0.00",
  supplierCostsCommitted: "0.00"
}
```

**What Guest Sees:**

**💰 Refund Breakdown**

> **Policy Applied:** No-show - Guest did not attend the tour as scheduled.
>
> **Refundable Amount:** **£0.00**  
> **Non-Refundable Amount:** £2,000.00

**No refund instructions shown.**

---

## Summary Table

| Scenario              | Days Before | RF Refundable? | Installments/NRA Refund | Admin Fee   | Supplier Costs  |
| --------------------- | ----------- | -------------- | ----------------------- | ----------- | --------------- |
| Guest Early (Full)    | ≥100        | ❌ No          | 100% minus admin        | 10% of NRA  | Deducted if any |
| Guest Mid (Full)      | 60-99       | ❌ No          | 50% minus admin         | 10% of NRA  | Deducted if any |
| Guest Late (Full)     | ≤59         | ❌ No          | 0%                      | 0%          | N/A             |
| Guest Early (Install) | ≥100        | ❌ No          | 100% minus admin        | 10% of paid | Deducted if any |
| Guest Mid (Install)   | 60-99       | ❌ No          | 50% minus admin         | 10% of paid | Deducted if any |
| Guest Late (Install)  | ≤59         | ❌ No          | 0%                      | 0%          | N/A             |
| IHT Cancels           | Any         | ✅ Yes         | 100%                    | 0%          | N/A             |
| Supplier Costs        | Any         | ❌ No          | Calculated minus costs  | 0%          | Yes             |
| No-Show               | Past tour   | ❌ No          | 0%                      | 0%          | N/A             |

---

## Key Email Behaviors

### 1. Opening Message

- **IHT Cancels:** Apologetic tone, mentions IHT's reason
- **Guest Cancels:** Confirmation tone, shows timing context

### 2. Refund Breakdown Box (Always Shown)

- Timeline details
- Clear policy explanation in plain English
- Reservation fee explanation (except for IHT cancellations)
- Supplier costs warning (if applicable)
- Financial numbers with color coding

### 3. Refund Instructions Box

- **Shown when:** `refundableAmount > 0`
- **Hidden when:** `refundableAmount = 0`
- Contains bank details collection instructions
- Shows processing timeline

### 4. Options List

- **Always shows:** Reschedule option
- **Conditionally shows:** Refund option (only if refund > 0)
- Dynamic wording based on refund availability

### 5. Policy Reference Box (Always Shown)

- Quick reference guide
- RF policy clearly stated
- Timeline-based percentages
- Supplier costs note

---

## Template Variable Reference

All emails receive these variables from the Cloud Function:

```typescript
{
  // Basic Info
  fullName: string,
  tourPackage: string,
  tourDate: string (formatted),

  // Cancellation Details
  cancellationScenario: string,
  cancellationRequestDate: string (formatted),
  reasonForCancellation: string,

  // Financial Info
  cancelledRefundAmount: string (reservation fee),
  refundableAmount: string,
  nonRefundableAmount: string,
  adminFee: string,
  supplierCostsCommitted: string,

  // Contextual Info
  daysBeforeTour: number,
  timingWindow: "Early" | "Mid-Range" | "Late" | "N/A",
  initiatedBy: "Guest" | "IHT",
  paymentPlan: string,
  eligibleRefund: string,

  // Visual
  tourPackageCoverImage: string (URL)
}
```

---

## Testing Checklist

When testing the cancellation email system, verify:

- [ ] Early cancellations show 100% refund calculation
- [ ] Mid-range cancellations show 50% refund calculation
- [ ] Late cancellations show £0 refund
- [ ] RF is non-refundable for guest cancellations
- [ ] RF IS refundable for IHT cancellations
- [ ] Admin fee is calculated correctly (10% of refundable base)
- [ ] Admin fee is 0 when supplier costs exist
- [ ] Admin fee is 0 when IHT cancels
- [ ] Supplier costs are deducted from refund
- [ ] Refund instructions box only shows when refund > 0
- [ ] Timeline shows correct days before tour
- [ ] Policy explanation adapts to scenario
- [ ] Options list changes based on refund availability
- [ ] No-show scenario shows no refund
- [ ] Email subject line includes tour package name
- [ ] Tour cover image loads correctly

---

## Notes for Customer Service

When explaining cancellations to customers, reference this document to show them:

1. **What they'll see in the email** - Show them the relevant scenario example
2. **Why certain amounts are non-refundable** - Point to the policy explanation shown in the email
3. **How the calculation works** - Use the calculation examples
4. **What to expect next** - Reference the refund instructions or options list

The email is designed to be self-explanatory, but this document helps CS agents understand the full picture.
