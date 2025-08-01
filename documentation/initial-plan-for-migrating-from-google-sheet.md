# **ImHere Travels Webapp Sitemap & Architecture Plan**

Based on your existing Google Sheets system, here's a comprehensive sitemap that preserves all functionality while modernizing the user experience:

## **1. Authentication & Access Control**

### **Login System**
```
/login
├── Agent Login (Bella, team members)
├── Admin Login (System management)
└── Customer Portal Login (Future enhancement)
```

### **Role-Based Access**
- **Agents**: Full booking management access
- **Admin**: System settings, user management, reports
- **Customers**: View bookings, make payments (future)

---

## **2. Main Dashboard Hub**

### **Dashboard Overview** (`/dashboard`)
```
/dashboard
├── Quick Stats Cards
│   ├── Pending Bookings
│   ├── Due Payments Today
│   ├── Overdue Balances
│   └── Tours This Week
├── Action Items Widget
├── Recent Activity Feed
└── Quick Actions Menu
```

---

## **3. Booking Management Module**

### **Booking List** (`/bookings`)
```
/bookings
├── All Bookings (filterable table)
├── /bookings/pending
├── /bookings/confirmed  
├── /bookings/cancelled
├── /bookings/overdue-payments
└── Advanced Filters Panel
    ├── By Tour Package
    ├── By Payment Status
    ├── By Date Range
    └── By Booking Type
```

### **Individual Booking Management** (`/bookings/:id`)
```
/bookings/TR-EC-20250712-JD-01
├── Booking Overview Tab
│   ├── Customer Details
│   ├── Tour Information
│   ├── Payment Summary
│   └── Status Timeline
├── Payment Management Tab
│   ├── Payment Plan Selector
│   ├── Installment Tracker
│   ├── Payment History
│   └── Reminder Settings
├── Communications Tab
│   ├── Email Draft Generator
│   ├── Email History
│   ├── Template Selector
│   └── Send Log
├── Documents Tab
│   ├── Adventure Kit Generator
│   ├── Generated Documents
│   └── Template Manager
└── Actions Panel
    ├── Generate Email Draft
    ├── Send Reminder
    ├── Mark Payment Received
    ├── Cancel Booking
    └── Download Reports
```

---

## **4. Customer Communication Center**

### **Email Management** (`/communications`)
```
/communications
├── Draft Queue
│   ├── Pending Drafts
│   ├── Review & Send
│   └── Bulk Actions
├── Email Templates
│   ├── Reservation Confirmations
│   ├── Payment Reminders
│   ├── Cancellation Notices
│   └── Adventure Kit Emails
├── Send History
│   ├── Sent Messages Log
│   ├── Delivery Status
│   └── Response Tracking
└── BCC Management
    ├── Team Distribution Lists
    └── Notification Settings
```

### **Template Editor** (`/communications/templates/:type`)
```
/communications/templates/reservation
├── Visual Template Editor
├── Merge Tag Library
├── Preview Panel
├── A/B Testing Options
└── Version History
```

---

## **5. Payment Processing Hub**

### **Payment Overview** (`/payments`)
```
/payments
├── Payment Dashboard
│   ├── Daily Collections
│   ├── Outstanding Balances
│   ├── Overdue Payments
│   └── Payment Method Stats
├── Payment Plans Manager
│   ├── P1-P4 Configuration
│   ├── Due Date Calculator
│   └── Reminder Scheduler
├── Payment Tracking
│   ├── Transaction Log
│   ├── Bank Reconciliation
│   └── Proof of Payment Gallery
└── Reminder System
    ├── Automated Reminder Queue
    ├── Calendar Integration
    └── Reminder Templates
```

### **Individual Payment Plan** (`/payments/:bookingId`)
```
/payments/TR-EC-20250712-JD-01
├── Payment Plan Selector
├── Installment Calendar
├── Payment History Timeline
├── Reminder Settings
└── Payment Methods Setup
```

---

## **6. Tour & Package Management**

### **Tour Packages** (`/packages`)
```
/packages
├── Package List
├── /packages/create
├── /packages/:id/edit
├── Pricing History
│   ├── Current Pricing
│   ├── Historical Rates
│   └── Seasonal Adjustments
├── Package Templates
└── Bulk Import/Export
```

### **Package Details** (`/packages/:id`)
```
/packages/island-hopping-classic
├── Basic Information
├── Pricing Configuration
├── Itinerary Builder
├── Adventure Kit Template
├── Email Content Library
└── Booking Analytics
```

---

## **7. Adventure Kit Generator**

### **Adventure Kit Hub** (`/adventure-kits`)
```
/adventure-kits
├── Generation Queue
├── Template Library
├── Generated Kits Archive
├── Flight Information Manager
└── Bulk Generation Tools
```

### **Kit Builder** (`/adventure-kits/create/:bookingId`)
```
/adventure-kits/create/TR-EC-20250712-JD-01
├── Customer Information Panel
├── Flight Details Form
├── Itinerary Builder
├── Template Selector
├── Document Preview
└── Generate & Send Actions
```

---

## **8. Reports & Analytics**

### **Reports Dashboard** (`/reports`)
```
/reports
├── Financial Reports
│   ├── Revenue Analytics
│   ├── Payment Status Reports
│   ├── Outstanding Balances
│   └── Collection Efficiency
├── Booking Reports
│   ├── Booking Trends
│   ├── Conversion Rates
│   ├── Cancellation Analysis
│   └── Customer Segments
├── Operational Reports
│   ├── Email Performance
│   ├── Response Times
│   ├── Agent Productivity
│   └── System Usage Stats
└── Custom Report Builder
```

---

## **9. System Administration**

### **Settings Hub** (`/admin`)
```
/admin
├── User Management
│   ├── Agent Accounts
│   ├── Role Permissions
│   └── Access Logs
├── System Configuration
│   ├── Email Settings
│   ├── Payment Gateway Config
│   ├── Calendar Integration
│   └── Notification Preferences
├── Template Management
│   ├── Email Templates
│   ├── Document Templates
│   └── Adventure Kit Templates
├── Integration Settings
│   ├── Zapier Webhooks
│   ├── Google Services
│   └── Third-party APIs
└── Data Management
    ├── Backup Settings
    ├── Import/Export Tools
    └── Data Cleanup Utilities
```

---

## **10. Mobile-Responsive Views**

### **Mobile Navigation**
```
Mobile Menu
├── Dashboard (condensed)
├── Quick Booking Search
├── Today's Tasks
├── Payment Due Today
├── Send Quick Email
└── Emergency Actions
```

---

## **11. API Endpoints Structure**

### **RESTful API Design**
```
/api/v1/
├── /bookings
│   ├── GET /bookings (list with filters)
│   ├── POST /bookings (create)
│   ├── GET /bookings/:id
│   ├── PUT /bookings/:id
│   └── DELETE /bookings/:id
├── /payments
│   ├── GET /payments/:bookingId
│   ├── POST /payments/:bookingId/plan
│   └── PUT /payments/:bookingId/status
├── /communications
│   ├── POST /communications/draft
│   ├── POST /communications/send
│   └── GET /communications/history
├── /adventure-kits
│   ├── POST /adventure-kits/generate
│   └── GET /adventure-kits/:id
└── /webhooks
    ├── POST /webhooks/zapier
    └── POST /webhooks/payment-received
```

---

## **12. Progressive Web App Features**

### **Offline Capabilities**
- Cache critical booking data
- Offline draft composition
- Sync when connection restored

### **Push Notifications**
- Payment due alerts
- Booking confirmations
- System notifications

---

## **Implementation Priority Phases**

### **Phase 1: Core Migration** (Weeks 1-4)
1. Authentication system
2. Booking list and details views
3. Basic email generation
4. Payment tracking

### **Phase 2: Communication Enhancement** (Weeks 5-8)
1. Advanced email templates
2. Bulk actions
3. Communication history
4. Adventure kit generation

### **Phase 3: Advanced Features** (Weeks 9-12)
1. Reports and analytics
2. Mobile optimization
3. Advanced automation
4. API integrations

### **Phase 4: Optimization** (Weeks 13-16)
1. Performance optimization
2. Advanced search and filtering
3. User experience refinements
4. Additional integrations

This sitemap preserves all your existing functionality while providing a modern, scalable web interface that can grow with your business!