# Firestore Database Schema v2 - Complete System for ImHereTravels Admin Portal

*This document combines the foundational schema (v1) with new enhancements and features (v2)*

## Core Collections (From v1)

### 1. **Bookings** (`bookings`)
*Primary booking data storage*
```ts
{
  id: string; // Auto-generated Firestore ID
  bookingId: string; // TR-EC-20250712-JD-01 format
  traveler: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  tour: {
    packageId: string; // Reference to tourPackages
    name: string;
    date: Timestamp;
    returnDate: Timestamp;
    duration: number; // Days
  };
  reservation: {
    date: Timestamp;
    source: string; // Webform, Manual, Partner
    bookingType: "single" | "duo" | "group";
  };
  payment: {
    condition: "Invalid" | "Last Minute" | "Standard";
    terms: "Invalid" | "Full" | "P1" | "P2" | "P3" | "P4" | "Cancelled";
    plan: "Full" | "P1" | "P2" | "P3" | "P4";
    method?: "stripe" | "revolut" | "bank";
    originalCost: number;
    discountedCost?: number;
    reservationFee: number;
    paid: number;
    remainingBalance: number;
    enableReminders: boolean;
    cancellationReason?: "Tour Date too close" | "Fully booked" | "Tour Date Cancelled";
  };
  group: {
    id?: string; // DB-JD-5837-001 format
    isMainBooker: boolean;
    members: string[]; // References to other bookings
  };
  schedule: {
    full?: PaymentSchedule;
    P1?: PaymentSchedule;
    P2?: PaymentSchedule;
    P3?: PaymentSchedule;
    P4?: PaymentSchedule;
  };
  communications: {
    reservation: EmailStatus;
    cancellation?: EmailStatus;
    adventureKit?: EmailStatus;
    reminders: {
      P1?: ReminderStatus;
      P2?: ReminderStatus;
      P3?: ReminderStatus;
      P4?: ReminderStatus;
    }
  };
  // NEW V2 FIELDS
  status: string; // Reference to referenceData/bookingStatus
  customerType: string; // Reference to referenceData/customerType
  customerStatus: string; // Reference to referenceData/customerStatus
  metadata: {
    createdBy: string; // Reference to users
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastActivity: Timestamp;
  };
}

interface PaymentSchedule {
  amount: number;
  dueDate: Timestamp;
  scheduledReminder: Timestamp;
  calendarEventId?: string;
  paid: boolean;
  paidDate?: Timestamp;
}

interface EmailStatus {
  drafted: boolean;
  sent: boolean;
  sentDate?: Timestamp;
  subject: string;
  link?: string;
}

interface ReminderStatus {
  sent: boolean;
  sentDate: Timestamp;
  method: "email" | "calendar";
}
```

### 2. **Tour Packages** (`tourPackages`)
*Tour product catalog*
```ts
{
  id: string; // Auto-generated Firestore ID
  name: string;
  slug: string; // URL-friendly ID
  description: string;
  location: string;
  duration: number; // Days
  pricing: {
    original: number;
    discounted?: number;
    deposit: number;
    currency: "USD" | "EUR" | "GBP";
  };
  details: {
    highlights: string[];
    itinerary: {
      day: number;
      title: string;
      description: string;
    }[];
    requirements: string[];
  };
  media: {
    coverImage: string; // Storage path
    gallery: string[]; // Storage paths
  };
  status: "active" | "draft" | "archived";
  // NEW V2 FIELDS
  pricingHistory: {
    date: Timestamp;
    price: number;
    changedBy: string;
  }[];
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string; // Reference to users
    bookingsCount: number;
  };
}
```

### 3. **Users** (`users`)
*Admin and agent accounts*
```ts
{
  id: string; // Matches Firebase Auth UID
  email: string;
  role: "admin" | "agent";
  profile: {
    firstName: string;
    lastName: string;
    avatar?: string; // Storage path
    timezone: string; // e.g., "Asia/Manila"
  };
  permissions: {
    canManageBookings: boolean;
    canManageTours: boolean;
    canManageTemplates: boolean;
    canManageUsers: boolean; // Admins only
    canAccessReports: boolean;
    canEditFinancials: boolean; // Admins only
  };
  preferences: {
    notifications: {
      newBookings: boolean;
      payments: boolean;
      cancellations: boolean;
    };
  };
  security: {
    lastLogin: Timestamp;
    lastPasswordReset: Timestamp;
    twoFactorEnabled: boolean;
  };
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    isActive: boolean;
  };
}
```

### 4. **Communications** (`communications`)
*Email templates and history*
```ts
{
  id: string; // Auto-generated Firestore ID
  type: "reservation" | "payment-reminder" | "cancellation" | "adventure-kit";
  name: string;
  subject: string;
  content: string; // HTML content
  variables: string[]; // ["{{traveler_name}}", "{{tour_name}}"]
  status: "active" | "draft" | "archived";
  // NEW V2 FIELDS
  bccGroups: string[]; // References to bccGroups
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string; // Reference to users
    usedCount: number;
  };
}

// Sent emails subcollection: communications/{templateId}/sentEmails
{
  id: string; // Auto-generated Firestore ID
  bookingId: string; // Reference to bookings
  recipient: string;
  subject: string;
  status: "sent" | "delivered" | "failed";
  opened: boolean;
  openedAt?: Timestamp;
  link: string; // Gmail message link
  metadata: {
    sentAt: Timestamp;
    sentBy: string; // Reference to users
  };
}
```

### 5. **Settings** (`settings`)
*System configuration*
```ts
{
  id: "paymentTerms";
  terms: {
    condition: string; // "Standard Booking, P1"
    term: string; // "P1"
  }[];
}

{
  id: "cancellationReasons";
  reasons: string[]; // ["Tour Date too close", ...]
}

{
  id: "emailConfig";
  provider: "resend" | "sendgrid" | "gmail";
  apiKey: string; // Encrypted
  fromAddress: string;
  bccAddresses: string[];
}

{
  id: "stripeConfig";
  apiKey: string; // Encrypted
  webhookSecret: string;
  dashboardLink: string;
}

{
  id: "calendarConfig";
  provider: "google";
  credentials: object; // Encrypted
}
```

## New Collections (V2 Additions)

### 6. **Reference Data** (`referenceData`)
*Centralized reference data management*
```ts
{
  id: string;
  type: "bookingStatus" | "customerType" | "cancellationReason" | "customerStatus" | "paymentTerms";
  values: {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    sortOrder?: number;
  }[];
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
}
```

### 7. **Contacts** (`contacts`)
*CRM and contact database*
```ts
{
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "lead" | "customer" | "partner";
  status: "new" | "contacted" | "qualified" | "converted";
  source: "webform" | "referral" | "event" | "social";
  notes: string;
  bookings: string[]; // Booking references
  tags: string[];
  customFields: {
    [key: string]: any;
  };
  metadata: {
    createdAt: Timestamp;
    lastContacted: Timestamp;
    assignedTo?: string; // Reference to users
  };
}
```

### 8. **Flight Info** (`flightInfo`)
*Internal flight tracking for tours*
```ts
{
  id: string;
  bookingId: string;
  route: string;
  airline: string;
  flightNumber: string;
  departure: Timestamp;
  arrival: Timestamp;
  terminal?: string;
  gate?: string;
  notes?: string;
  metadata: {
    addedBy: string;
    addedAt: Timestamp;
    updatedAt: Timestamp;
  };
}
```

## New Subcollections (V2 Additions)

### 1. **BCC Groups** (`settings/bccGroups`)
*Email distribution lists*
```ts
{
  id: string;
  name: string;
  description: string;
  emails: string[];
  defaultFor: string[]; // ['reservation', 'adventure-kit', 'payment-reminder']
  isActive: boolean;
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
}
```

### 2. **Booking Activity** (`bookings/{bookingId}/activity`)
*Audit log for booking changes (From V1)*
```ts
{
  id: string; // Auto-generated
  action: "created" | "updated" | "payment-received" | "email-sent" | "cancelled";
  field?: string; // For updates
  oldValue?: any;
  newValue?: any;
  performedBy: string; // Reference to users
  timestamp: Timestamp;
  notes?: string;
}
```

### 3. **Tour Statistics** (`tourPackages/{tourId}/stats`)
*Monthly performance data (From V1)*
```ts
{
  id: string; // "2025-06"
  bookings: number;
  revenue: number;
  cancellations: number;
  avgBookingValue: number;
}
```

## Enhanced Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // User permissions
    function isAdmin() {
      return request.auth.token.role == "admin";
    }
    
    function isAgent() {
      return request.auth.token.role == "agent";
    }
    
    function userOwnsData() {
      return request.auth.uid == resource.data.userId;
    }
    
    // Bookings rules
    match /bookings/{bookingId} {
      allow read: if isAdmin() || isAgent();
      allow create: if isAdmin() || isAgent();
      allow update: if isAdmin() || 
                    (isAgent() && 
                     !request.resource.data.payment.hasOwnProperty('originalCost') &&
                     !request.resource.data.payment.hasOwnProperty('discountedCost'));
      allow delete: if false; // Soft delete only
    }
    
    // Tour packages rules
    match /tourPackages/{tourId} {
      allow read: if isAdmin() || isAgent();
      allow create, update, delete: if isAdmin();
    }
    
    // User management rules
    match /users/{userId} {
      allow read: if isAdmin() || request.auth.uid == userId;
      allow create: if isAdmin();
      allow update: if isAdmin() || request.auth.uid == userId;
      allow delete: if false; // Deactivate instead
    }
    
    // Reference data rules
    match /referenceData/{refId} {
      allow read: if isAdmin() || isAgent();
      allow write: if isAdmin();
    }
    
    // Contacts rules
    match /contacts/{contactId} {
      allow read: if isAdmin() || isAgent();
      allow create, update: if isAdmin() || isAgent();
      allow delete: if isAdmin();
    }
    
    // Flight info rules
    match /flightInfo/{flightId} {
      allow read: if isAdmin() || isAgent();
      allow create, update: if isAdmin() || isAgent();
      allow delete: if isAdmin();
    }
    
    // Settings rules
    match /settings/{settingId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
      
      // BCC Groups subcollection
      match /bccGroups/{groupId} {
        allow read: if isAdmin() || isAgent();
        allow write: if isAdmin();
      }
    }
    
    // Communications templates
    match /communications/{templateId} {
      allow read: if isAdmin() || isAgent();
      allow write: if isAdmin();
    }
    
    // Sent emails
    match /communications/{templateId}/sentEmails/{emailId} {
      allow read: if isAdmin() || isAgent();
      allow create: if isAdmin() || isAgent();
    }
  }
}
```

## Enhanced Indexes

### Bookings Collection
1. `tour.date` ASC + `payment.terms` ASC
2. `payment.remainingBalance` DESC
3. `traveler.email` ASC
4. `metadata.createdAt` DESC
5. `status` ASC + `tour.date` ASC (NEW)
6. `customerType` ASC + `customerStatus` ASC (NEW)

### Tour Packages Collection
1. `status` ASC + `metadata.bookingsCount` DESC
2. `location` ASC + `name` ASC
3. `pricing.original` ASC + `status` ASC (NEW)

### Contacts Collection (NEW)
1. `type` ASC + `status` ASC
2. `email` ASC
3. `metadata.createdAt` DESC
4. `tags` ARRAY + `status` ASC

### Reference Data Collection (NEW)
1. `type` ASC + `values.sortOrder` ASC

## Data Migration Strategy

### Phase 1: Core Schema (V1) Migration
- Migrate existing Google Sheets data to core collections
- Validate data integrity and relationships
- Test core business logic

### Phase 2: Enhanced Features (V2) Migration
- Add new fields to existing collections
- Create new collections (referenceData, contacts, flightInfo)
- Set up BCC groups and reference data

### Phase 3: Data Enrichment
- Populate reference data from existing values
- Create contact records from booking traveler data
- Set up default BCC groups

## Key Business Logic Updates

### Enhanced Payment Calculation (Cloud Function)
```ts
export const calculateBookingPaymentV2 = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    if (!newData) return; // Document deleted
    
    // Get reference data for validation
    const paymentTermsRef = await getRefData('paymentTerms');
    const bookingStatusRef = await getRefData('bookingStatus');
    
    // Existing calculation logic...
    // Plus new status validation and reference data checks
    
    // Update pricing history for tour packages
    if (newData.tour.packageId !== oldData?.tour.packageId) {
      await updateTourPricingHistory(newData.tour.packageId, newData.payment.originalCost);
    }
    
    // Create contact record if new customer
    await createOrUpdateContact(newData.traveler);
  });
```

### Due Date Calculation (From V1)
```ts
function calculatePaymentSchedule(
  plan: PaymentPlan,
  reservationDate: Date,
  tourDate: Date,
  balance: number
) {
  const schedule: any = {};
  const months = {P1:1, P2:2, P3:3, P4:4}[plan] || 0;
  
  // Full payment special case
  if (plan === 'Full') {
    const dueDate = new Date(reservationDate);
    dueDate.setDate(dueDate.getDate() + 2);
    schedule.full = {
      amount: balance,
      dueDate: dueDate,
      scheduledReminder: new Date(dueDate.setDate(dueDate.getDate() - 3)),
      paid: false
    };
    return schedule;
  }
  
  // Generate payment dates (2nd of each month)
  for (let i = 1; i <= months; i++) {
    const dueDate = new Date(reservationDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    dueDate.setDate(2);
    
    // Validate date constraints
    if (dueDate > new Date(reservationDate.getDate() + 2) && 
        dueDate < new Date(tourDate.getDate() - 3)) {
      schedule[`P${i}`] = {
        amount: balance / months,
        dueDate: dueDate,
        scheduledReminder: new Date(dueDate.setDate(dueDate.getDate() - 3)),
        paid: false
      };
    }
  }
  
  return schedule;
}
```

## Data Relationships

```mermaid
erDiagram
    BOOKINGS ||--o{ TOUR_PACKAGES : "references"
    BOOKINGS ||--o{ USERS : "createdBy"
    BOOKINGS ||--o{ CONTACTS : "traveler"
    BOOKINGS ||--o{ FLIGHT_INFO : "flightDetails"
    BOOKINGS ||--o{ REFERENCE_DATA : "status"
    COMMUNICATIONS ||--o{ BOOKINGS : "sentEmails"
    COMMUNICATIONS ||--o{ BCC_GROUPS : "distribution"
    BOOKINGS ||--o{ BOOKINGS : "group_members"
    SETTINGS ||--o{ COMMUNICATIONS : "config"
    USERS ||--o{ BOOKINGS : "manages"

    BOOKINGS {
        string id PK
        string tour_package_id FK
        string created_by FK
        string group_id
        string status FK
        string customer_type FK
    }
    TOUR_PACKAGES {
        string id PK
        string name
        array pricing_history
    }
    USERS {
        string id PK
        string role
    }
    COMMUNICATIONS {
        string id PK
        string type
        array bcc_groups FK
    }
    SETTINGS {
        string id PK
        string type
    }
    REFERENCE_DATA {
        string id PK
        string type
        array values
    }
    CONTACTS {
        string id PK
        string type
        string status
        array bookings FK
    }
    FLIGHT_INFO {
        string id PK
        string booking_id FK
        string route
    }
    BCC_GROUPS {
        string id PK
        string name
        array emails
    }
```

## Migration Script (Enhanced - Google Sheets → Firestore)

```ts
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getSheetsData } from "./google-sheets-helper";

const migrateBookingsV2 = async () => {
  const sheetsData = await getSheetsData("Main Dashboard");
  
  // First, set up reference data
  await setupReferenceData();
  
  const bookings = sheetsData.map((row) => {
    return {
      bookingId: row['Booking ID'],
      traveler: {
        firstName: row['First Name'],
        lastName: row['Last Name'],
        email: row['Email Address']
      },
      tour: {
        packageId: getTourIdByName(row['Tour Package Name']),
        date: new Date(row['Tour Date']),
        returnDate: new Date(row['Return Date']),
        duration: parseInt(row['Tour Duration'])
      },
      reservation: {
        date: new Date(row['Reservation Date']),
        bookingType: row['Booking Type']
      },
      payment: {
        condition: row['Payment Condition'],
        terms: row['Available Payment Terms'],
        plan: row['Payment Plan'],
        originalCost: row['Original Tour Cost'],
        discountedCost: row['Discounted Tour Cost'],
        reservationFee: row['Reservation Fee'],
        paid: row['Paid'],
        remainingBalance: row['Remaining Balance']
      },
      group: {
        id: row['Group ID'],
        isMainBooker: row['Is Main Booker?'] === "TRUE"
      },
      // V2 additions
      status: mapBookingStatus(row['Status']),
      customerType: mapCustomerType(row['Customer Type']),
      customerStatus: mapCustomerStatus(row['Customer Status']),
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "migration-script"
      }
    };
  });
  
  const db = getFirestore();
  const batch = db.batch();
  
  // Create bookings
  bookings.forEach(booking => {
    const ref = db.collection("bookings").doc();
    batch.set(ref, booking);
  });
  
  // Create contacts from traveler data
  const uniqueContacts = extractUniqueContacts(bookings);
  uniqueContacts.forEach(contact => {
    const ref = db.collection("contacts").doc();
    batch.set(ref, contact);
  });
  
  await batch.commit();
  console.log("V2 Migration complete");
};

async function setupReferenceData() {
  const db = getFirestore();
  
  const refData = [
    {
      type: 'bookingStatus',
      values: [
        {id: 'confirmed', name: 'Confirmed', isActive: true, sortOrder: 1},
        {id: 'pending', name: 'Pending', isActive: true, sortOrder: 2},
        {id: 'cancelled', name: 'Cancelled', isActive: true, sortOrder: 3}
      ]
    },
    // Add more reference data types...
  ];
  
  for (const ref of refData) {
    await db.collection('referenceData').doc(ref.type).set({
      ...ref,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

migrateBookingsV2().then(() => console.log("Enhanced migration complete"));
```

This enhanced schema provides:

1. **Complete V1 Foundation**: All original functionality preserved
2. **V2 Enhancements**: New collections and features for advanced CRM and data management
3. **Flexible Reference Data**: Centralized management of dropdown values and categories
4. **Enhanced CRM**: Contact database with lead tracking and conversion analytics
5. **Operational Efficiency**: Flight info tracking and enhanced BCC management
6. **Audit & Compliance**: Complete activity tracking and data lineage
7. **Scalable Architecture**: Prepared for future feature additions and integrations

The combined schema maintains backward compatibility while adding enterprise-grade features for comprehensive travel business management.
