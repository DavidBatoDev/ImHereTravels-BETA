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
    columnName: "Include BCC (Reservation)",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 25,
  },
  {
    columnName: "Generate Email Draft",
    dataType: "boolean",
    includeInForms: true,

    width: 160,
    order: 26,
  },
  {
    columnName: "Email Draft Link",
    dataType: "string",
    includeInForms: false,

    width: 160,
    order: 27,
  },
  {
    columnName: "Subject Line (Reservation)",
    dataType: "string",
    includeInForms: true,

    width: 200,
    order: 28,
  },
  {
    columnName: "Send Email?",
    dataType: "boolean",
    includeInForms: true,

    width: 120,
    order: 29,
  },
  {
    columnName: "Sent Email Link",
    dataType: "string",
    includeInForms: false,

    width: 160,
    order: 30,
  },
  {
    columnName: "Reservation Email Sent Date",
    dataType: "date",
    includeInForms: false,

    width: 200,
    order: 31,
  },
  {
    columnName: "Payment Condition",
    dataType: "select",
    includeInForms: true,

    width: 140,
    options: ["Full Payment", "Partial Payment", "Installment"],
    order: 32,
  },
  {
    columnName: "Eligible 2nd-of-Months",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 33,
  },
  {
    columnName: "Available Payment Terms",
    dataType: "string",
    includeInForms: true,

    width: 180,
    order: 34,
  },
  {
    columnName: "Payment Plan",
    dataType: "select",
    includeInForms: true,

    width: 140,
    options: ["Monthly", "Quarterly", "Custom"],
    order: 35,
  },
  {
    columnName: "Payment Method",
    dataType: "select",
    includeInForms: true,

    width: 140,
    options: ["Credit Card", "Bank Transfer", "Cash", "PayPal"],
    order: 36,
  },
  {
    columnName: "Enable Payment Reminder",
    dataType: "boolean",
    includeInForms: true,

    width: 160,
    order: 37,
  },
  {
    columnName: "Payment Progress",
    dataType: "number",
    includeInForms: false,

    width: 140,
    order: 38,
  },
  {
    columnName: "Full Payment Due Date",
    dataType: "date",
    includeInForms: true,

    width: 160,
    order: 39,
  },
  {
    columnName: "Full Payment Amount",
    dataType: "currency",
    includeInForms: true,

    width: 160,
    order: 40,
  },
  {
    columnName: "Full Payment Date Paid",
    dataType: "date",
    includeInForms: true,

    width: 160,
    order: 41,
  },
  // P1 Payment Term columns
  {
    columnName: "P1 Scheduled Reminder Date",
    dataType: "date",
    includeInForms: true,
    width: 180,
    order: 44,
  },
  {
    columnName: "P1 Scheduled Email Link",
    dataType: "string",
    includeInForms: false,
    width: 180,
    order: 45,
  },
  {
    columnName: "P1 Calendar Event ID",
    dataType: "string",
    includeInForms: false,
    width: 160,
    order: 46,
  },
  {
    columnName: "P1 Calendar Event Link",
    dataType: "string",
    includeInForms: false,
    width: 160,
    order: 47,
  },
  {
    columnName: "P1 Due Date",
    dataType: "date",
    includeInForms: true,
    width: 120,
    order: 48,
  },
  {
    columnName: "P1 Amount",
    dataType: "currency",
    includeInForms: true,
    width: 120,
    order: 49,
  },
  {
    columnName: "P1 Date Paid",
    dataType: "date",
    includeInForms: true,
    width: 120,
    order: 50,
  },

  // P2 Payment Term columns
  {
    columnName: "P2 Scheduled Reminder Date",
    dataType: "date",
    includeInForms: true,
    width: 180,
    order: 51,
  },
  {
    columnName: "P2 Scheduled Email Link",
    dataType: "string",
    includeInForms: false,
    width: 180,
    order: 52,
  },
  {
    columnName: "P2 Calendar Event ID",
    dataType: "string",
    includeInForms: false,
    width: 160,
    order: 53,
  },
  {
    columnName: "P2 Calendar Event Link",
    dataType: "string",
    includeInForms: false,
    width: 160,
    order: 54,
  },
  {
    columnName: "P2 Due Date",
    dataType: "date",
    includeInForms: true,
    width: 120,
    order: 55,
  },
  {
    columnName: "P2 Amount",
    dataType: "currency",
    includeInForms: true,
    width: 120,
    order: 56,
  },
  {
    columnName: "P2 Date Paid",
    dataType: "date",
    includeInForms: true,
    width: 120,
    order: 57,
  },

  // P3 Payment Term columns
  {
    columnName: "P3 Scheduled Reminder Date",
    dataType: "date",
    includeInForms: true,
    width: 180,
    order: 58,
  },
  {
    columnName: "P3 Scheduled Email Link",
    dataType: "string",
    includeInForms: false,
    width: 180,
    order: 59,
  },
  {
    columnName: "P3 Calendar Event ID",
    dataType: "string",
    includeInForms: false,
    width: 160,
    order: 60,
  },
  {
    columnName: "P3 Calendar Event Link",
    dataType: "string",
    includeInForms: false,
    width: 160,
    order: 61,
  },
  {
    columnName: "P3 Due Date",
    dataType: "date",
    includeInForms: true,
    width: 120,
    order: 62,
  },
  {
    columnName: "P3 Amount",
    dataType: "currency",
    includeInForms: true,
    width: 120,
    order: 63,
  },
  {
    columnName: "P3 Date Paid",
    dataType: "date",
    includeInForms: true,
    width: 120,
    order: 64,
  },

  // P4 Payment Term columns
  {
    columnName: "P4 Scheduled Reminder Date",
    dataType: "date",
    includeInForms: true,
    width: 180,
    order: 65,
  },
  {
    columnName: "P4 Scheduled Email Link",
    dataType: "string",
    includeInForms: false,
    width: 180,
    order: 66,
  },
  {
    columnName: "P4 Calendar Event ID",
    dataType: "string",
    includeInForms: false,
    width: 160,
    order: 67,
  },
  {
    columnName: "P4 Calendar Event Link",
    dataType: "string",
    includeInForms: false,
    width: 160,
    order: 68,
  },
  {
    columnName: "P4 Due Date",
    dataType: "date",
    includeInForms: true,
    width: 120,
    order: 69,
  },
  {
    columnName: "P4 Amount",
    dataType: "currency",
    includeInForms: true,
    width: 120,
    order: 70,
  },
  {
    columnName: "P4 Date Paid",
    dataType: "date",
    includeInForms: true,
    width: 120,
    order: 71,
  },
  {
    columnName: "Reservation Fee",
    dataType: "currency",
    includeInForms: true,

    width: 140,
    order: 72,
  },
  {
    columnName: "Paid",
    dataType: "currency",
    includeInForms: true,

    width: 100,
    order: 73,
  },
  {
    columnName: "Remaining Balance",
    dataType: "currency",
    includeInForms: false,

    width: 140,
    order: 74,
  },
  {
    columnName: "Manual Credit",
    dataType: "currency",
    includeInForms: true,

    width: 140,
    order: 75,
  },
  {
    columnName: "Credit From",
    dataType: "string",
    includeInForms: true,

    width: 120,
    order: 76,
  },
  {
    columnName: "Reason for Cancellation",
    dataType: "string",
    includeInForms: true,

    width: 200,
    order: 77,
  },
  {
    columnName: "Include BCC (Cancellation)",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 78,
  },
  {
    columnName: "Generate Cancellation Email Draft",
    dataType: "boolean",
    includeInForms: true,

    width: 200,
    order: 79,
  },
  {
    columnName: "Cancellation Email Draft Link",
    dataType: "string",
    includeInForms: false,

    width: 200,
    order: 80,
  },
  {
    columnName: "Subject Line (Cancellation)",
    dataType: "string",
    includeInForms: true,

    width: 200,
    order: 81,
  },
  {
    columnName: "Send Cancellation Email?",
    dataType: "boolean",
    includeInForms: true,

    width: 180,
    order: 82,
  },
  {
    columnName: "Sent Cancellation Email Link",
    dataType: "string",
    includeInForms: false,

    width: 200,
    order: 83,
  },
  {
    columnName: "Cancellation Email Sent Date",
    dataType: "date",
    includeInForms: false,

    width: 200,
    order: 84,
  },
];
