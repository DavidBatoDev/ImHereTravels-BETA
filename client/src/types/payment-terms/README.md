# Payment Terms & Payment Plans System

## Overview

The Payment Terms system in ImHereTravels provides flexible payment options for customers while ensuring cash flow management and financial predictability for the business. It allows travelers to secure bookings with a deposit and pay the balance over time, making tours more accessible.

## Payment Plan Types

### 1. Invalid Booking

- **Purpose**: Handle bookings that cannot be processed due to scheduling constraints
- **Trigger Conditions**: Tour date is within 2 days of booking date
- **Financial Handling**: No payments processed, reservation fee refunded, booking marked as invalid
- **Typical Scenario**: Customer tries to book for tomorrow's tour

### 2. Full Payment Required Within 48hrs

- **Purpose**: Capture last-minute bookings while ensuring immediate payment
- **Trigger Conditions**: Tour date is 2-30 days away, no eligible instalment dates available
- **Payment Structure**: 100% payment due within 2 days of booking (no deposit)
- **Typical Scenario**: Customer books a tour 2 weeks away

### 3. P1 - Single Instalment Plan

- **Purpose**: Simplified payment for shorter lead times
- **Trigger Conditions**: Only 1 eligible payment date available, tour date 30-60 days away
- **Payment Structure**: 100% payment in single installment on next 2nd of month (no deposit)
- **Typical Scenario**: Customer books 45 days in advance

### 4. P2 - Two Instalment Plan

- **Purpose**: Balance affordability with business cash flow needs
- **Trigger Conditions**: 2 eligible payment dates available, tour date 60-90 days away
- **Payment Structure**: 50% × 2 payments on two consecutive 2nd-of-month dates (no deposit)
- **Typical Scenario**: Customer books 75 days in advance

### 5. P3 - Three Instalment Plan

- **Purpose**: Make longer-term bookings more affordable
- **Trigger Conditions**: 3 eligible payment dates available, tour date 90-120 days away
- **Payment Structure**: 33.33% × 3 payments on three consecutive 2nd-of-month dates (no deposit)
- **Typical Scenario**: Customer books 100 days in advance

### 6. P4 - Four Instalment Plan

- **Purpose**: Maximum flexibility for early planners
- **Trigger Conditions**: 4+ eligible payment dates available, tour date 120+ days away
- **Payment Structure**: 25% × 4 payments on four consecutive 2nd-of-month dates (no deposit)
- **Typical Scenario**: Customer books 5 months in advance

### 7. Custom Plan

- **Purpose**: Allow administrators to create custom payment configurations
- **Trigger Conditions**: Configurable based on business needs
- **Payment Structure**: Fully customizable deposit percentage and monthly payment distribution
- **Typical Scenario**: Special corporate bookings or promotional offers

## System Architecture

### Core Types

```typescript
export interface PaymentTermConfiguration {
  id: string;
  name: string;
  description: string;
  paymentPlanType: PaymentPlanType; // The specific payment plan type
  paymentType: "full_payment" | "monthly_scheduled" | "invalid_booking";
  daysRequired?: number; // Days required for full payment or invalid booking threshold
  monthsRequired?: number; // Months required for scheduled payment
  monthlyPercentages?: number[]; // Percentage for each month
  depositPercentage: number; // Standard 15% deposit for all plans
  isActive: boolean;
  percentage?: number; // Legacy percentage field for backward compatibility
  sortOrder: number;
  color: string;
  metadata: PaymentTermMetadata;
}
```

### Payment Plan Type Enum

```typescript
export type PaymentPlanType =
  | "invalid_booking"
  | "full_payment_48hrs"
  | "p1_single_installment"
  | "p2_two_installments"
  | "p3_three_installments"
  | "p4_four_installments"
  | "custom";
```

## Usage Examples

### Creating a New Payment Plan

```typescript
import { PaymentTermsService } from "@/services/payment-terms-service";

const newPaymentPlan = {
  name: "P5 - Five Instalment Plan",
  description: "Extended payment flexibility for very early planners",
  paymentPlanType: "p5_five_installments",
  paymentType: "monthly_scheduled",
  monthsRequired: 5,
  monthlyPercentages: [17, 17, 17, 17, 17],
  depositPercentage: 15,
  color: "#84cc16",
  isActive: true,
  sortOrder: 7,
};

const planId = await PaymentTermsService.createPaymentTerm(
  newPaymentPlan,
  userId
);
```

### Evaluating Payment Terms

```typescript
import { PaymentTermsCalculator } from "@/services/payment-terms-service";

const reservationDate = new Date("2024-01-15");
const tourDate = new Date("2024-06-15");
const paymentTerms = await PaymentTermsService.getActivePaymentTerms();

const result = PaymentTermsCalculator.evaluatePaymentTerm(
  reservationDate,
  tourDate,
  paymentTerms
);

console.log(result);
// Output: {
//   applicableTerm: "P4 - Four Instalment Plan",
//   daysDifference: 151,
//   isValid: true,
//   message: "Maximum flexibility for early planners...",
//   paymentPlanType: "p4_four_installments"
// }
```

### Calculating Payment Breakdown

```typescript
import { PaymentTypeUtils } from "@/utils/payment-type-utils";

const totalCost = 1000;
const termName = "P3 - Three Instalment Plan";

const breakdown = await PaymentTypeUtils.getMonthlyPaymentBreakdown(
  termName,
  totalCost
);

console.log(breakdown);
// Output: {
//   deposit: 150,        // 15% of 1000
//   monthlyPayments: [   // 85% distributed over 3 months
//     283,               // 28.3% of 1000
//     283,               // 28.3% of 1000
//     284                // 28.4% of 1000 (adjusted for rounding)
//   ]
// }
```

## Form Configuration

The `PaymentTermDialog` component automatically configures itself based on the selected payment plan type:

1. **Invalid Booking**: Shows only days threshold field
2. **Full Payment 48hrs**: Shows hours required field
3. **Installment Plans**: Shows months required and monthly percentage distribution
4. **Custom Plan**: Shows all fields for manual configuration

## Validation Rules

- **Invalid Booking**: Must have 0% deposit and daysRequired > 0
- **Full Payment 48hrs**: Must have daysRequired > 0 and 15% deposit
- **Installment Plans**: Monthly percentages must add up to (100% - deposit percentage)
- **Custom Plans**: All fields are configurable with validation

## Extensibility

The system is designed to easily accommodate future payment plans:

1. **Add new plan type** to `PaymentPlanType` enum
2. **Update helper functions** in `getDefaultConfigForPlanType()`
3. **Add validation logic** in form schema
4. **Update UI components** to display new plan types

### Example: Adding P6 Plan

```typescript
// 1. Add to enum
export type PaymentPlanType =
  | "invalid_booking"
  | "full_payment_48hrs"
  | "p1_single_installment"
  | "p2_two_installments"
  | "p3_three_installments"
  | "p4_four_installments"
  | "p6_six_installments"  // New plan
  | "custom";

// 2. Add to helper function
case "p6_six_installments":
  return {
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    depositPercentage: 0, // Changed from 15 to 0 - no deposit required
    monthsRequired: 6,
    monthlyPercentages: [16.67, 16.67, 16.67, 16.67, 16.67, 16.65] // Changed from [14.17, 14.17, 14.17, 14.17, 14.17, 14.15] to [16.67, 16.67, 16.67, 16.67, 16.67, 16.65] to match 0% deposit
  };

// 3. Add to UI labels
export const PAYMENT_PLAN_TYPE_LABELS: Record<PaymentPlanType, string> = {
  // ... existing labels
  p6_six_installments: "P6 - Six Instalments",
};

// 4. Add to descriptions
export const PAYMENT_PLAN_TYPE_DESCRIPTIONS: Record<PaymentPlanType, string> = {
  // ... existing descriptions
  p6_six_installments: "15% deposit + 14.17% × 6 payments on consecutive 2nd-of-month dates",
};
```

## Migration from Legacy System

The new system maintains backward compatibility:

- Legacy `percentage` field is preserved
- Existing payment terms continue to work
- Gradual migration to new system is supported
- Default payment terms are automatically initialized

## Best Practices

1. **Always validate** payment plan configurations before saving
2. **Use helper functions** for consistent default values
3. **Test edge cases** like rounding errors in percentage calculations
4. **Monitor payment plan usage** to identify popular configurations
5. **Document custom plans** for business team reference

## Troubleshooting

### Common Issues

1. **Percentage totals don't add up**: Ensure monthly percentages + deposit = 100%
2. **Form validation errors**: Check that all required fields are filled for the selected plan type
3. **Cache issues**: Use `PaymentTypeUtils.clearCache()` when updating payment terms
4. **Legacy compatibility**: Ensure backward compatibility when modifying existing terms

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG_PAYMENT_TERMS=true
```

This will log detailed information about payment plan evaluation and calculations.
