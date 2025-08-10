# Complete Admin Portal Sitemap v2 for ImHereTravels

*This document combines the comprehensive v1 sitemap with enhanced v2 features and functionality*

## Role-Based Access Control
| Role | Permissions |
|------|-------------|
| **Admin** | Full CRUD access, user management, system settings, financial data |
| **Agent** | View bookings, manage assigned bookings, send communications, limited reporting |

---

## Enhanced Sitemap Structure

### 1. Dashboard (`/dashboard`)
**Admin & Agent Access**

#### Performance Overview
- **Real-time Metrics**:
  - Bookings today/week/month
  - Revenue by payment status
  - Upcoming tours (next 7 days)
  - Pending payment reminders
  - Conversion rates (lead to booking)
- **Enhanced Visualizations**:
  - Booking trends (30/90 days)
  - Tour popularity heatmap
  - Payment status distribution
  - Customer acquisition funnel
  - Revenue forecasting

#### Booking Pipeline Visualization
- Lead tracking pipeline
- Conversion status overview
- Follow-up reminders
- Hot prospects identification

#### Urgent Action Items
- Overdue payments
- Upcoming tour preparations
- Pending customer responses
- System alerts and notifications

#### Quick Actions
- Create new booking
- Add new contact/lead
- Generate reports
- Send bulk communications

---

### 2. Bookings Management (`/bookings`)
**Admin & Agent Access**

#### a) Booking List (Enhanced)
- **Advanced Table View**:
  - Filter by: Status, Tour, Payment Plan, Date Range, Customer Type
  - Search by: Name, Email, Booking ID, Phone
  - Sortable columns: ID, Date, Amount, Balance, Status
  - Export capabilities (CSV, Excel, PDF)
- **Enhanced Columns**:
  - Booking ID
  - Traveler Name & Contact
  - Tour Package & Dates
  - Payment Status & Balance
  - Customer Type & Status
  - Last Communication
  - Actions (View/Edit/Communicate)

#### b) Booking Detail (`/bookings/[id]`)
**Admin & Agent Access**

- **Overview Tab**:
  - Traveler information with contact history
  - Tour details with flight information
  - Payment terms and schedule
  - Group information (if applicable)
  - Customer classification and status

- **Payment Schedule Tab**:
  - Interactive timeline with visual indicators
  - Mark payments as received
  - Edit due dates (Admin only)
  - Payment method tracking
  - Automated reminder scheduling

- **Communications Tab**:
  - Complete email history with delivery status
  - Resend/Send new email functionality
  - Template selection with customization
  - SMS/WhatsApp integration (future)

- **Flight Information Tab** (NEW):
  - Flight details management
  - Itinerary tracking
  - Special requirements
  - Travel document status

- **Notes & Audit Log**:
  - Internal notes with timestamps
  - Complete change history
  - User activity tracking
  - Customer interaction log

- **Actions**:
  - Cancel booking with reason tracking
  - Apply discounts (Admin only)
  - Generate adventure kit
  - Create follow-up tasks

#### c) Group Management (Enhanced)
- Group booking coordination
- Multi-traveler management
- Shared payment tracking
- Group communication tools

---

### 3. Tours Management (`/tours`)
**Admin Access (Full CRUD) | Agent Access (View Only)**

#### a) Tour List (Enhanced)
- **Advanced Table View**:
  - Filter by status, location, price range
  - Search by name, description, location
  - Sort by price, popularity, profitability
- **Enhanced Columns**:
  - Tour Name & Location
  - Duration & Difficulty
  - Current Pricing
  - Bookings Count & Revenue
  - Status & Availability
  - Performance Metrics

#### b) Tour Editor (`/tours/[id]`)
**Admin Access Only**

- **Package Information**:
  - Basic details (name, description, location)
  - Pricing management with history tracking
  - Itinerary builder with rich media
  - Highlights and selling points
  - Requirements and restrictions

#### c) Pricing History (NEW)
- Historical pricing data
- Price change tracking
- Revenue impact analysis
- Competitive pricing insights

- **Performance Analytics**:
  - Bookings by month/season
  - Average booking value trends
  - Cancellation rates and reasons
  - Customer satisfaction scores
  - Profitability analysis

- **Media Management**:
  - Image gallery with metadata
  - Video integration
  - Virtual tour capabilities
  - Social media assets

---

### 4. Data Management (`/data`) (NEW)
**Admin Access Only**

#### a) Reference Data Management
- **Payment Terms Configuration**:
  - Term definitions and rules
  - Eligibility criteria
  - Automated calculations

- **Booking Status Management**:
  - Status definitions and workflows
  - Transition rules and automation
  - Color coding and priorities

- **Customer Type Categories**:
  - Segmentation definitions
  - Behavioral tracking
  - Targeted marketing rules

- **Cancellation Reason Library**:
  - Reason categorization
  - Refund policy mapping
  - Trend analysis

- **Customer Status Tracking**:
  - Lifecycle stage definitions
  - Progression rules
  - Retention strategies

#### b) Operational Data Management
- **BCC Groups Configuration**:
  - Email distribution lists
  - Role-based notifications
  - Template associations

- **Internal Flight Info Database**:
  - Flight tracking system
  - Itinerary management
  - Real-time updates

- **Contact Database (CRM)**:
  - Lead management
  - Customer profiles
  - Communication history
  - Conversion tracking

---

### 5. Content Management (`/content`) (NEW)
**Admin Access Only**

#### a) Email Templates (Enhanced)
- **Template Categories**:
  - Reservation confirmations
  - Payment reminders (P1-P4)
  - Cancellation notices
  - Booking confirmations
  - Follow-up sequences

- **Advanced Template Editor**:
  - Drag-and-drop builder
  - Dynamic variable insertion
  - Conditional content blocks
  - A/B testing capabilities
  - Mobile responsiveness
  - Brand consistency tools

#### b) Adventure Kits Management
- **Template Management**:
  - Digital kit creation
  - Customization options
  - Media integration

- **Generation Queue**:
  - Batch processing
  - Quality control
  - Delivery scheduling

- **Sent History & Analytics**:
  - Delivery tracking
  - Engagement metrics
  - Customer feedback

---

### 6. Communications Center (`/communications`)
**Admin & Agent Access**

#### a) Template Management (Enhanced)
- **Template Gallery**:
  - Categorized template library
  - Usage statistics
  - Performance metrics
  - Version control

- **Advanced Template Editor**:
  - Rich text editor with media
  - Variable insertion with preview
  - Conditional logic support
  - Multi-language support
  - Brand compliance checking

#### b) Sent Communications History
- **Comprehensive Email Log**:
  - Filter by type, status, date, recipient
  - Search functionality
  - Delivery and engagement tracking
  - Response management

#### c) Delivery Analytics (NEW)
- Email performance metrics
- Engagement rate analysis
- Bounce and spam reporting
- ROI tracking
- Campaign effectiveness

#### d) Communication Actions
- Bulk email campaigns
- Automated sequences
- Personalized messaging
- Template testing

---

### 7. Reporting & Analytics (`/reports`)
**Admin & Agent Access (Role-Based)**

#### a) Financial Reports (Enhanced)
- Revenue analysis by tour/period
- Payment plan performance
- Outstanding balances with aging
- Cancellation impact analysis
- Profitability by customer segment
- Cash flow forecasting

#### b) Booking Analytics (Enhanced)
- Booking source attribution
- Customer demographics and behavior
- Seasonality trends and patterns
- Conversion funnel analysis
- Customer lifetime value
- Retention rate analysis

#### c) Customer Insights (NEW)
- Customer segmentation analysis
- Behavioral pattern recognition
- Satisfaction score tracking
- Churn prediction
- Upselling opportunities
- Referral tracking

#### d) Tour Performance (NEW)
- Tour popularity rankings
- Capacity utilization
- Revenue per tour
- Customer satisfaction by tour
- Competitive analysis
- Optimization recommendations

#### e) Operational Reports
- Agent performance metrics
- Communication effectiveness
- System usage analytics
- Customer service metrics

#### f) Export & Scheduling Options
- Multiple format support (CSV, Excel, PDF)
- Automated report scheduling
- Dashboard sharing
- API access for integrations

---

### 8. System Settings (`/settings`)
**Admin Access Only**

#### a) User Management (Enhanced)
- **Role & Permission Management**:
  - Admin/Agent role definitions
  - Granular permission sets
  - Activity monitoring
  - Access control rules

- **User Activity Tracking**:
  - Login history
  - Action logs
  - Performance metrics
  - Security monitoring

#### b) API Integrations (Enhanced)
- **Payment Configuration**:
  - Stripe/Revolut integration
  - Payment gateway management
  - Transaction monitoring
  - Refund processing

- **Communication Services**:
  - Email service providers
  - SMS/WhatsApp integration
  - Calendar sync (Google/Outlook)
  - CRM integrations

#### c) System Configuration
- **Business Rules Engine**:
  - Automated workflows
  - Trigger conditions
  - Action definitions
  - Exception handling

- **Data Management**:
  - Backup scheduling
  - Data retention policies
  - Privacy compliance
  - Audit trail management

#### d) Data Backup & Security
- Automated backup systems
- Data recovery procedures
- Security monitoring
- Compliance reporting

---

### 9. User Profile (`/profile`)
**Admin & Agent Access**

#### Enhanced Profile Management
- **Personal Information**:
  - Contact details
  - Profile picture
  - Timezone settings
  - Language preferences

- **Security Settings**:
  - Password management
  - Two-factor authentication
  - API token management
  - Device management

- **Notification Preferences**:
  - Email notifications
  - SMS alerts
  - Dashboard notifications
  - Frequency settings

- **Activity Dashboard**:
  - Personal performance metrics
  - Recent activity log
  - Task management
  - Goal tracking

---

## Enhanced Feature Matrix

| Feature | Admin | Agent | Notes |
|---------|-------|-------|-------|
| **Create Bookings** | ✓ | ✓ | Full access |
| **Edit Bookings** | ✓ | Limited* | *Non-financial fields only |
| **Cancel Bookings** | ✓ | ✓ | With reason tracking |
| **Manage Reference Data** | ✓ | ✗ | Admin configuration only |
| **CRM & Contacts** | ✓ | ✓ | Lead management |
| **Flight Information** | ✓ | ✓ | Operational data |
| **Create Tours** | ✓ | ✗ | Admin only |
| **Edit Tours** | ✓ | ✗ | Admin only |
| **Content Management** | ✓ | ✗ | Templates & kits |
| **Advanced Analytics** | ✓ | Limited | Role-based reporting |
| **System Configuration** | ✓ | ✗ | Admin only |
| **API Management** | ✓ | ✗ | Integration settings |
| **User Management** | ✓ | ✗ | Admin only |
| **Bulk Operations** | ✓ | Limited | Restricted scope |

---

## Enhanced Workflow Preservation & Automation

### 1. Payment Terms Calculation (Enhanced)
```ts
function calculatePaymentTermsV2(
  daysUntilTour: number, 
  eligibleDates: number,
  customerType: string,
  bookingHistory: number
) {
  // Apply customer-specific rules
  const customerModifier = getCustomerModifier(customerType, bookingHistory);
  
  if (daysUntilTour <= 2) return 'Invalid';
  if (eligibleDates === 0) return 'Last Minute';
  
  // Enhanced logic with customer segmentation
  const baseTerms = calculateBaseTerms(eligibleDates);
  return applyCustomerModifier(baseTerms, customerModifier);
}
```

### 2. Automated Communication Workflows
```ts
function triggerAutomatedCommunications(booking: Booking) {
  // Send confirmation email
  scheduleEmail('reservation', booking, 'immediate');
  
  // Schedule payment reminders
  booking.schedule.forEach(payment => {
    scheduleEmail('payment-reminder', booking, payment.reminderDate);
  });
  
  // Schedule adventure kit delivery
  scheduleEmail('adventure-kit', booking, addDays(booking.tour.date, -7));
  
  // Schedule follow-up surveys
  scheduleEmail('feedback', booking, addDays(booking.tour.returnDate, 3));
}
```

### 3. Customer Lifecycle Management
```ts
function updateCustomerLifecycle(contact: Contact, booking: Booking) {
  // Update customer status based on booking behavior
  const newStatus = determineCustomerStatus(contact.bookings.length, booking.status);
  
  // Apply customer type classification
  const customerType = classifyCustomer(contact.bookings, contact.source);
  
  // Update contact record
  updateContact(contact.id, { status: newStatus, customerType });
  
  // Trigger appropriate communication sequence
  triggerLifecycleEmail(contact, newStatus);
}
```

---

## Advanced Security Features

### 1. Enhanced Authentication
- **Multi-Factor Authentication**: SMS, email, authenticator app
- **Single Sign-On (SSO)**: Integration with corporate identity providers
- **Session Management**: Automatic timeout, concurrent session control
- **Password Policies**: Complexity requirements, rotation schedules

### 2. Granular Authorization
- **Role-Based Access Control (RBAC)**: Fine-grained permissions
- **Resource-Level Security**: Individual booking/tour access control
- **Time-Based Access**: Temporary permissions and access windows
- **IP Restrictions**: Geographic and network-based access control

### 3. Data Protection & Compliance
- **Data Encryption**: At rest and in transit
- **PII Protection**: Personal data masking and anonymization
- **GDPR Compliance**: Right to be forgotten, data portability
- **Audit Trails**: Complete action logging and reporting
- **Data Retention**: Automated cleanup and archival

---

## Migration & Implementation Timeline

### Phase 1: Core System Migration (3 Weeks)
- **Week 1**: Core booking system with v1 features
- **Week 2**: Tour management and basic communications
- **Week 3**: User management and basic reporting

### Phase 2: Enhanced Features (3 Weeks)
- **Week 1**: Reference data and CRM implementation
- **Week 2**: Advanced communications and content management
- **Week 3**: Enhanced analytics and reporting

### Phase 3: Advanced Automation (2 Weeks)
- **Week 1**: Workflow automation and business rules
- **Week 2**: API integrations and third-party connections

### Phase 4: Testing & Deployment (1 Week)
- **Days 1-3**: User acceptance testing
- **Days 4-5**: Data migration validation
- **Days 6-7**: Production deployment and monitoring

---

## Integration Capabilities

### 1. Payment Gateways
- Stripe for online payments
- Revolut for international transfers
- Bank transfer automation
- Cryptocurrency payment options

### 2. Communication Platforms
- Email service providers (SendGrid, Mailgun, Amazon SES)
- SMS gateways (Twilio, MessageBird)
- WhatsApp Business API
- Social media scheduling

### 3. Business Intelligence
- Google Analytics integration
- Custom dashboard embedding
- Data warehouse connections
- Machine learning insights

### 4. Travel Industry APIs
- Flight tracking services
- Weather information
- Currency exchange rates
- Travel advisories

This comprehensive sitemap combines all v1 functionality with enhanced v2 features, providing a complete enterprise-grade solution for ImHereTravels' booking and customer management needs. The system maintains all existing business processes while adding powerful new capabilities for growth, automation, and customer experience optimization.
