import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const paymentProgressColumn: BookingSheetColumn = {
  id: "paymentProgress",
  data: {
    id: "paymentProgress",
    columnName: "Payment Progress",
    dataType: "function",
    function: "paymentProgressFunction",
    parentTab: "Payment Setting",
    includeInForms: false,
    color: "yellow",
    width: 140,
    arguments: [
      {
        name: "bookingStatus",
        type: "string",
        columnReference: "Booking Status",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paymentPlan",
        type: "string",
        columnReference: "Payment Plan",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "fullPaymentDatePaid",
        type: "any",
        columnReference: "Full Payment Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p1DatePaid",
        type: "any",
        columnReference: "P1 Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p2DatePaid",
        type: "any",
        columnReference: "P2 Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p3DatePaid",
        type: "any",
        columnReference: "P3 Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "p4DatePaid",
        type: "any",
        columnReference: "P4 Date Paid",
        isOptional: false,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
/**
 * Payment Progress Percentage (Excel Translation)
 *
 * Logic:
 * - Blank if booking status is blank or "Cancelled"
 * - Based on Payment Plan ("Full Payment", "P1", "P2", "P3", "P4")
 * - Counts how many payment slots are paid, then returns "XX%"
 */
export default function paymentProgressFunction(
  bookingStatus: string | null | undefined,
  paymentPlan: string | null | undefined,
  fullPaymentDatePaid: any,
  p1DatePaid: any,
  p2DatePaid: any,
  p3DatePaid: any,
  p4DatePaid: any
): string {
  // --- 1️⃣ Handle blank or cancelled ---
  if (!bookingStatus || bookingStatus.trim() === "") return "";
  if (bookingStatus.trim().toLowerCase() === "cancelled") return "";

  // --- 2️⃣ Normalize plan ---
  const plan = (paymentPlan || "").trim().toUpperCase();

  // --- 3️⃣ Universal date parser (handles Firestore timestamps too) ---
  const toDate = (d: any): Date | null => {
    if (!d) return null;

    // Firestore Timestamp (type-based)
    if (typeof d === "object" && d?.type === "firestore/timestamp/1.0") {
      return new Date(d.seconds * 1000);
    }

    // Firestore Timestamp (native format)
    if (typeof d?.seconds === "number" && typeof d?.nanoseconds === "number") {
      return new Date(d.seconds * 1000);
    }

    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;

    if (typeof d === "string") {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  };

  const isPaid = (d: any): boolean => {
    const date = toDate(d);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // --- 4️⃣ Handle Full Payment ---
  if (plan.includes("FULL PAYMENT")) {
    return isPaid(fullPaymentDatePaid) ? "100%" : "0%";
  }

  // --- 5️⃣ Handle Installment Plans ---
  if (plan.includes("P1")) {
    return isPaid(p1DatePaid) ? "100%" : "0%";
  }

  if (plan.includes("P2")) {
    const p1 = isPaid(p1DatePaid) ? 1 : 0;
    const p2 = isPaid(p2DatePaid) ? 1 : 0;
    const pct = Math.round(((p1 + p2) / 2) * 100);
    return `${pct}%`;
  }

  if (plan.includes("P3")) {
    const p1 = isPaid(p1DatePaid) ? 1 : 0;
    const p2 = isPaid(p2DatePaid) ? 1 : 0;
    const p3 = isPaid(p3DatePaid) ? 1 : 0;
    const pct = Math.round(((p1 + p2 + p3) / 3) * 100);
    return `${pct}%`;
  }

  if (plan.includes("P4")) {
    const p1 = isPaid(p1DatePaid) ? 1 : 0;
    const p2 = isPaid(p2DatePaid) ? 1 : 0;
    const p3 = isPaid(p3DatePaid) ? 1 : 0;
    const p4 = isPaid(p4DatePaid) ? 1 : 0;
    const pct = Math.round(((p1 + p2 + p3 + p4) / 4) * 100);
    return `${pct}%`;
  }

  // --- 6️⃣ Default case ---
  return "0%";
}
