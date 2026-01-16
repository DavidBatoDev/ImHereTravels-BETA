import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const paymentPlanColumn: BookingSheetColumn = {
  id: "paymentPlan",
  data: {
    id: "paymentPlan",
    columnName: "Payment Plan",
    dataType: "select",
    parentTab: "Payment Setting",
    order: 40,
    includeInForms: true,
    width: 162.6666259765625,
    options: ["", "Full Payment", "P1", "P2", "P3", "P4"], // Fallback static options

    // Context-aware dynamic options based on Available Payment Terms
    loadOptions: async (context?: { formData?: any }) => {
      const availablePaymentTerms =
        context?.formData?.availablePaymentTerms || "";

      // Handle "Invalid Booking" case
      if (availablePaymentTerms === "Invalid") {
        return [""];
      }

      // Handle "Last Minute Booking" case
      if (availablePaymentTerms === "Full payment required within 48hrs") {
        return ["", "Full Payment"];
      }

      // Handle "Cancelled" case
      if (availablePaymentTerms === "Cancelled") {
        return [""];
      }

      // Handle Standard Booking cases (P1, P2, P3, P4)
      const match = availablePaymentTerms.match(/^P(\d)$/);
      if (match) {
        const maxPlanNumber = parseInt(match[1], 10);
        const baseOptions = ["", "Full Payment"];

        // Add P1, P2, P3, P4 based on the max plan number
        for (let i = 1; i <= maxPlanNumber && i <= 4; i++) {
          baseOptions.push(`P${i}`);
        }

        return baseOptions;
      }

      // Default fallback for all other cases or when no payment condition is set
      return ["", "Full Payment", "P1", "P2", "P3", "P4"];
    },
  },
};
