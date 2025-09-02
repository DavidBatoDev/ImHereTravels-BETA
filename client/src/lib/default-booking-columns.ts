import { SheetColumn } from "@/types/sheet-management";
export const defaultBookingColumns: Omit<SheetColumn, "id">[] = [
  {
    columnName: "Booking ID",
    dataType: "string",
    includeInForms: true,

    width: 120,
    order: 1,
  },
  {
    columnName: "Booking Code",
    dataType: "string",
    includeInForms: true,

    width: 120,
    order: 2,
  },
  {
    columnName: "Tour Code",
    dataType: "string",
    includeInForms: true,

    width: 120,
    order: 3,
  },
  {
    columnName: "Reservation Date",
    dataType: "date",
    includeInForms: true,

    width: 140,
    order: 4,
  },
  {
    columnName: "Booking Type",
    dataType: "select",
    includeInForms: true,

    width: 120,
    options: ["Individual", "Group", "Corporate"],
    order: 5,
  },
  {
    columnName: "Booking Status",
    dataType: "select",
    includeInForms: true,

    width: 120,
    options: ["Confirmed", "Pending", "Cancelled", "Completed"],
    order: 6,
  },
  {
    columnName: "Days Between Booking and Tour Date",
    dataType: "number",
    includeInForms: false,

    width: 200,
    order: 7,
  },
  {
    columnName: "Group ID / Group ID Generator",
    dataType: "string",
    includeInForms: true,

    width: 180,
    order: 8,
  },
  {
    columnName: "Is Main Booker?",
    dataType: "boolean",
    includeInForms: true,

    width: 140,
    order: 9,
  },
  {
    columnName: "Delete",
    dataType: "function",
    includeInForms: false, // Function columns are never included in forms

    width: 80,
    order: 10,
  },
  {
    columnName: "Traveller Initials",
    dataType: "string",
    includeInForms: true,

    width: 140,
    order: 11,
  },
  {
    columnName: "First Name",
    dataType: "string",
    includeInForms: true,

    width: 120,
    order: 12,
  },
  {
    columnName: "Last Name",
    dataType: "string",
    includeInForms: true,

    width: 120,
    order: 13,
  },
  {
    columnName: "Full Name",
    dataType: "string",
    includeInForms: false,

    width: 150,
    order: 14,
  },
  {
    columnName: "Email Address",
    dataType: "email",
    includeInForms: true,

    width: 200,
    order: 15,
  },
  {
    columnName: "Tour Package Name Unique Counter",
    dataType: "number",
    includeInForms: true,

    width: 220,
    order: 16,
  },
  {
    columnName: "Tour Package Name",
    dataType: "string",
    includeInForms: true,

    width: 200,
    order: 17,
  },
  {
    columnName: "Formatted Date",
    dataType: "string",
    includeInForms: false,

    width: 120,
    order: 18,
  },
  {
    columnName: "Tour Date",
    dataType: "date",
    includeInForms: true,

    width: 120,
    order: 19,
  },
  {
    columnName: "Return Date",
    dataType: "date",
    includeInForms: true,

    width: 120,
    order: 20,
  },
  {
    columnName: "Tour Duration",
    dataType: "number",
    includeInForms: true,

    width: 120,
    order: 21,
  },
  {
    columnName: "Use Discounted Tour Cost?",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 22,
  },
  {
    columnName: "Original Tour Cost",
    dataType: "currency",
    includeInForms: true,

    width: 140,
    order: 23,
  },
  {
    columnName: "Discounted Tour Cost",
    dataType: "currency",
    includeInForms: true,

    width: 140,
    order: 24,
  },
  {
    columnName: "Reservation Email",
    dataType: "email",
    includeInForms: true,

    width: 200,
    order: 25,
  },
  {
    columnName: "Include BCC (Reservation)",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 26,
  },
  {
    columnName: "Generate Email Draft",
    dataType: "boolean",
    includeInForms: true,

    width: 160,
    order: 27,
  },
  {
    columnName: "Email Draft Link",
    dataType: "string",
    includeInForms: false,

    width: 160,
    order: 28,
  },
  {
    columnName: "Subject Line (Reservation)",
    dataType: "string",
    includeInForms: true,

    width: 200,
    order: 29,
  },
  {
    columnName: "Send Email?",
    dataType: "boolean",
    includeInForms: true,

    width: 120,
    order: 30,
  },
  {
    columnName: "Sent Email Link",
    dataType: "string",
    includeInForms: false,

    width: 160,
    order: 31,
  },
  {
    columnName: "Reservation Email Sent Date",
    dataType: "date",
    includeInForms: false,

    width: 200,
    order: 32,
  },
  {
    columnName: "Payment Condition",
    dataType: "select",
    includeInForms: true,

    width: 140,
    options: ["Full Payment", "Partial Payment", "Installment"],
    order: 33,
  },
  {
    columnName: "Eligible 2nd-of-Months",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 34,
  },
  {
    columnName: "Available Payment Terms",
    dataType: "string",
    includeInForms: true,

    width: 180,
    order: 35,
  },
  {
    columnName: "Payment Plan",
    dataType: "select",
    includeInForms: true,

    width: 140,
    options: ["Monthly", "Quarterly", "Custom"],
    order: 36,
  },
  {
    columnName: "Payment Method",
    dataType: "select",
    includeInForms: true,

    width: 140,
    options: ["Credit Card", "Bank Transfer", "Cash", "PayPal"],
    order: 37,
  },
  {
    columnName: "Enable Payment Reminder",
    dataType: "boolean",
    includeInForms: true,

    width: 160,
    order: 38,
  },
  {
    columnName: "Payment Progress",
    dataType: "number",
    includeInForms: false,

    width: 140,
    order: 39,
  },
  {
    columnName: "Full Payment",
    dataType: "currency",
    includeInForms: true,

    width: 140,
    order: 40,
  },
  {
    columnName: "Full Payment Due Date",
    dataType: "date",
    includeInForms: true,

    width: 160,
    order: 41,
  },
  {
    columnName: "Full Payment Amount",
    dataType: "currency",
    includeInForms: true,

    width: 160,
    order: 42,
  },
  {
    columnName: "Full Payment Date Paid",
    dataType: "date",
    includeInForms: true,

    width: 160,
    order: 43,
  },
  {
    columnName:
      "Payment Term 1 (Due Date, Amount, Date Paid, Reminder, Email Link, Calendar Event ID/Link)",
    dataType: "string",
    includeInForms: true,

    width: 300,
    order: 44,
  },
  {
    columnName: "Payment Term 2 (same structure)",
    dataType: "string",
    includeInForms: true,

    width: 300,
    order: 45,
  },
  {
    columnName: "Payment Term 3 (same structure)",
    dataType: "string",
    includeInForms: true,

    width: 300,
    order: 46,
  },
  {
    columnName: "Payment Term 4 (same structure)",
    dataType: "string",
    includeInForms: true,

    width: 300,
    order: 47,
  },
  {
    columnName: "Reservation Fee",
    dataType: "currency",
    includeInForms: true,

    width: 140,
    order: 48,
  },
  {
    columnName: "Paid",
    dataType: "currency",
    includeInForms: true,

    width: 100,
    order: 49,
  },
  {
    columnName: "Remaining Balance",
    dataType: "currency",
    includeInForms: false,

    width: 140,
    order: 50,
  },
  {
    columnName: "Manual Credit",
    dataType: "currency",
    includeInForms: true,

    width: 140,
    order: 51,
  },
  {
    columnName: "Credit From",
    dataType: "string",
    includeInForms: true,

    width: 120,
    order: 52,
  },
  {
    columnName: "Reason for Cancellation",
    dataType: "string",
    includeInForms: true,

    width: 200,
    order: 53,
  },
  {
    columnName: "Include BCC (Cancellation)",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 54,
  },
  {
    columnName: "Generate Cancellation Email Draft",
    dataType: "boolean",
    includeInForms: true,

    width: 200,
    order: 55,
  },
  {
    columnName: "Cancellation Email Draft Link",
    dataType: "string",
    includeInForms: false,

    width: 200,
    order: 56,
  },
  {
    columnName: "Subject Line (Cancellation)",
    dataType: "string",
    includeInForms: true,

    width: 200,
    order: 57,
  },
  {
    columnName: "Send Cancellation Email?",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 58,
  },
  {
    columnName: "Sent Cancellation Email Link",
    dataType: "string",
    includeInForms: false,

    width: 200,
    order: 59,
  },
  {
    columnName: "Cancellation Email Sent Date",
    dataType: "date",
    includeInForms: false,

    width: 200,
    order: 60,
  },
];
