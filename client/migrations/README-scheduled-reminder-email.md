# Scheduled Reminder Email Template Migration

## Overview

This migration adds a comprehensive "Scheduled Reminder Email" template to the database with proper variable definitions and Google Apps Script-like syntax. This template is designed to send reminders to travelers before their tour departure.

## Template Features

### **Dynamic Content**

- **Conditional Rendering**: Different content based on booking type (Individual, Duo, Group)
- **Variable Substitution**: Personalized content with recipient and tour data
- **Professional Design**: Clean, organized layout with proper styling

### **Variables Used**

| Variable              | Type   | Description                                 | Example                                      |
| --------------------- | ------ | ------------------------------------------- | -------------------------------------------- |
| `fullName`            | string | Recipient's full name                       | "John Smith"                                 |
| `tourPackage`         | string | Tour package name                           | "Philippines Adventure - 7 Days"             |
| `tourDate`            | string | Start date of the tour                      | "2025-01-15"                                 |
| `returnDate`          | string | End date of the tour                        | "2025-01-22"                                 |
| `tourDuration`        | number | Duration of the tour in days                | 7                                            |
| `bookingId`           | string | Unique booking identifier                   | "BK-2025-001"                                |
| `bookingType`         | string | Type of booking                             | "Individual", "Duo Booking", "Group Booking" |
| `groupId`             | string | Group identifier (for group/duo bookings)   | "GRP-2025-001"                               |
| `mainBooker`          | string | Main booker's name (for group/duo bookings) | "Jane Smith"                                 |
| `meetingPoint`        | string | Location where the tour will meet           | "Siargao Airport Terminal"                   |
| `departureTime`       | string | Time when the tour will depart              | "9:00 AM"                                    |
| `specialInstructions` | string | Any special instructions or notes           | "Bring snorkeling gear"                      |

## Template Logic

### **Conditional Rendering**

```html
<? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
<!-- Show Group ID and Main Booker fields -->
<tr>
  <td><strong>Group ID:</strong></td>
  <td><?= groupId ?></td>
</tr>
<tr>
  <td><strong>Main Booker:</strong></td>
  <td><?= mainBooker ?></td>
</tr>
<? } ?>
```

### **Special Instructions Display**

```html
<? if (specialInstructions && specialInstructions.trim() !== "") { ?>
<!-- Show special instructions section -->
<h3 style="color: #d00;">Special Instructions</h3>
<div
  style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 15px 0;"
>
  <p style="margin: 0; color: #856404;"><?= specialInstructions ?></p>
</div>
<? } ?>
```

## Template Structure

### **Header Section**

- Personalized greeting with recipient's name
- Tour package introduction

### **Tour Details Table**

- Organized information display with alternating row colors
- Conditional fields for group/duo bookings
- Professional table styling

### **Important Reminders**

- Standard checklist of items to remember
- Meeting point and departure time information
- Special instructions (when available)

### **Footer**

- Contact information and support details
- Company branding and logo

## Database Structure

The template will be stored in the `emailTemplates` collection with:

- **Content**: Full HTML template with `<?= ?>` and `<? ?>` syntax
- **Variables**: Array of variable names extracted from the template
- **VariableDefinitions**: Detailed type definitions for each variable
- **Status**: Set to "active" by default
- **Metadata**: Creation timestamp and system attribution

## Usage in Application

Once migrated, the template will be available in:

1. **CommunicationsCenter**: Listed with other templates
2. **TemplateDialog**: Editable with proper variable definitions
3. **Live Preview**: Testable with sample data
4. **Email Service**: Ready for production use

## Benefits

- **Type Safety**: Proper variable type definitions prevent runtime errors
- **Dynamic Content**: Conditional rendering based on booking type
- **Professional Appearance**: Clean, organized layout suitable for customer communication
- **Flexible**: Handles individual, duo, and group bookings
- **Maintainable**: Clear variable structure and documentation
- **User-Friendly**: Important information clearly highlighted and organized

## Support

For questions or issues with this migration:

1. Check the console logs for detailed error messages
2. Verify Firebase connection and permissions
3. Ensure all required dependencies are installed
4. Review the template syntax for any malformed tags

## Migration Commands

### Run Migration

```bash
cd client/migrations
npm run migrate 010-scheduled-reminder-email-template
```

### Dry Run (Test Only)

```bash
cd client/migrations
npm run migrate 010-scheduled-reminder-email-template --dry-run
```

### Rollback Migration

```bash
cd client/migrations
npm run rollback 010-scheduled-reminder-email-template
```
