# Firebase Runtime Injected Utilities Documentation

## Overview

This document provides comprehensive documentation for all utility functions that are automatically injected at runtime into TypeScript files stored in the Firebase `ts_files` collection. These utilities provide a DataCamp-style environment where users can access Firebase services without needing to import or configure them manually.

## Runtime Environment

All TypeScript functions in the `ts_files` collection are:

- **Pre-authenticated** with admin credentials (`admin@imheretravels.com`)
- **Transpiled** from TypeScript to JavaScript at runtime
- **Executed** in a sandboxed environment with Firebase utilities injected
- **Cached** for performance optimization

## Injected Global Variables

The following variables are automatically available in all TypeScript functions without any import statements:

### Core Firebase Services

- `auth` - Firebase Authentication instance
- `db` - Firestore database instance
- `storage` - Firebase Storage instance
- `functions` - Firebase Functions instance

### Firestore Functions

- `collection` - Create collection references
- `doc` - Create document references
- `getDocs` - Get multiple documents
- `addDoc` - Add new documents
- `updateDoc` - Update existing documents
- `deleteDoc` - Delete documents
- `query` - Build complex queries
- `where` - Add query constraints
- `orderBy` - Add ordering to queries
- `serverTimestamp` - Generate server timestamps

### Firebase Functions

- `httpsCallable` - Call Firebase Cloud Functions

## firebaseUtils Object

The `firebaseUtils` object provides high-level utility functions for common Firebase operations.

### User Information Utilities

#### `firebaseUtils.getCurrentUser()`

Gets the current authenticated user (always admin account).

```typescript
const user = firebaseUtils.getCurrentUser();
// Returns: { uid: "admin", email: "admin@imheretravels.com" }
```

#### `firebaseUtils.getUserId()`

Gets the current user ID (always admin user).

```typescript
const userId = firebaseUtils.getUserId();
// Returns: "admin"
```

### Reference Creation Utilities

#### `firebaseUtils.createDocRef(collectionName, docId?)`

Creates a Firestore document reference.

```typescript
// Create reference to specific document
const docRef = firebaseUtils.createDocRef("bookings", "booking123");

// Create reference to new document (auto-generated ID)
const newDocRef = firebaseUtils.createDocRef("bookings");
```

#### `firebaseUtils.createCollectionRef(collectionName)`

Creates a Firestore collection reference.

```typescript
const collectionRef = firebaseUtils.createCollectionRef("bookings");
```

#### `firebaseUtils.createStorageRef(path)`

Creates a Firebase Storage reference.

```typescript
const storageRef = firebaseUtils.createStorageRef("images/profile.jpg");
```

### Data Operations

#### `firebaseUtils.getDocumentData(collectionName, docId)`

Retrieves a single document from Firestore.

```typescript
const booking = await firebaseUtils.getDocumentData("bookings", "booking123");
// Returns: { id: 'booking123', ...documentData } or null if not found
```

#### `firebaseUtils.getCollectionData(collectionName, constraints?)`

Retrieves multiple documents from a collection with optional query constraints.

```typescript
// Get all documents
const allBookings = await firebaseUtils.getCollectionData("bookings");

// Get documents with constraints
const confirmedBookings = await firebaseUtils.getCollectionData("bookings", [
  where("status", "==", "confirmed"),
  orderBy("createdAt", "desc"),
]);
```

#### `firebaseUtils.addDocument(collectionName, data)`

Adds a new document to a collection.

```typescript
const docId = await firebaseUtils.addDocument("bookings", {
  customerName: "John Doe",
  tourPackage: "Paris Adventure",
  status: "pending",
});
// Returns: generated document ID
// Automatically adds createdAt and updatedAt timestamps
```

#### `firebaseUtils.updateDocument(collectionName, docId, data)`

Updates an existing document.

```typescript
await firebaseUtils.updateDocument("bookings", "booking123", {
  status: "confirmed",
  paymentDate: new Date(),
});
// Automatically updates updatedAt timestamp
```

#### `firebaseUtils.deleteDocument(collectionName, docId)`

Deletes a document from a collection.

```typescript
await firebaseUtils.deleteDocument("bookings", "booking123");
// Returns: true on success
```

## functionsUtils Object

The `functionsUtils` object provides utilities for working with Firebase Cloud Functions and additional helper functions.

### Cloud Function Utilities

#### `functionsUtils.callFunction(functionName, data?)`

Calls a Firebase Cloud Function.

```typescript
const result = await functionsUtils.callFunction("generateReservationEmail", {
  bookingId: "booking123",
  generateDraftCell: true,
});
// Returns: { success: true, functionName, data, message }
```

#### `functionsUtils.getFunctionConfig(functionName)`

Gets configuration for a Firebase Cloud Function.

```typescript
const config = functionsUtils.getFunctionConfig("generateReservationEmail");
// Returns: { name, region, runtime, memory, timeout }
```

#### `functionsUtils.listFunctions()`

Lists available Firebase Cloud Functions.

```typescript
const functions = await functionsUtils.listFunctions();
// Returns: ["generateReservationEmail", "sendReservationEmail", "recompute-on-function-update"]
```

### Email Utilities

#### `functionsUtils.emailUtils.generateReservationEmail(bookingId, generateDraftCell?)`

Generates a reservation email for a booking.

```typescript
const result = await functionsUtils.emailUtils.generateReservationEmail(
  "booking123",
  true
);
// Returns: { success: true, draftId, bookingId, generateDraftCell }
```

#### `functionsUtils.emailUtils.sendReservationEmail(draftId)`

Sends a reservation email draft.

```typescript
const result = await functionsUtils.emailUtils.sendReservationEmail("draft123");
// Returns: { success: true, messageId, draftId, message }
```

### Template Utilities

#### `functionsUtils.templateUtils.processTemplate(template, variables)`

Processes an email template with variables.

```typescript
const processedTemplate = functionsUtils.templateUtils.processTemplate(
  "Hello {{customerName}}, your booking for {{tourPackage}} is confirmed.",
  { customerName: "John Doe", tourPackage: "Paris Adventure" }
);
// Returns: 'Hello John Doe, your booking for Paris Adventure is confirmed.'
```

#### `functionsUtils.templateUtils.getTemplate(templateId)`

Retrieves an email template from Firestore.

```typescript
const template = await functionsUtils.templateUtils.getTemplate("template123");
// Returns: { id: 'template123', ...templateData } or null if not found
```

### General Utilities

#### `functionsUtils.utils.formatCurrency(value, currency?)`

Formats a number as currency.

```typescript
const formatted = functionsUtils.utils.formatCurrency(1234.56, "GBP");
// Returns: '£1234.56'

const formattedUSD = functionsUtils.utils.formatCurrency(1234.56, "USD");
// Returns: '1234.56 USD'
```

#### `functionsUtils.utils.formatDate(date)`

Formats various date formats to ISO date string.

```typescript
const formatted = functionsUtils.utils.formatDate(new Date());
// Returns: '2024-01-15' (YYYY-MM-DD format)

const formattedFromTimestamp = functionsUtils.utils.formatDate({
  _seconds: 1705276800,
});
// Returns: '2024-01-15'
```

#### `functionsUtils.utils.generateId()`

Generates a unique ID.

```typescript
const id = functionsUtils.utils.generateId();
// Returns: 'id_1705276800000_abc123def'
```

#### `functionsUtils.utils.sleep(ms)`

Pauses execution for specified milliseconds.

```typescript
await functionsUtils.utils.sleep(1000); // Wait 1 second
```

## Usage Examples

### Basic Function Template

```typescript
export default async function exampleFunction(
  data: any,
  options?: { [key: string]: any }
) {
  // Get current user (always admin@imheretravels.com due to pre-authentication)
  const user = firebaseUtils.getCurrentUser();

  // Get data from Firestore
  const bookings = await firebaseUtils.getCollectionData("bookings");

  // Add new data
  const newDocId = await firebaseUtils.addDocument("bookings", {
    customerName: data.customerName,
    status: "pending",
  });

  // Update existing data
  await firebaseUtils.updateDocument("bookings", newDocId, {
    status: "confirmed",
  });

  return { success: true, docId: newDocId };
}
```

### Advanced Query Example

```typescript
export default async function getConfirmedBookings(filters: any) {
  // Query with multiple constraints
  const confirmedBookings = await firebaseUtils.getCollectionData("bookings", [
    where("status", "==", "confirmed"),
    where("createdAt", ">=", filters.startDate),
    where("createdAt", "<=", filters.endDate),
    orderBy("createdAt", "desc"),
  ]);

  // Process and format data
  const processedBookings = confirmedBookings.map((booking) => ({
    id: booking.id,
    customerName: booking.customerName,
    totalAmount: functionsUtils.utils.formatCurrency(
      booking.totalAmount,
      "GBP"
    ),
    bookingDate: functionsUtils.utils.formatDate(booking.createdAt),
  }));

  return processedBookings;
}
```

### Email Generation Example

```typescript
export default async function processBookingEmail(bookingId: string) {
  // Get booking data
  const booking = await firebaseUtils.getDocumentData("bookings", bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  // Generate email using cloud function
  const emailResult = await functionsUtils.emailUtils.generateReservationEmail(
    bookingId,
    true
  );

  // Get email template
  const template = await functionsUtils.templateUtils.getTemplate(
    "reservation-confirmation"
  );

  // Process template with booking data
  const processedContent = functionsUtils.templateUtils.processTemplate(
    template.content,
    {
      customerName: booking.customerName,
      tourPackage: booking.tourPackage,
      totalAmount: functionsUtils.utils.formatCurrency(booking.totalAmount),
    }
  );

  return {
    success: true,
    emailResult,
    processedContent,
  };
}
```

## Error Handling

All utility functions include proper error handling and will throw meaningful errors if operations fail:

```typescript
export default async function safeDataOperation() {
  try {
    const data = await firebaseUtils.getDocumentData(
      "nonexistent",
      "invalid-id"
    );
    if (!data) {
      return { error: "Document not found" };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Operation failed:", error);
    return { error: error.message };
  }
}
```

## Performance Considerations

- Functions are **cached** after first compilation for better performance
- **Pre-authentication** ensures operations don't fail due to auth issues
- **Server timestamps** are used for consistent date handling across timezones
- **Batch operations** can be performed using Firestore's native batch functionality
- **No authentication overhead** - functions run with admin privileges automatically

## Security Notes

- All functions run with **admin privileges** and are pre-authenticated
- **No authentication utilities needed** - functions run with admin credentials automatically
- **No user input validation** is performed by the utilities - implement validation in your functions
- **Firestore security rules** still apply to data access

## TypeScript Support

The runtime environment supports:

- **TypeScript compilation** with ES2018 target
- **CommonJS modules** for compatibility
- **JSX support** for React components
- **Type annotations** and modern TypeScript features

## Debugging

Use the built-in console for debugging:

```typescript
export default async function debugFunction() {
  console.log("Starting function execution");

  const userId = firebaseUtils.getUserId();
  console.log("Current user ID:", userId);

  const bookings = await firebaseUtils.getCollectionData("bookings");
  console.log("Found bookings:", bookings.length);

  return { userId, bookingCount: bookings.length };
}
```

## Migration from Legacy Code

When migrating from legacy AppScript or other systems:

1. Replace direct Firebase imports with utility functions
2. Use `firebaseUtils` for common operations instead of raw SDK calls
3. Leverage `functionsUtils` for email and template operations
4. Implement proper error handling using try-catch blocks
5. Use TypeScript for better type safety

This runtime environment provides a powerful, secure, and easy-to-use foundation for building complex TypeScript functions that interact with Firebase services.

## Firestore Collections and Interfaces

The Firebase project contains the following collections with their corresponding TypeScript interfaces:

### Core Collections

#### 1. **Bookings Collection** (`bookings`)

Primary booking data storage for tour reservations.

**Interface:** `Booking`

```typescript
interface Booking {
  id: string;
  bookingId: string;
  bookingCode: string;
  tourCode: string;
  reservationDate: Date;
  bookingType: "Individual" | "Group" | "Corporate";
  bookingStatus: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  daysBetweenBookingAndTour: number;
  groupId?: string;
  isMainBooker: boolean;

  // Traveller information
  travellerInitials: string;
  firstName: string;
  lastName: string;
  fullName: string;
  emailAddress: string;

  // Tour package details
  tourPackageNameUniqueCounter: number;
  tourPackageName: string;
  formattedDate: string;
  tourDate: Date;
  returnDate?: Date;
  tourDuration: number;

  // Pricing
  useDiscountedTourCost: boolean;
  originalTourCost: number;
  discountedTourCost?: number;

  // Email management
  reservationEmail?: string;
  includeBccReservation: boolean;
  generateEmailDraft: boolean;
  emailDraftLink?: string;
  subjectLineReservation?: string;
  sendEmail: boolean;
  sentEmailLink?: string;
  reservationEmailSentDate?: Date;

  // Payment terms
  paymentCondition?: "Full Payment" | "Partial Payment" | "Installment";
  eligible2ndOfMonths: boolean;
  availablePaymentTerms?: string;
  paymentPlan?: "Monthly" | "Quarterly" | "Custom";
  paymentMethod?: "Credit Card" | "Bank Transfer" | "Cash" | "PayPal";
  enablePaymentReminder: boolean;
  paymentProgress: number;

  // Payment details
  fullPayment?: number;
  fullPaymentDueDate?: Date;
  fullPaymentAmount?: number;
  fullPaymentDatePaid?: Date;
  paymentTerm1?: string;
  paymentTerm2?: string;
  paymentTerm3?: string;
  paymentTerm4?: string;
  reservationFee?: number;
  paid: number;
  remainingBalance: number;
  manualCredit?: number;
  creditFrom?: string;

  // Cancellation management
  reasonForCancellation?: string;
  includeBccCancellation: boolean;
  generateCancellationEmailDraft: boolean;
  cancellationEmailDraftLink?: string;
  subjectLineCancellation?: string;
  sendCancellationEmail: boolean;
  sentCancellationEmailLink?: string;
  cancellationEmailSentDate?: Date;

  // Dynamic fields for additional columns
  [key: string]: any;
}
```

#### 2. **Tour Packages Collection** (`tourPackages`)

Tour package information and configurations.

**Interface:** `TourPackage`

```typescript
interface TourPackage {
  id: string;
  name: string;
  slug: string;
  url?: string;
  tourCode: string;
  description: string;
  location: string;
  duration: number;
  travelDates: TravelDate[];
  pricing: TourPricing;
  details: TourDetails;
  media: TourMedia;
  status: "active" | "draft" | "archived";
  pricingHistory: PricingHistoryEntry[];
  metadata: TourMetadata;
  brochureLink?: string;
  stripePaymentLink?: string;
  preDeparturePack?: string;
}

interface TravelDate {
  startDate: Timestamp;
  endDate: Timestamp;
  isAvailable: boolean;
  maxCapacity?: number;
  currentBookings?: number;
}

interface TourPricing {
  original: number;
  discounted?: number;
  deposit: number;
  currency: "USD" | "EUR" | "GBP";
}

interface TourDetails {
  highlights: string[];
  itinerary: TourItinerary[];
  requirements: string[];
}

interface TourItinerary {
  day: number;
  title: string;
  description: string;
}

interface TourMedia {
  coverImage: string;
  gallery: string[];
}

interface TourMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  bookingsCount: number;
}
```

#### 3. **Payment Terms Collection** (`paymentTerms`)

Payment plan configurations.

**Interface:** `PaymentTermConfiguration`

```typescript
interface PaymentTermConfiguration {
  id: string;
  name: string;
  description: string;
  paymentPlanType: PaymentPlanType;
  paymentType: "full_payment" | "monthly_scheduled" | "invalid_booking";
  daysRequired?: number;
  monthsRequired?: number;
  monthlyPercentages?: number[];
  depositPercentage: number;
  isActive: boolean;
  percentage?: number;
  sortOrder: number;
  color: string;
  metadata: PaymentTermMetadata;
}

type PaymentPlanType =
  | "invalid_booking"
  | "full_payment_48hrs"
  | "p1_single_installment"
  | "p2_two_installments"
  | "p3_three_installments"
  | "p4_four_installments"
  | "custom";

interface PaymentTermMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

#### 4. **Email Templates Collection** (`emailTemplates`)

Email communication templates.

**Interface:** `CommunicationTemplate`

```typescript
interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  variableDefinitions?: VariableDefinition[];
  status: "active" | "draft" | "archived";
  bccGroups: string[];
  metadata: CommunicationMetadata;
}

interface CommunicationMetadata {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  usedCount: number;
}

interface VariableDefinition {
  id: string;
  name: string;
  type: VariableType;
  description?: string;
  arrayElementType?: VariableType;
  arrayElementDefinitions?: VariableDefinition[];
  mapFields?: { [key: string]: VariableDefinition };
}

type VariableType = "string" | "number" | "boolean" | "array" | "map";
```

### Collection Usage Examples

```typescript
// Get all bookings
const bookings = await firebaseUtils.getCollectionData("bookings");

// Get confirmed bookings with specific constraints
const confirmedBookings = await firebaseUtils.getCollectionData("bookings", [
  where("bookingStatus", "==", "Confirmed"),
  orderBy("reservationDate", "desc"),
]);

// Get tour packages by location
const ecuadorTours = await firebaseUtils.getCollectionData("tourPackages", [
  where("location", "==", "Ecuador"),
  where("status", "==", "active"),
]);

// Get payment terms configuration
const paymentTerms = await firebaseUtils.getCollectionData("paymentTerms", [
  where("isActive", "==", true),
]);

// Get email templates
const emailTemplates = await firebaseUtils.getCollectionData("emailTemplates", [
  where("status", "==", "active"),
]);

// Get specific booking by ID
const booking = await firebaseUtils.getDocumentData("bookings", "booking123");

// Get specific tour package by ID
const tourPackage = await firebaseUtils.getDocumentData(
  "tourPackages",
  "tour123"
);

// Add new booking
const newBookingId = await firebaseUtils.addDocument("bookings", {
  firstName: "John",
  lastName: "Doe",
  emailAddress: "john@example.com",
  tourCode: "SIA",
  bookingStatus: "Pending",
});

// Update booking status
await firebaseUtils.updateDocument("bookings", newBookingId, {
  bookingStatus: "Confirmed",
});
```

### Collection Relationships

- **Bookings** reference **Tour Packages** via `tourCode`
- **Bookings** use **Payment Terms** for payment calculations
- **Bookings** use **Email Templates** for communications
- **Tour Packages** contain pricing and itinerary information
- **Payment Terms** define payment plans and conditions
- **Email Templates** provide communication templates with variable support
