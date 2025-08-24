import {
  PaymentTermConfiguration,
  PaymentPlanType,
} from "@/types/payment-terms";
import { PaymentTermsService } from "@/services/payment-terms-service";

// ============================================================================
// PAYMENT TYPE UTILITIES
// ============================================================================

export class PaymentTypeUtils {
  private static paymentTypesCache: PaymentTermConfiguration[] | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all active payment types with caching
   */
  private static async getActivePaymentTypes(): Promise<
    PaymentTermConfiguration[]
  > {
    const now = Date.now();

    if (
      this.paymentTypesCache &&
      now - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.paymentTypesCache;
    }

    try {
      this.paymentTypesCache =
        await PaymentTermsService.getActivePaymentTerms();
      this.cacheTimestamp = now;
      return this.paymentTypesCache;
    } catch (error) {
      console.error("Error fetching payment types:", error);
      return [];
    }
  }

  /**
   * Calculate payment amounts based on payment term
   */
  static async calculatePaymentAmount(
    termName: string,
    totalCost: number
  ): Promise<{ reservationFee: number; remainingBalance: number } | null> {
    try {
      const activeTypes = await this.getActivePaymentTypes();
      const term = activeTypes.find((type) => type.name === termName);

      if (!term) {
        return null;
      }

      const depositPercentage = term.depositPercentage || 0;
      const reservationFee = (totalCost * depositPercentage) / 100;
      const remainingBalance = totalCost - reservationFee;

      return { reservationFee, remainingBalance };
    } catch (error) {
      console.error("Error calculating payment amount:", error);
      return null;
    }
  }

  /**
   * Get monthly payment breakdown for installment plans
   */
  static async getMonthlyPaymentBreakdown(
    termName: string,
    totalCost: number
  ): Promise<{ deposit: number; monthlyPayments: number[] } | null> {
    try {
      const activeTypes = await this.getActivePaymentTypes();
      const term = activeTypes.find((type) => type.name === termName);

      if (!term || term.paymentType !== "monthly_scheduled") {
        return null;
      }

      const depositPercentage = term.depositPercentage || 0;
      const deposit = (totalCost * depositPercentage) / 100;
      const remainingAmount = totalCost - deposit;

      const monthlyPayments = (term.monthlyPercentages || []).map(
        (percentage) => (remainingAmount * percentage) / 100
      );

      return {
        deposit,
        monthlyPayments,
      };
    } catch (error) {
      console.error("Error getting monthly payment breakdown:", error);
      return null;
    }
  }

  /**
   * Determine payment type based on reservation and tour dates
   */
  static async determinePaymentType(
    reservationDate: Date,
    tourDate: Date
  ): Promise<string> {
    try {
      const activeTypes = await this.getActivePaymentTypes();
      const daysDifference = Math.ceil(
        (tourDate.getTime() - reservationDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Sort by daysRequired ascending to check from strictest to most lenient
      const sortedTypes = activeTypes
        .filter((type) => type.isActive)
        .sort((a, b) => (a.daysRequired || 0) - (b.daysRequired || 0));

      // Find the applicable payment type
      for (const type of sortedTypes) {
        if (daysDifference < (type.daysRequired || 0)) {
          return type.name;
        }
      }

      // Default to the most lenient option (usually P4)
      const defaultType = sortedTypes[sortedTypes.length - 1];
      return defaultType?.name || "Full Payment Required";
    } catch (error) {
      console.error("Error determining payment type:", error);
      return "Full Payment Required";
    }
  }

  /**
   * Get payment plan type by name
   */
  static async getPaymentPlanType(
    termName: string
  ): Promise<PaymentPlanType | null> {
    try {
      const activeTypes = await this.getActivePaymentTypes();
      const term = activeTypes.find((type) => type.name === termName);
      return term?.paymentPlanType || null;
    } catch (error) {
      console.error("Error getting payment plan type:", error);
      return null;
    }
  }

  /**
   * Check if a payment plan is valid for the given time difference
   */
  static async isValidPaymentPlan(
    daysDifference: number,
    paymentPlanType: PaymentPlanType
  ): Promise<boolean> {
    try {
      const activeTypes = await this.getActivePaymentTypes();
      const term = activeTypes.find(
        (type) => type.paymentPlanType === paymentPlanType
      );

      if (!term || !term.isActive) {
        return false;
      }

      // Invalid booking check
      if (paymentPlanType === "invalid_booking") {
        return daysDifference < (term.daysRequired || 0);
      }

      // Full payment 48hrs check
      if (paymentPlanType === "full_payment_48hrs") {
        return daysDifference >= 2 && daysDifference <= 30;
      }

      // Installment plan checks
      if (
        [
          "p1_single_installment",
          "p2_two_installments",
          "p3_three_installments",
          "p4_four_installments",
          "custom",
        ].includes(paymentPlanType)
      ) {
        const minDays = this.getMinDaysForPlanType(paymentPlanType);
        const maxDays = this.getMaxDaysForPlanType(paymentPlanType);
        return daysDifference >= minDays && daysDifference <= maxDays;
      }

      return false;
    } catch (error) {
      console.error("Error checking payment plan validity:", error);
      return false;
    }
  }

  /**
   * Get minimum days required for a payment plan type
   */
  private static getMinDaysForPlanType(
    paymentPlanType: PaymentPlanType
  ): number {
    switch (paymentPlanType) {
      case "p1_single_installment":
        return 30;
      case "p2_two_installments":
        return 60;
      case "p3_three_installments":
        return 90;
      case "p4_four_installments":
        return 120;
      case "custom":
        return 0; // Custom plans have no fixed minimum days
      default:
        return 0;
    }
  }

  /**
   * Get maximum days allowed for a payment plan type
   */
  private static getMaxDaysForPlanType(
    paymentPlanType: PaymentPlanType
  ): number {
    switch (paymentPlanType) {
      case "p1_single_installment":
        return 60;
      case "p2_two_installments":
        return 90;
      case "p3_three_installments":
        return 120;
      case "p4_four_installments":
        return 180;
      case "custom":
        return 365; // Custom plans have no fixed maximum days
      default:
        return 365;
    }
  }

  /**
   * Clear cache (useful when payment types are updated)
   */
  static clearCache(): void {
    this.paymentTypesCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get payment type color for UI display by name
   */
  static async getPaymentTypeColor(termName: string): Promise<string> {
    try {
      const activeTypes = await this.getActivePaymentTypes();
      const term = activeTypes.find((type) => type.name === termName);

      if (term?.color) {
        return term.color;
      }

      // Fallback color mapping
      const colorMap: Record<string, string> = {
        "Invalid Booking": "bg-red-100 text-red-800 border-red-200",
        "Full Payment Required Within 48hrs":
          "bg-amber-100 text-amber-800 border-amber-200",
        "P1 - Single Instalment Plan":
          "bg-blue-100 text-blue-800 border-blue-200",
        "P2 - Two Instalment Plan":
          "bg-violet-100 text-violet-800 border-violet-200",
        "P3 - Three Instalment Plan":
          "bg-emerald-100 text-emerald-800 border-emerald-200",
        "P4 - Four Instalment Plan":
          "bg-cyan-100 text-cyan-800 border-cyan-200",
        "Custom Plan": "bg-purple-100 text-purple-800 border-purple-200",
      };

      return colorMap[termName] || "bg-gray-100 text-gray-800 border-gray-200";
    } catch (error) {
      console.error("Error getting payment type color:", error);
      return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  /**
   * Get payment type badge variant for UI display
   */
  static async getPaymentTypeBadgeVariant(
    termName: string
  ): Promise<"default" | "secondary" | "destructive" | "outline"> {
    try {
      const planType = await this.getPaymentPlanType(termName);

      switch (planType) {
        case "invalid_booking":
          return "destructive";
        case "full_payment_48hrs":
          return "secondary";
        case "custom":
          return "outline";
        default:
          return "default";
      }
    } catch (error) {
      console.error("Error getting payment type badge variant:", error);
      return "default";
    }
  }
}

/**
 * React hook for using payment types in components
 */
export const usePaymentTypes = () => {
  // This would be implemented as a React hook in a separate file
  // For now, we'll return the utility class methods
  return {
    calculatePaymentAmount: PaymentTypeUtils.calculatePaymentAmount,
    getMonthlyPaymentBreakdown: PaymentTypeUtils.getMonthlyPaymentBreakdown,
    determinePaymentType: PaymentTypeUtils.determinePaymentType,
    getPaymentPlanType: PaymentTypeUtils.getPaymentPlanType,
    isValidPaymentPlan: PaymentTypeUtils.isValidPaymentPlan,
    getPaymentTypeColor: PaymentTypeUtils.getPaymentTypeColor,
    getPaymentTypeBadgeVariant: PaymentTypeUtils.getPaymentTypeBadgeVariant,
    clearCache: PaymentTypeUtils.clearCache,
  };
};
