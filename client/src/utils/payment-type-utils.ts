import { PaymentTermsService } from "@/services/payment-terms-service";
import { PaymentTermConfiguration } from "@/types/payment-terms";

/**
 * Utility functions for working with payment types throughout the application
 */
export class PaymentTypeUtils {
  private static paymentTypesCache: PaymentTermConfiguration[] | null = null;
  private static cacheTimestamp: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all active payment types with caching
   */
  static async getActivePaymentTypes(): Promise<PaymentTermConfiguration[]> {
    const now = Date.now();
    
    if (
      this.paymentTypesCache &&
      (now - this.cacheTimestamp) < this.CACHE_DURATION
    ) {
      return this.paymentTypesCache;
    }

    try {
      this.paymentTypesCache = await PaymentTermsService.getActivePaymentTerms();
      this.cacheTimestamp = now;
      return this.paymentTypesCache;
    } catch (error) {
      console.error("Failed to fetch payment types:", error);
      return [];
    }
  }

  /**
   * Check if a payment type exists and is active by name
   */
  static async isValidPaymentType(termName: string): Promise<boolean> {
    const activeTypes = await this.getActivePaymentTypes();
    return activeTypes.some(type => type.name === termName);
  }

  /**
   * Get payment type configuration by term name
   */
  static async getPaymentTypeConfig(termName: string): Promise<PaymentTermConfiguration | null> {
    const activeTypes = await this.getActivePaymentTypes();
    return activeTypes.find(type => type.name === termName) || null;
  }

  /**
   * Get payment types formatted for select dropdowns
   */
  static async getPaymentTypeOptions(): Promise<{ value: string; label: string; description: string }[]> {
    const activeTypes = await this.getActivePaymentTypes();
    return activeTypes.map(type => ({
      value: type.id,
      label: type.name,
      description: type.description
    }));
  }

  /**
   * Calculate payment schedule based on payment type name
   */
  static async calculatePaymentAmount(
    termName: string,
    totalCost: number
  ): Promise<{ reservationFee: number; remainingBalance: number } | null> {
    const config = await this.getPaymentTypeConfig(termName);
    
    if (!config || !config.percentage) {
      return { reservationFee: totalCost, remainingBalance: 0 }; // Full payment
    }

    const reservationFee = (totalCost * config.percentage) / 100;
    const remainingBalance = totalCost - reservationFee;

    return { reservationFee, remainingBalance };
  }

  /**
   * Determine payment type based on reservation and tour dates
   */
  static async determinePaymentType(
    reservationDate: Date,
    tourDate: Date
  ): Promise<string> {
    const activeTypes = await this.getActivePaymentTypes();
    const daysDifference = Math.ceil((tourDate.getTime() - reservationDate.getTime()) / (1000 * 60 * 60 * 24));

    // Sort by daysRequired ascending to check from strictest to most lenient
    const sortedTypes = activeTypes
      .filter(type => type.isActive)
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
  static getPaymentTypeColor(termName: string): string {
    const colorMap: Record<string, string> = {
      "Invalid Booking": "bg-red-100 text-red-800 border-red-200",
      "Full Payment Required": "bg-amber-100 text-amber-800 border-amber-200",
      "Payment Plan P1": "bg-blue-100 text-blue-800 border-blue-200",
      "Payment Plan P2": "bg-violet-100 text-violet-800 border-violet-200",
      "Payment Plan P3": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "Payment Plan P4": "bg-cyan-100 text-cyan-800 border-cyan-200",
    };
    return colorMap[termName] || "bg-gray-100 text-gray-800 border-gray-200";
  }
}

/**
 * React hook for using payment types in components
 */
export const usePaymentTypes = () => {
  const getActivePaymentTypes = () => PaymentTypeUtils.getActivePaymentTypes();
  const getPaymentTypeOptions = () => PaymentTypeUtils.getPaymentTypeOptions();
  const isValidPaymentType = (termName: string) => PaymentTypeUtils.isValidPaymentType(termName);
  const calculatePaymentAmount = (termName: string, totalCost: number) => 
    PaymentTypeUtils.calculatePaymentAmount(termName, totalCost);
  const determinePaymentType = (reservationDate: Date, tourDate: Date) =>
    PaymentTypeUtils.determinePaymentType(reservationDate, tourDate);

  return {
    getActivePaymentTypes,
    getPaymentTypeOptions,
    isValidPaymentType,
    calculatePaymentAmount,
    determinePaymentType,
  };
};
