# Comprehensive Admin Portal Sitemap for ImHereTravels

## Role-Based Access
| Role | Permissions |
|------|-------------|
| **Admin** | Full CRUD access, user management, system settings |
| **Agent** | View bookings, manage assigned bookings, send communications |

---

## Sitemap Structure

### 1. Dashboard (`/dashboard`)
**Admin & Agent Access**
- **Real-time Metrics**:
  - Bookings today/week/month
  - Revenue by payment status
  - Upcoming tours (next 7 days)
  - Pending payment reminders
- **Visualizations**:
  - Booking trends (30 days)
  - Tour popularity heatmap
  - Payment status distribution
- **Quick Actions**:
  - Create new booking
  - View urgent reminders
  - Generate report

---

### 2. Bookings Management (`/bookings`)
#### a) Booking List
**Admin & Agent Access**
- **Table View**:
  - Filter by: Status, Tour, Payment Plan, Date Range
  - Search by: Name, Email, Booking ID
  - Sortable columns: ID, Date, Amount, Balance
- **Columns**:
  - Booking ID
  - Traveler Name
  - Tour Package
  - Tour Date
  - Payment Status
  - Remaining Balance
  - Actions (View/Edit)

#### b) Booking Detail (`/bookings/[id]`)
**Admin & Agent Access**
- **Overview Tab**:
  - Traveler information
  - Tour details
  - Payment terms
  - Group information (if applicable)
- **Payment Schedule Tab**:
  - Interactive timeline
  - Mark payments as received
  - Edit due dates (Admin only)
- **Communications Tab**:
  - Email history with status
  - Resend/Send new email
  - Template selection
- **Notes & Audit Log**:
  - Internal notes
  - Change history
- **Actions**:
  - Cancel booking
  - Apply discount
  - Generate adventure kit

---

### 3. Tour Packages (`/tours`)
#### a) Tour List
**Admin & Agent Access**
- **Table View**:
  - Filter by status, location
  - Search by name
  - Sort by price, popularity
- **Columns**:
  - Tour Name
  - Location
  - Duration
  - Base Price
  - Bookings (count)
  - Status

#### b) Tour Detail (`/tours/[id]`)
**Admin Access (Full CRUD)**  
**Agent Access (View Only)**
- **Package Editor**:
  - Basic info (name, description)
  - Pricing (original/discounted)
  - Itinerary builder
  - Highlights
- **Statistics**:
  - Bookings by month
  - Average booking value
  - Cancellation rate
- **Media Gallery**:
  - Upload images
  - Manage videos

---

### 4. Communications Center (`/communications`)
#### a) Template Management (`/communications/templates`)
**Admin Access**
- **Template Gallery**:
  - Reservation confirmation
  - Payment reminders
  - Cancellation notices
  - Adventure kits
- **Template Editor**:
  - Drag-and-drop builder
  - Variables insertion (e.g., {{traveler_name}})
  - Preview mode
  - Version history

#### b) Sent Communications (`/communications/history`)
**Admin & Agent Access**
- **Email Log**:
  - Filter by type, status, date
  - Search by recipient
  - Delivery status tracking
- **Actions**:
  - Resend emails
  - View HTML source
  - Export list

---

### 5. Reporting & Analytics (`/reports`)
**Admin & Agent Access**
#### a) Financial Reports
- Revenue by tour
- Payment plan performance
- Outstanding balances
- Cancellation refunds

#### b) Booking Analytics
- Booking sources
- Customer demographics
- Seasonality trends
- Conversion funnel

#### c) Operational Reports
- Agent performance
- Email effectiveness
- Tour capacity utilization

#### d) Export Options
- CSV/Excel
- PDF (print-ready)
- Scheduled reports

---

### 6. Settings (`/settings`)
**Admin Access Only**
#### a) Payment Configuration
- Payment terms mapping
- Stripe/Revolut integration
- Invoice templates

#### b) Cancellation Management
- Reason library
- Refund policies
- Automated workflows

#### c) User Management
- Admin/Agent roles
- Permission sets
- Activity logs

#### d) System Configuration
- API keys
- Email services
- Audit logs
- Data backup

---

### 7. User Profile (`/profile`)
**Admin & Agent Access**
- Personal information
- Notification preferences
- Security settings (2FA)
- API token management
- Activity history

---

## Key Feature Matrix

| Feature | Admin | Agent |
|---------|-------|-------|
| **Create Bookings** | ✓ | ✓ |
| **Edit Bookings** | ✓ | Limited* |
| **Cancel Bookings** | ✓ | ✓ |
| **Create Tours** | ✓ | ✗ |
| **Edit Tours** | ✓ | ✗ |
| **Manage Templates** | ✓ | ✗ |
| **Send Communications** | ✓ | ✓ |
| **View Reports** | ✓ | ✓ |
| **Export Reports** | ✓ | Limited |
| **User Management** | ✓ | ✗ |
| **System Settings** | ✓ | ✗ |

*\*Agents can only edit non-financial booking details*

---

## Workflow Preservation
The portal maintains all Google Sheets logic:

1. **Payment Terms Calculation**:
```ts
function calculatePaymentTerms(daysUntilTour: number, eligibleDates: number) {
  if (daysUntilTour <= 2) return 'Invalid';
  if (eligibleDates === 0) return 'Last Minute';
  if (eligibleDates === 1) return 'P1';
  if (eligibleDates === 2) return 'P2';
  if (eligibleDates === 3) return 'P3';
  return 'P4';
}
```

2. **Due Date Scheduling**:
```ts
function generateDueDates(reservationDate: Date, tourDate: Date, term: string) {
  const dates = [];
  const months = {P1:1, P2:2, P3:3, P4:4}[term] || 0;
  
  for (let i = 1; i <= months; i++) {
    const dueDate = new Date(reservationDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    dueDate.setDate(2);
    
    // Validate date constraints
    if (dueDate > addDays(reservationDate, 2) && 
        dueDate < addDays(tourDate, -3)) {
      dates.push(dueDate);
    }
  }
  
  return dates;
}
```

3. **Group ID Generation**:
```ts
function generateGroupId(booking: Booking) {
  if (booking.type === 'single') return null;
  
  const initials = `${booking.firstName[0]}${booking.lastName[0]}`.toUpperCase();
  const emailHash = createEmailHash(booking.email);
  const memberCount = getGroupMemberCount(booking);
  
  return `${booking.type === 'duo' ? 'DB' : 'GB'}-${initials}-${emailHash}-${memberCount.toString().padStart(3, '0')}`;
}
```

---

## Security Features
1. **Authentication**:
   - Firebase Auth with email/password
   - 2FA enforcement for admins
   - Session timeout (15 min)

2. **Authorization**:
   - Role-based access control
   - Permission granularity
   - Activity monitoring

3. **Data Protection**:
   - Encryption at rest (Firestore)
   - Field-level security
   - Audit trails for financial changes

4. **Compliance**:
   - GDPR-ready data handling
   - Financial data isolation
   - Regular security audits

---

## Migration Timeline

### Phase 1: Core Booking System (2 Weeks)
- Booking CRUD operations
- Payment calculation engine
- Basic reporting

### Phase 2: Communications & Automation (2 Weeks)
- Email template system
- Automated reminders
- Adventure kit generator

### Phase 3: Advanced Features (1.5 Weeks)
- Financial reporting
- User management
- System settings

### Phase 4: Testing & Deployment (0.5 Week)
- UAT with current Google Sheets users
- Data migration validation
- Production deployment

This sitemap maintains all existing business processes while adding enterprise-grade features, enhanced security, and improved usability. The portal will fully replace the Google Sheets system with a modern, scalable solution tailored to ImHereTravels' specific workflow requirements.