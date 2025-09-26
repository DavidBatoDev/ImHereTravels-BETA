"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Code,
  Database,
  Zap,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CodeEditorDocumentationModal({
  isOpen,
  onClose,
}: CodeEditorDocumentationModalProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (code: string, description: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Code copied!",
      description: `${description} copied to clipboard`,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const basicExample = `// Example TypeScript function for booking sheet
export default async function calculateTotalPrice(
  basePrice: number,
  discountPercentage: number = 0
): Promise<number> {
  // Your implementation here
  const discount = basePrice * (discountPercentage / 100);
  return basePrice - discount;
}`;

  const firebaseExample = `// Example with Firebase data fetching
export default async function getBookingStatus(
  bookingId: string
): Promise<string> {
  // Fetch booking data from Firebase
  const booking = await firebaseUtils.getDocumentData('bookings', bookingId);
  
  if (!booking) {
    return 'Not Found';
  }
  
  return booking.status || 'Unknown';
}`;

  const queryExample = `// Example with Firebase queries
export default async function getRecentBookings(): Promise<any[]> {
  // Query bookings with constraints
  const bookings = await firebaseUtils.getCollectionData('bookings', [
    where('createdAt', '>=', new Date('2024-01-01')),
    orderBy('createdAt', 'desc')
  ]);
  
  return bookings;
}`;

  const firebaseUtils = [
    {
      name: "getCurrentUser",
      description: "Get the current authenticated user",
      returns: "User object with uid and email",
      example: "const user = firebaseUtils.getCurrentUser();",
    },
    {
      name: "isAuthenticated",
      description: "Check if user is authenticated",
      returns: "boolean",
      example: "const isAuth = firebaseUtils.isAuthenticated();",
    },
    {
      name: "getDocumentData",
      description: "Fetch a single document from Firestore",
      parameters: "collectionName: string, docId: string",
      returns: "Document data or null",
      example:
        "const doc = await firebaseUtils.getDocumentData('bookings', 'doc123');",
    },
    {
      name: "getCollectionData",
      description:
        "Fetch multiple documents from Firestore with optional constraints",
      parameters: "collectionName: string, constraints?: any[]",
      returns: "Array of document data",
      example:
        "const docs = await firebaseUtils.getCollectionData('bookings', [where('status', '==', 'confirmed')]);",
    },
    {
      name: "addDocument",
      description: "Add a new document to Firestore",
      parameters: "collectionName: string, data: any",
      returns: "Document ID",
      example:
        "const docId = await firebaseUtils.addDocument('bookings', { name: 'John', status: 'pending' });",
    },
    {
      name: "updateDocument",
      description: "Update an existing document in Firestore",
      parameters: "collectionName: string, docId: string, data: any",
      returns: "Document ID",
      example:
        "await firebaseUtils.updateDocument('bookings', 'doc123', { status: 'confirmed' });",
    },
    {
      name: "deleteDocument",
      description: "Delete a document from Firestore",
      parameters: "collectionName: string, docId: string",
      returns: "boolean",
      example:
        "const success = await firebaseUtils.deleteDocument('bookings', 'doc123');",
    },
  ];

  const firebaseFunctions = [
    {
      name: "where",
      description: "Create a where clause for Firestore queries",
      parameters: "field: string, operator: string, value: any",
      returns: "Query constraint object",
      example: "where('status', '==', 'confirmed')",
    },
    {
      name: "orderBy",
      description: "Create an orderBy clause for Firestore queries",
      parameters: "field: string, direction?: 'asc' | 'desc'",
      returns: "Query constraint object",
      example: "orderBy('createdAt', 'desc')",
    },
    {
      name: "query",
      description: "Build complex Firestore queries",
      parameters: "collectionName: string, ...constraints",
      returns: "Query object",
      example:
        "query('bookings', where('status', '==', 'confirmed'), orderBy('createdAt', 'desc'))",
    },
    {
      name: "serverTimestamp",
      description: "Get current server timestamp",
      returns: "Date object",
      example: "const timestamp = serverTimestamp();",
    },
  ];

  const collections = [
    {
      name: "tourPackages",
      description: "Tour packages and itineraries",
      useCases: [
        "Lookup tour codes",
        "Get package details",
        "Calculate pricing",
        "Filter by destination",
      ],
      interface: {
        id: "string",
        name: "string",
        tourCode: "string",
        description: "string",
        duration: "number",
        price: "number",
        destinations: "string[]",
        isActive: "boolean",
        createdAt: "Date",
        updatedAt: "Date",
      },
      exampleCode: `// Get all tour packages
const packages = await firebaseUtils.getCollectionData('tourPackages');

// Get active tours only
const activeTours = await firebaseUtils.getCollectionData('tourPackages', [
  where('isActive', '==', true)
]);

// Find tour by code
const tour = await firebaseUtils.getCollectionData('tourPackages', [
  where('tourCode', '==', 'IDD')
]);`,
      exampleOutput: `[
  {
    "id": "pkg_123",
    "name": "India Discovery Tour",
    "tourCode": "IDD",
    "description": "Explore the wonders of India",
    "duration": 14,
    "price": 2500,
    "destinations": ["Delhi", "Agra", "Jaipur"],
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
]`,
      commonQueries: [
        "Lookup tour code by name",
        "Get package pricing",
        "Filter by destination",
        "Check if tour is active",
      ],
    },
    {
      name: "bbc-users",
      description: "BBC (Backend Business Center) user accounts",
      useCases: [
        "User authentication",
        "Role-based access",
        "User management",
        "Activity tracking",
      ],
      interface: {
        id: "string",
        email: "string",
        firstName: "string",
        lastName: "string",
        role: "string",
        department: "string",
        isActive: "boolean",
        lastLogin: "Date",
        createdAt: "Date",
        permissions: "string[]",
      },
      exampleCode: `// Get all users
const users = await firebaseUtils.getCollectionData('bbc-users');

// Get admin users
const admins = await firebaseUtils.getCollectionData('bbc-users', [
  where('role', '==', 'admin')
]);

// Get active users
const activeUsers = await firebaseUtils.getCollectionData('bbc-users', [
  where('isActive', '==', true)
]);`,
      exampleOutput: `[
  {
    "id": "user_456",
    "email": "admin@imheretravels.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "department": "IT",
    "isActive": true,
    "lastLogin": "2024-01-25T09:15:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "permissions": ["read", "write", "delete"]
  }
]`,
      commonQueries: [
        "Check user permissions",
        "Get user by email",
        "Filter by department",
        "Track user activity",
      ],
    },
    {
      name: "paymentTerms",
      description: "Payment terms and conditions for bookings",
      useCases: [
        "Calculate deposits",
        "Apply payment policies",
        "Check cancellation rules",
        "Determine refund amounts",
      ],
      interface: {
        id: "string",
        name: "string",
        description: "string",
        depositPercentage: "number",
        fullPaymentDays: "number",
        cancellationPolicy: "string",
        refundPolicy: "string",
        isActive: "boolean",
        applicableTours: "string[]",
        createdAt: "Date",
      },
      exampleCode: `// Get all payment terms
const terms = await firebaseUtils.getCollectionData('paymentTerms');

// Get active terms
const activeTerms = await firebaseUtils.getCollectionData('paymentTerms', [
  where('isActive', '==', true)
]);

// Get terms for specific tour
const tourTerms = await firebaseUtils.getCollectionData('paymentTerms', [
  where('applicableTours', 'array-contains', 'IDD')
]);`,
      exampleOutput: `[
  {
    "id": "terms_789",
    "name": "Standard Payment Terms",
    "description": "Standard payment terms for most tours",
    "depositPercentage": 30,
    "fullPaymentDays": 30,
    "cancellationPolicy": "Free cancellation up to 7 days before departure",
    "refundPolicy": "Full refund minus 5% processing fee",
    "isActive": true,
    "applicableTours": ["IDD", "ARW", "MLB"],
    "createdAt": "2024-01-10T12:00:00Z"
  }
]`,
      commonQueries: [
        "Get payment terms for tour",
        "Calculate deposit amount",
        "Check cancellation policy",
        "Apply refund rules",
      ],
    },
    {
      name: "bookings",
      description: "Customer bookings and reservations",
      useCases: [
        "Booking management",
        "Revenue tracking",
        "Customer communication",
        "Status updates",
        "Payment processing",
      ],
      interface: {
        id: "string",
        customerName: "string",
        customerEmail: "string",
        tourCode: "string",
        tourName: "string",
        bookingDate: "Date",
        travelDate: "Date",
        numberOfTravelers: "number",
        totalAmount: "number",
        status: "string",
        paymentStatus: "string",
        specialRequests: "string",
        createdAt: "Date",
        updatedAt: "Date",
      },
      exampleCode: `// Get all bookings
const bookings = await firebaseUtils.getCollectionData('bookings');

// Get confirmed bookings
const confirmedBookings = await firebaseUtils.getCollectionData('bookings', [
  where('status', '==', 'confirmed')
]);

// Get bookings for specific tour
const tourBookings = await firebaseUtils.getCollectionData('bookings', [
  where('tourCode', '==', 'IDD')
]);`,
      exampleOutput: `[
  {
    "id": "booking_101",
    "customerName": "Jane Smith",
    "customerEmail": "jane@example.com",
    "tourCode": "IDD",
    "tourName": "India Discovery Tour",
    "bookingDate": "2024-01-20T14:30:00Z",
    "travelDate": "2024-03-15T00:00:00Z",
    "numberOfTravelers": 2,
    "totalAmount": 5000,
    "status": "confirmed",
    "paymentStatus": "paid",
    "specialRequests": "Vegetarian meals only",
    "createdAt": "2024-01-20T14:30:00Z",
    "updatedAt": "2024-01-21T10:15:00Z"
  }
]`,
      commonQueries: [
        "Get customer bookings",
        "Filter by booking status",
        "Calculate total revenue",
        "Track payment status",
        "Get upcoming trips",
      ],
    },
    {
      name: "emailTemplates",
      description: "Email templates for automated communications",
      useCases: [
        "Automated emails",
        "Customer notifications",
        "Booking confirmations",
        "Payment receipts",
        "Marketing campaigns",
      ],
      interface: {
        id: "string",
        name: "string",
        subject: "string",
        body: "string",
        type: "string",
        variables: "string[]",
        isActive: "boolean",
        triggerEvents: "string[]",
        createdAt: "Date",
        updatedAt: "Date",
      },
      exampleCode: `// Get all email templates
const templates = await firebaseUtils.getCollectionData('emailTemplates');

// Get templates by type
const bookingTemplates = await firebaseUtils.getCollectionData('emailTemplates', [
  where('type', '==', 'booking_confirmation')
]);

// Get active templates
const activeTemplates = await firebaseUtils.getCollectionData('emailTemplates', [
  where('isActive', '==', true)
]);`,
      exampleOutput: `[
  {
    "id": "template_202",
    "name": "Booking Confirmation",
    "subject": "Your booking has been confirmed - {{tourName}}",
    "body": "Dear {{customerName}}, your booking for {{tourName}} on {{travelDate}} has been confirmed...",
    "type": "booking_confirmation",
    "variables": ["customerName", "tourName", "travelDate", "bookingId"],
    "isActive": true,
    "triggerEvents": ["booking_confirmed", "payment_received"],
    "createdAt": "2024-01-05T08:00:00Z",
    "updatedAt": "2024-01-15T16:30:00Z"
  }
]`,
      commonQueries: [
        "Get template by type",
        "Find templates for event",
        "Check available variables",
        "Get active templates",
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>TypeScript Code Editor Documentation</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="collections">
                Accessing our Database
              </TabsTrigger>
              <TabsTrigger value="firebase-utils">
                Utility that you could use
              </TabsTrigger>
              <TabsTrigger value="firebase-functions">
                Firebase Functions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Code className="h-5 w-5 mr-2" />
                      Getting Started
                    </h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        The TypeScript code editor allows you to create custom
                        functions that can be used in your booking sheet
                        columns. These functions are automatically executed when
                        the booking data is processed.
                      </p>
                      <p>
                        <strong>Key Requirements:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>
                          Your main function must be exported as{" "}
                          <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                            export default
                          </code>
                        </li>
                        <li>Functions can be synchronous or asynchronous</li>
                        <li>
                          Return values will be displayed in the booking sheet
                          column
                        </li>
                        <li>
                          All Firebase utilities are automatically available (no
                          imports needed)
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Firebase Integration
                    </h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        Your functions have access to Firebase utilities and can
                        fetch data from any collection in your database. All
                        functions are pre-authenticated with admin credentials,
                        so you don't need to handle authentication.
                      </p>
                      <p>
                        <strong>Available Collections:</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Badge variant="outline">bookings</Badge>
                        <Badge variant="outline">tourPackages</Badge>
                        <Badge variant="outline">users</Badge>
                        <Badge variant="outline">analytics</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Zap className="h-5 w-5 mr-2" />
                      Runtime Injection
                    </h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>
                        All Firebase utilities and functions are automatically
                        injected at runtime. You can use them directly without
                        any import statements.
                      </p>
                      <p>
                        <strong>Available Globals:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>
                          <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                            firebaseUtils
                          </code>{" "}
                          - Main utility object
                        </li>
                        <li>
                          <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                            where
                          </code>{" "}
                          - Query constraint function
                        </li>
                        <li>
                          <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                            orderBy
                          </code>{" "}
                          - Ordering function
                        </li>
                        <li>
                          <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                            query
                          </code>{" "}
                          - Complex query builder
                        </li>
                        <li>
                          <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                            serverTimestamp
                          </code>{" "}
                          - Server timestamp
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="collections" className="mt-6">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6">
                  {/* Introduction */}
                  <div className="border rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      Understanding Your Database Collections
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your TypeScript functions have access to several Firebase
                      collections that store different types of business data.
                      Each collection serves a specific purpose in your travel
                      booking system.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p className="mb-1">
                        <strong>💡 Pro Tip:</strong> Use these collections to
                        build dynamic functions that can:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Look up tour information and pricing</li>
                        <li>Process customer bookings and payments</li>
                        <li>Send automated emails and notifications</li>
                        <li>Manage user permissions and access</li>
                        <li>Calculate totals, discounts, and fees</li>
                      </ul>
                    </div>
                  </div>

                  {collections.map((collection, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold font-mono">
                          {collection.name}
                        </h3>
                        <Badge variant="outline">
                          {collection.description}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {/* What is this collection for */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            What is this collection for?
                          </h4>
                          <div className="text-sm text-muted-foreground p-3 rounded border">
                            {collection.name === "tourPackages" && (
                              <p>
                                The{" "}
                                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                                  tourPackages
                                </code>{" "}
                                collection stores all your travel packages and
                                itineraries. This is your product catalog that
                                contains tour details, pricing, destinations,
                                and availability status. Use this collection
                                when you need to look up tour codes, calculate
                                pricing, or filter tours by destination or price
                                range.
                              </p>
                            )}
                            {collection.name === "bbc-users" && (
                              <p>
                                The{" "}
                                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                                  bbc-users
                                </code>{" "}
                                collection manages your internal staff and admin
                                accounts. This includes user roles, permissions,
                                departments, and activity tracking. Use this
                                collection to check user permissions, manage
                                access control, or track staff activity in your
                                system.
                              </p>
                            )}
                            {collection.name === "paymentTerms" && (
                              <p>
                                The{" "}
                                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                                  paymentTerms
                                </code>{" "}
                                collection defines payment policies and terms
                                for different tours. This includes deposit
                                percentages, payment deadlines, cancellation
                                policies, and refund rules. Use this collection
                                to calculate deposit amounts, apply payment
                                policies, or determine cancellation rules for
                                specific tours.
                              </p>
                            )}
                            {collection.name === "bookings" && (
                              <p>
                                The{" "}
                                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                                  bookings
                                </code>{" "}
                                collection stores all customer reservations and
                                booking data. This is your main transactional
                                data that includes customer information, tour
                                details, payment status, and special requests.
                                Use this collection to manage bookings, track
                                revenue, send customer communications, or
                                generate reports.
                              </p>
                            )}
                            {collection.name === "emailTemplates" && (
                              <p>
                                The{" "}
                                <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-gray-800 dark:text-gray-200">
                                  emailTemplates
                                </code>{" "}
                                collection contains email templates for
                                automated communications. This includes booking
                                confirmations, payment receipts, marketing
                                emails, and customer notifications. Use this
                                collection to send automated emails, personalize
                                communications, or manage your email marketing
                                campaigns.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Use Cases */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Common Use Cases
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {collection.useCases.map((useCase, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {useCase}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* When to use this collection */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            When should you use this collection?
                          </h4>
                          <div className="text-sm text-muted-foreground p-3 rounded border">
                            {collection.name === "tourPackages" && (
                              <ul className="space-y-1">
                                <li>
                                  •{" "}
                                  <strong>
                                    Building a tour lookup function:
                                  </strong>{" "}
                                  When you need to find a tour code by name
                                </li>
                                <li>
                                  • <strong>Calculating pricing:</strong> When
                                  you need to get tour prices for calculations
                                </li>
                                <li>
                                  • <strong>Filtering tours:</strong> When you
                                  want to show only active tours or tours in a
                                  specific price range
                                </li>
                                <li>
                                  • <strong>Getting tour details:</strong> When
                                  you need to display tour information to
                                  customers
                                </li>
                              </ul>
                            )}
                            {collection.name === "bbc-users" && (
                              <ul className="space-y-1">
                                <li>
                                  • <strong>Access control:</strong> When you
                                  need to check if a user has permission to
                                  perform an action
                                </li>
                                <li>
                                  • <strong>User management:</strong> When you
                                  need to get user details or track activity
                                </li>
                                <li>
                                  • <strong>Role-based features:</strong> When
                                  you want to show different content based on
                                  user role
                                </li>
                                <li>
                                  • <strong>Audit trails:</strong> When you need
                                  to track who performed what action
                                </li>
                              </ul>
                            )}
                            {collection.name === "paymentTerms" && (
                              <ul className="space-y-1">
                                <li>
                                  • <strong>Calculating deposits:</strong> When
                                  you need to determine how much deposit to
                                  charge
                                </li>
                                <li>
                                  • <strong>Payment processing:</strong> When
                                  you need to apply payment policies to bookings
                                </li>
                                <li>
                                  • <strong>Cancellation handling:</strong> When
                                  you need to check cancellation rules
                                </li>
                                <li>
                                  • <strong>Refund calculations:</strong> When
                                  you need to determine refund amounts
                                </li>
                              </ul>
                            )}
                            {collection.name === "bookings" && (
                              <ul className="space-y-1">
                                <li>
                                  • <strong>Booking management:</strong> When
                                  you need to process, update, or cancel
                                  bookings
                                </li>
                                <li>
                                  • <strong>Revenue tracking:</strong> When you
                                  need to calculate totals, commissions, or
                                  profits
                                </li>
                                <li>
                                  • <strong>Customer service:</strong> When you
                                  need to look up customer booking history
                                </li>
                                <li>
                                  • <strong>Reporting:</strong> When you need to
                                  generate booking reports or analytics
                                </li>
                                <li>
                                  • <strong>Notifications:</strong> When you
                                  need to send booking confirmations or updates
                                </li>
                              </ul>
                            )}
                            {collection.name === "emailTemplates" && (
                              <ul className="space-y-1">
                                <li>
                                  • <strong>Automated emails:</strong> When you
                                  need to send booking confirmations or receipts
                                </li>
                                <li>
                                  • <strong>Customer notifications:</strong>{" "}
                                  When you need to notify customers about
                                  changes
                                </li>
                                <li>
                                  • <strong>Marketing campaigns:</strong> When
                                  you need to send promotional emails
                                </li>
                                <li>
                                  •{" "}
                                  <strong>Personalized communications:</strong>{" "}
                                  When you need to customize email content
                                </li>
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Common Queries */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Common Queries
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {collection.commonQueries.map((query, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted-foreground bg-muted/50 p-2 rounded"
                              >
                                • {query}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Code Examples */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Code Examples
                          </h4>
                          <div className="bg-muted p-3 rounded">
                            <pre className="text-xs overflow-x-auto">
                              <code>{collection.exampleCode}</code>
                            </pre>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() =>
                                copyToClipboard(
                                  collection.exampleCode,
                                  `${collection.name} examples`
                                )
                              }
                            >
                              {copiedCode === collection.exampleCode ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <Copy className="h-3 w-3 mr-1" />
                              )}
                              Copy Examples
                            </Button>
                          </div>
                        </div>

                        {/* Example Output */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2">
                            Example Output
                          </h4>
                          <div className="bg-muted p-3 rounded">
                            <pre className="text-xs overflow-x-auto">
                              <code>{collection.exampleOutput}</code>
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="firebase-utils" className="mt-6">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  {firebaseUtils.map((util, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-mono text-sm font-semibold">
                          {util.name}
                        </h4>
                        <Badge variant="secondary">Method</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {util.description}
                      </p>
                      {util.parameters && (
                        <p className="text-xs text-muted-foreground mb-2">
                          <strong>Parameters:</strong> {util.parameters}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mb-3">
                        <strong>Returns:</strong> {util.returns}
                      </p>
                      <div className="bg-muted p-3 rounded">
                        <pre className="text-xs overflow-x-auto">
                          <code>{util.example}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() =>
                            copyToClipboard(util.example, util.name)
                          }
                        >
                          {copiedCode === util.example ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="firebase-functions" className="mt-6">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  {firebaseFunctions.map((func, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-mono text-sm font-semibold">
                          {func.name}
                        </h4>
                        <Badge variant="outline">Function</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {func.description}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong>Parameters:</strong> {func.parameters}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        <strong>Returns:</strong> {func.returns}
                      </p>
                      <div className="bg-muted p-3 rounded">
                        <pre className="text-xs overflow-x-auto">
                          <code>{func.example}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() =>
                            copyToClipboard(func.example, func.name)
                          }
                        >
                          {copiedCode === func.example ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
