import { BookingSheetColumn } from "@/types/booking-sheet-column";

export const p3DueDateColumn: BookingSheetColumn = {
  id: "p3DueDate",
  data: {
    id: "p3DueDate",
    columnName: "P3 Due Date",
    dataType: "function",
    function: "getP3DueDateFunction",
    parentTab: "Payment Term 3",
    includeInForms: false,
    color: "yellow",
    width: 120,
    arguments: [
      {
        name: "reservationDate",
        type: "unknown",
        columnReference: "Reservation Date",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "tourDate",
        type: "unknown",
        columnReference: "Tour Date",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paymentPlan",
        type: "string",
        columnReference: "Payment Plan",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
      {
        name: "paymentCondition",
        type: "string",
        columnReference: "Payment Condition",
        isOptional: true,
        hasDefault: false,
        isRest: false,
        value: "",
      },
    ],
  },
};

// Column Function Implementation
export function tourDateToYyyymmdd(tourDate: unknown): string {
  if (tourDate === null || tourDate === undefined) return "";
  if (typeof tourDate === "string" && tourDate.trim() === "") return "";
  let date: Date | null = null;

  try {
    if (
      typeof tourDate === "object" &&
      tourDate !== null &&
      "toDate" in (tourDate as any)
    ) {
      date = (tourDate as any).toDate();
    } else if (
      typeof tourDate === "object" &&
      tourDate !== null &&
      "seconds" in (tourDate as any)
    ) {
      const s = (tourDate as any).seconds;
      date = new Date(s * 1000);
    } else if (tourDate instanceof Date) {
      date = tourDate;
    } else if (typeof tourDate === "number") {
      date = new Date(tourDate);
    } else if (typeof tourDate === "string") {
      const raw = tourDate.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        const [dd, mm, yyyy] = raw.split("/").map(Number);
        date = new Date(yyyy, mm - 1, dd);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [yyyy, mm, dd] = raw.split("-").map(Number);
        date = new Date(yyyy, mm - 1, dd);
      } else {
        const parsed = new Date(raw);
        date = isNaN(parsed.getTime()) ? null : parsed;
      }
    } else return "ERROR";

    if (!date || isNaN(date.getTime())) return "ERROR";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  } catch {
    return "ERROR";
  }
}

export default function getP3DueDateFunction(
  reservationDate?: unknown,
  tourDate?: unknown,
  paymentPlan?: string,
  paymentCondition?: string,
): string | "" | "ERROR" {
  if (["Full Payment", "P1", "P2"].includes(paymentPlan ?? "")) return "";
  if (!reservationDate) return "";

  const validConditions = ["Standard Booking, P3", "Standard Booking, P4"];
  if (!validConditions.includes(paymentCondition ?? "")) return "";

  const resYmd = tourDateToYyyymmdd(reservationDate);
  const tourYmd = tourDateToYyyymmdd(tourDate);
  if (resYmd === "" || tourYmd === "") return "";
  if (resYmd === "ERROR" || tourYmd === "ERROR") return "ERROR";

  const res = new Date(resYmd);
  const tour = new Date(tourYmd);
  const monthCount =
    (tour.getFullYear() - res.getFullYear()) * 12 +
    (tour.getMonth() - res.getMonth()) +
    1;

  const DAY_MS = 86400000;
  // Generate the last day of each month (using day 0 of next month)
  const lastDayDates = Array.from(
    { length: monthCount },
    (_, i) => new Date(res.getFullYear(), res.getMonth() + i + 1, 0),
  );
  const validDates = lastDayDates.filter(
    (d) =>
      d.getTime() > res.getTime() + 2 * DAY_MS &&
      d.getTime() <= tour.getTime() - 3 * DAY_MS,
  );

  if (validDates.length < 3) return "";
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // If payment plan is selected (P3 or P4), return only the 3rd date
  // Otherwise return all three dates comma-separated (when no payment plan)
  if (paymentPlan && ["P3", "P4"].includes(paymentPlan)) {
    return fmt(validDates[2]);
  }

  return [0, 1, 2].map((i) => fmt(validDates[i])).join(", ");
}
