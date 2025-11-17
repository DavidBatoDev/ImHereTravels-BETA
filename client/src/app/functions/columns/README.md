# Booking Sheet Columns

This directory contains all booking sheet column definitions organized by category. Each column is typed and includes its configuration and implementation.

## Structure

```
columns/
├── index.ts                      # Main export with helper functions
├── identifier/                   # Booking ID, codes, identifiers
├── traveler-information/         # Customer details
├── tour-details/                 # Tour information
├── payment-setting/              # Payment configuration
├── full-payment/                 # Full payment columns
├── payment-term-1/               # Payment term 1 (P1)
├── payment-term-2/               # Payment term 2 (P2)
├── payment-term-3/               # Payment term 3 (P3)
├── payment-term-4/               # Payment term 4 (P4)
├── reservation-email/            # Reservation email columns
├── cancellation/                 # Cancellation email columns
└── duo-or-group-booking/         # Group booking columns
```

## Column File Format

Each column file follows this structure:

```typescript
import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const columnNameColumn: BookingSheetColumn = {
  id: 'columnId',
  data: {
    id: 'columnId',
    columnName: 'Column Name',
    dataType: 'function' | 'string' | 'number' | 'date' | 'boolean' | 'select',
    function: 'functionNameFunction', // For function columns - string reference
    parentTab: 'Tab Name',
    order: 1,
    includeInForms: false,
    color: 'yellow',
    width: 200,
    arguments: [...], // For function columns
  },
};

// Column Function Implementation (for function-type columns)
export default function functionNameFunction(...args) {
  // Implementation
}
```

## System Injected Functions

Column functions have access to system utilities that are automatically injected at runtime:

### Firebase Utilities (`firebaseUtils`)

```typescript
// Authentication
firebaseUtils.getCurrentUser()        // Get current user
firebaseUtils.isAuthenticated()       // Check auth status
firebaseUtils.getUserId()             // Get user ID
firebaseUtils.ensureAuthenticated()   // Ensure user is authenticated

// Firestore Operations
firebaseUtils.getDocumentData(collection, docId)
firebaseUtils.getCollectionData(collection, constraints?)
firebaseUtils.addDocument(collection, data)
firebaseUtils.updateDocument(collection, docId, data)
firebaseUtils.deleteDocument(collection, docId)

// Reference Helpers
firebaseUtils.createDocRef(collection, docId?)
firebaseUtils.createCollectionRef(collection)
firebaseUtils.createStorageRef(path)
```

### Functions Utilities (`functionsUtils`)

```typescript
// Cloud Functions
functionsUtils.callFunction(functionName, data?)
functionsUtils.getFunctionConfig(functionName)
functionsUtils.listFunctions()

// Email Utilities
functionsUtils.emailUtils.generateReservationEmail(bookingId, generateDraftCell?)
functionsUtils.emailUtils.sendReservationEmail(draftId)

// Template Utilities
functionsUtils.templateUtils.processTemplate(template, variables)
functionsUtils.templateUtils.getTemplate(templateId)

// General Utilities
functionsUtils.utils.formatCurrency(value, currency?)
functionsUtils.utils.formatDate(date)
functionsUtils.utils.generateId()
functionsUtils.utils.sleep(ms)
```

### Firebase SDK Exports

```typescript
// Direct Firebase access
auth; // Firebase Auth instance
db; // Firestore database instance
storage; // Firebase Storage instance

// Firestore functions
collection, doc, getDocs, getDoc;
addDoc, updateDoc, deleteDoc;
query, where, orderBy, limit;
serverTimestamp, Timestamp;
```

### Usage in Column Functions

```typescript
export default function bookingCodeColumnFunction(bookingType: string) {
  // Use firebaseUtils directly - no imports needed
  const tourPackages = await firebaseUtils.getCollectionData("tourPackages");

  // Use Firestore functions
  const q = query(
    collection(db, "bookings"),
    where("tourCode", "==", tourCode)
  );

  // Use functionsUtils
  const formatted = functionsUtils.utils.formatDate(new Date());

  return generatedCode;
}
```

> **Note:** These utilities are injected at runtime by the function-execution-service. You don't need to import them in your column functions - they're available globally within the function execution context.

## Usage

### Import all columns

```typescript
import { allBookingSheetColumns } from "@/app/functions/columns";
```

### Import specific category

```typescript
import * as identifier from "@/app/functions/columns/identifier";
```

### Import specific column

```typescript
import { bookingIdColumn } from "@/app/functions/columns/identifier";
```

### Import system utilities (for external use)

```typescript
import { firebaseUtils, functionsUtils } from "@/app/functions/columns";
```

### Helper Functions

```typescript
import {
  getColumnById,
  getColumnsByParentTab,
  getColumnsByDataType,
  getFunctionColumns,
  getFormColumns,
} from "@/app/functions/columns";

// Get a specific column
const column = getColumnById("bookingId");

// Get all columns for a tab
const tourColumns = getColumnsByParentTab("Tour Details");

// Get all function columns
const functionCols = getFunctionColumns();

// Get columns that should appear in forms
const formCols = getFormColumns();
```

## Column Categories

### Identifier (7 columns)

- Booking ID, Booking Code, Tour Code
- Formatted Date, Traveller Initials
- Tour Package Name Unique Counter
- Delete

### Traveler Information (4 columns)

- Email Address, First Name, Last Name
- Full Name (computed)

### Tour Details (10 columns)

- Tour Package Name, Tour Date, Tour Duration
- Reservation Date, Return Date
- Days Between Booking and Tour Date
- Payment Condition, Available Payment Terms
- Eligible 2nd-of-Months, Booking Type

### Payment Setting (13 columns)

- Original Tour Cost, Discounted Tour Cost
- Payment Plan, Payment Method, Payment Condition
- Booking Status, Payment Progress
- Paid, Remaining Balance
- Reservation Fee, Manual Credit, Credit From
- Enable Payment Reminder, Guest Info Email Sent Link

### Full Payment (3 columns)

- Full Payment Amount
- Full Payment Due Date
- Full Payment Date Paid

### Payment Terms (7 columns each × 4 terms = 28 columns)

Each payment term (P1-P4) includes:

- Amount, Due Date, Date Paid
- Scheduled Reminder Date, Scheduled Email Link
- Calendar Event ID, Calendar Event Link

### Reservation Email (8 columns)

- Generate Email Draft, Email Draft Link
- Send Email, Sent Email Link
- Subject Line, Reservation Email Sent Date
- Include BCC, Use Discounted Tour Cost

### Cancellation (8 columns)

- Reason for Cancellation
- Generate Cancellation Email Draft
- Cancellation Email Draft Link
- Send Cancellation Email
- Sent Cancellation Email Link
- Subject Line, Cancellation Email Sent Date
- Include BCC

### Group Booking (3 columns)

- Group ID
- Group ID Generator
- Is Main Booker

## Total: 84 Columns

- 43 function-type columns with embedded implementations
- 41 data columns (string, number, date, boolean, select)
