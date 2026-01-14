import { SheetColumn } from "@/types/sheet-management";
export const defaultBookingColumns: Omit<SheetColumn, "id">[] = [
  {
    columnName: "Booking ID",
    dataType: "string",
    includeInForms: true,
    parentTab: "Core Booking",
    width: 120,
    order: 1,
  },
  {
    columnName: "Booking Code",
    dataType: "string",
    includeInForms: true,

    parentTab: "Core Booking",

    width: 120,
    order: 2,
  },
  {
    columnName: "Tour Code",
    dataType: "string",
    includeInForms: true,

    parentTab: "Core Booking",

    width: 120,
    order: 3,
  },
  {
    columnName: "Reservation Date",
    dataType: "date",
    includeInForms: true,

    parentTab: "Core Booking",

    width: 140,
    order: 4,
  },
  {
    columnName: "Booking Type",
    dataType: "select",
    includeInForms: true,

    parentTab: "Core Booking",

    width: 120,
    options: ["Individual", "Group", "Corporate"],
    order: 5,
  },
  {
    columnName: "Booking Status",
    dataType: "select",
    includeInForms: true,

    parentTab: "Core Booking",

    width: 120,
    options: ["Confirmed", "Pending", "Cancelled", "Completed"],
    order: 6,
  },
  {
    columnName: "Days Between Booking and Tour Date",
    dataType: "number",
    includeInForms: false,

    parentTab: "Core Booking",

    width: 200,
    order: 7,
  },
  {
    columnName: "Group ID / Group ID Generator",
    dataType: "string",
    includeInForms: true,

    parentTab: "Core Booking",

    width: 180,
    order: 8,
  },
  {
    columnName: "Event Name",
    dataType: "select",
    includeInForms: true,

    parentTab: "Discounts",

    width: 180,
    options: [], // Will be dynamically populated from discount events
    order: 9,
  },
  {
    columnName: "Discount Type",
    dataType: "function",
    includeInForms: true,

    parentTab: "Discounts",

    width: 120,
    order: 9.5,
  },
  {
    columnName: "Discount",
    dataType: "function",
    includeInForms: true,

    parentTab: "Discounts",

    width: 120,
    order: 10,
  },
  {
    columnName: "Is Main Booker?",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Core Booking",

    width: 140,
    order: 11,
  },
  {
    columnName: "Delete",
    dataType: "function",
    includeInForms: false, // Function columns are never included in forms

    width: 80,
    order: 12,
  },
  {
    columnName: "Traveller Initials",
    dataType: "string",
    includeInForms: true,

    parentTab: "Traveller Information",

    width: 140,
    order: 13,
  },
  {
    columnName: "First Name",
    dataType: "string",
    includeInForms: true,

    parentTab: "Traveller Information",

    width: 120,
    order: 14,
  },
  {
    columnName: "Last Name",
    dataType: "string",
    includeInForms: true,

    parentTab: "Traveller Information",

    width: 120,
    order: 15,
  },
  {
    columnName: "Full Name",
    dataType: "string",
    includeInForms: false,

    parentTab: "Traveller Information",

    width: 150,
    order: 16,
  },
  {
    columnName: "Email Address",
    dataType: "email",
    includeInForms: true,

    parentTab: "Traveller Information",

    width: 200,
    order: 17,
  },
  {
    columnName: "Tour Package Name Unique Counter",
    dataType: "number",
    includeInForms: true,

    parentTab: "Tour Details",

    width: 220,
    order: 18,
  },
  {
    columnName: "Tour Package Name",
    dataType: "string",
    includeInForms: true,

    parentTab: "Tour Details",

    width: 200,
    order: 19,
  },
  {
    columnName: "Formatted Date",
    dataType: "string",
    includeInForms: false,

    parentTab: "Tour Details",

    width: 120,
    order: 20,
  },
  {
    columnName: "Tour Date",
    dataType: "date",
    includeInForms: true,

    parentTab: "Tour Details",

    width: 120,
    order: 21,
  },
  {
    columnName: "Return Date",
    dataType: "date",
    includeInForms: true,

    parentTab: "Tour Details",

    width: 120,
    order: 22,
  },
  {
    columnName: "Tour Duration",
    dataType: "string",
    includeInForms: true,

    parentTab: "Tour Details",

    width: 120,
    order: 23,
  },
  {
    columnName: "Use Discounted Tour Cost?",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Pricing",

    width: 180,
    order: 24,
  },
  {
    columnName: "Original Tour Cost",
    dataType: "function",
    includeInForms: false,

    parentTab: "Pricing",

    width: 140,
    order: 27,
  },
  {
    columnName: "Discounted Tour Cost",
    dataType: "currency",
    includeInForms: true,

    parentTab: "Pricing",

    width: 140,
    order: 42,
  },
  {
    columnName: "Include BCC (Reservation)",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Email Management - Reservation",

    width: 180,
    order: 43,
  },
  {
    columnName: "Generate Email Draft",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Email Management - Reservation",

    width: 160,
    order: 42,
  },
  {
    columnName: "Email Draft Link",
    dataType: "string",
    includeInForms: false,

    parentTab: "Email Management - Reservation",

    width: 160,
    order: 43,
  },
  {
    columnName: "Subject Line (Reservation)",
    dataType: "string",
    includeInForms: true,

    parentTab: "Email Management - Reservation",

    width: 200,
    order: 42,
  },
  {
    columnName: "Send Email?",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Email Management - Reservation",

    width: 120,
    order: 43,
  },
  {
    columnName: "Sent Email Link",
    dataType: "string",
    includeInForms: false,

    parentTab: "Email Management - Reservation",

    width: 160,
    order: 42,
  },
  {
    columnName: "Reservation Email Sent Date",
    dataType: "date",
    includeInForms: false,

    parentTab: "Email Management - Reservation",

    width: 200,
    order: 43,
  },
  {
    columnName: "Payment Condition",
    dataType: "select",
    includeInForms: true,

    parentTab: "Payment Terms",

    width: 140,
    options: ["Full Payment", "Partial Payment", "Installment"],
    order: 42,
  },
  {
    columnName: "Eligible 2nd-of-Months",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Payment Terms",

    width: 180,
    order: 43,
  },
  {
    columnName: "Available Payment Terms",
    dataType: "string",
    includeInForms: true,

    parentTab: "Payment Terms",

    width: 180,
    order: 42,
  },
  {
    columnName: "Payment Plan",
    dataType: "select",
    includeInForms: true,

    parentTab: "Payment Terms",

    width: 140,
    options: ["Monthly", "Quarterly", "Custom"],
    order: 43,
  },
  {
    columnName: "Payment Method",
    dataType: "select",
    includeInForms: true,

    parentTab: "Payment Terms",

    width: 140,
    options: ["Credit Card", "Bank Transfer", "Cash", "PayPal"],
    order: 42,
  },
  {
    columnName: "Enable Payment Reminder",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Payment Terms",

    width: 160,
    order: 42,
  },
  {
    columnName: "Sent Initial Reminder Link",
    dataType: "string",
    includeInForms: false,

    parentTab: "Payment Setting",

    width: 200,
    order: 43,
  },
  {
    columnName: "Booking Status",
    dataType: "string",
    includeInForms: false,

    parentTab: "Payment Setting",

    width: 168,
    order: 44,
  },
  {
    columnName: "Payment Progress",
    dataType: "number",
    includeInForms: false,

    parentTab: "Payment Terms",

    width: 140,
    order: 45,
  },
  {
    columnName: "Guest Info Email Sent Link",
    dataType: "string",
    includeInForms: true,

    parentTab: "Payment Setting",

    width: 200,
    order: 46,
  },
  {
    columnName: "Full Payment Due Date",
    dataType: "date",
    includeInForms: true,

    parentTab: "Payment Details",

    width: 160,
    order: 47,
  },
  {
    columnName: "Full Payment Amount",
    dataType: "currency",
    includeInForms: true,

    parentTab: "Payment Details",

    width: 160,
    order: 48,
  },
  {
    columnName: "Full Payment Date Paid",
    dataType: "date",
    includeInForms: true,

    parentTab: "Payment Details",

    width: 160,
    order: 49,
  },
  // P1 Payment Term columns
  {
    columnName: "P1 Scheduled Reminder Date",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 180,
    order: 50,
  },
  {
    columnName: "P1 Scheduled Email Link",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 180,
    order: 51,
  },
  {
    columnName: "P1 Calendar Event ID",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 160,
    order: 52,
  },
  {
    columnName: "P1 Calendar Event Link",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 160,
    order: 53,
  },
  {
    columnName: "P1 Due Date",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 54,
  },
  {
    columnName: "P1 Amount",
    dataType: "currency",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 55,
  },
  {
    columnName: "P1 Date Paid",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 56,
  },

  // P2 Payment Term columns
  {
    columnName: "P2 Scheduled Reminder Date",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 180,
    order: 57,
  },
  {
    columnName: "P2 Scheduled Email Link",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 180,
    order: 58,
  },
  {
    columnName: "P2 Calendar Event ID",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 160,
    order: 59,
  },
  {
    columnName: "P2 Calendar Event Link",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 160,
    order: 60,
  },
  {
    columnName: "P2 Due Date",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 61,
  },
  {
    columnName: "P2 Amount",
    dataType: "currency",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 62,
  },
  {
    columnName: "P2 Date Paid",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 63,
  },

  // P3 Payment Term columns
  {
    columnName: "P3 Scheduled Reminder Date",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 180,
    order: 64,
  },
  {
    columnName: "P3 Scheduled Email Link",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 180,
    order: 65,
  },
  {
    columnName: "P3 Calendar Event ID",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 160,
    order: 66,
  },
  {
    columnName: "P3 Calendar Event Link",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 160,
    order: 67,
  },
  {
    columnName: "P3 Due Date",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 68,
  },
  {
    columnName: "P3 Amount",
    dataType: "currency",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 69,
  },
  {
    columnName: "P3 Date Paid",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 70,
  },

  // P4 Payment Term columns
  {
    columnName: "P4 Scheduled Reminder Date",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 180,
    order: 71,
  },
  {
    columnName: "P4 Scheduled Email Link",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 180,
    order: 72,
  },
  {
    columnName: "P4 Calendar Event ID",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 160,
    order: 73,
  },
  {
    columnName: "P4 Calendar Event Link",
    dataType: "string",
    includeInForms: false,
    parentTab: "Payment Details",
    width: 160,
    order: 74,
  },
  {
    columnName: "P4 Due Date",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 75,
  },
  {
    columnName: "P4 Amount",
    dataType: "currency",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 76,
  },
  {
    columnName: "P4 Date Paid",
    dataType: "date",
    includeInForms: true,
    parentTab: "Payment Details",
    width: 120,
    order: 77,
  },
  {
    columnName: "Reservation Fee",
    dataType: "currency",
    includeInForms: true,

    parentTab: "Payment Details",

    width: 140,
    order: 35,
  },
  {
    columnName: "Paid",
    dataType: "currency",
    includeInForms: true,

    parentTab: "Payment Details",

    width: 100,
    order: 36,
  },
  {
    columnName: "Remaining Balance",
    dataType: "currency",
    includeInForms: false,

    parentTab: "Payment Details",

    width: 140,
    order: 37,
  },
  {
    columnName: "Manual Credit",
    dataType: "currency",
    includeInForms: true,

    parentTab: "Payment Details",

    width: 140,
    order: 38,
  },
  {
    columnName: "Credit From",
    dataType: "string",
    includeInForms: true,

    parentTab: "Payment Details",

    width: 120,
    order: 39,
  },
  {
    columnName: "Reason for Cancellation",
    dataType: "string",
    includeInForms: true,

    parentTab: "Cancellation Management",

    width: 200,
    order: 78,
  },
  {
    columnName: "Include BCC (Cancellation)",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Cancellation Management",

    width: 180,
    order: 79,
  },
  {
    columnName: "Generate Cancellation Email Draft",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Cancellation Management",

    width: 200,
    order: 80,
  },
  {
    columnName: "Cancellation Email Draft Link",
    dataType: "string",
    includeInForms: false,

    parentTab: "Cancellation Management",

    width: 200,
    order: 81,
  },
  {
    columnName: "Subject Line (Cancellation)",
    dataType: "string",
    includeInForms: true,

    parentTab: "Cancellation Management",

    width: 200,
    order: 82,
  },
  {
    columnName: "Send Cancellation Email?",
    dataType: "boolean",
    includeInForms: true,

    parentTab: "Cancellation Management",

    width: 180,
    order: 83,
  },
  {
    columnName: "Sent Cancellation Email Link",
    dataType: "string",
    includeInForms: false,

    parentTab: "Cancellation Management",

    width: 200,
    order: 84,
  },
  {
    columnName: "Cancellation Email Sent Date",
    dataType: "date",
    includeInForms: false,

    width: 200,
    order: 85,
  },
];
