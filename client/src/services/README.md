# Email Templates Service

This service provides comprehensive CRUD operations for email templates using Firebase Firestore.

## Features

- **Create Templates**: Build new email templates with HTML/CSS
- **Read Templates**: Fetch templates with filtering, sorting, and pagination
- **Update Templates**: Modify existing templates
- **Delete Templates**: Remove templates with confirmation
- **Duplicate Templates**: Create copies of existing templates
- **Template Variables**: Support for dynamic content using `{{variable}}` syntax
- **Image Upload**: Upload images to Supabase storage for use in templates
- **Template Types**: Pre-built templates for common use cases
- **Status Management**: Active, draft, and archived template states

## Firebase Collection Structure

The service uses the `emailTemplates` collection in Firestore with the following structure:

```typescript
interface CommunicationTemplate {
  id: string; // Auto-generated Firestore ID
  type: "reservation" | "payment-reminder" | "cancellation" | "adventure-kit";
  name: string;
  subject: string;
  content: string; // HTML content
  variables: string[]; // ["{{traveler_name}}", "{{tour_name}}"]
  status: "active" | "draft" | "archived";
  bccGroups: string[]; // References to bccGroups
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string; // User ID
    usedCount: number;
  };
}
```

## Usage Examples

### Creating a Template

```typescript
import { EmailTemplatesService } from "@/services/email-templates-service";

const templateData = {
  type: "reservation" as TemplateType,
  name: "Welcome Email",
  subject: "Welcome to ImHereTravels!",
  content: "<html>...</html>",
  variables: ["{{traveler_name}}", "{{tour_name}}"],
  status: "draft" as TemplateStatus,
};

const templateId = await EmailTemplatesService.createTemplate(
  templateData,
  userId
);
```

### Fetching Templates

```typescript
// Get all templates
const result = await EmailTemplatesService.getTemplates();

// Get templates with filters
const result = await EmailTemplatesService.getTemplates({
  filters: {
    type: "reservation",
    status: "active",
    search: "welcome",
  },
  sortBy: "metadata.updatedAt",
  sortOrder: "desc",
  limit: 10,
});
```

### Updating a Template

```typescript
await EmailTemplatesService.updateTemplate({
  id: "template-id",
  name: "Updated Template Name",
  status: "active",
});
```

### Deleting a Template

```typescript
await EmailTemplatesService.deleteTemplate("template-id");
```

### Duplicating a Template

```typescript
const newTemplateId = await EmailTemplatesService.duplicateTemplate(
  "template-id",
  userId
);
```

## Template Variables

The system supports dynamic content using template variables:

- `{{traveler_name}}` - Customer's name
- `{{tour_name}}` - Tour package name
- `{{tour_date}}` - Tour departure date
- `{{booking_id}}` - Unique booking identifier
- `{{amount_due}}` - Payment amount
- `{{due_date}}` - Payment due date

## Pre-built Templates

The service includes ready-to-use templates for common scenarios:

1. **Reservation Confirmation**: Welcome email for confirmed bookings
2. **Payment Reminder**: Gentle reminders for outstanding payments
3. **Cancellation Notice**: Professional cancellation communications
4. **Adventure Kit**: Pre-tour information and resources

## Security

- Templates are secured by Firestore rules
- Users can only access templates they created
- Admin users have access to all templates
- Authentication is required for all operations

## Image Upload

Images can be uploaded to Supabase storage and embedded in templates:

```typescript
const handleImageUpload = async (file: File) => {
  const filename = `email-images/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("communications")
    .upload(filename, file);

  if (!error) {
    const {
      data: { publicUrl },
    } = supabase.storage.from("communications").getPublicUrl(filename);

    // Insert image tag into template
    const imageTag = `<img src="${publicUrl}" alt="${file.name}">`;
    // ... update template content
  }
};
```

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  await EmailTemplatesService.createTemplate(templateData, userId);
  toast({
    title: "Success",
    description: "Template created successfully",
  });
} catch (error) {
  toast({
    title: "Error",
    description: "Failed to create template",
    variant: "destructive",
  });
}
```

## Dependencies

- Firebase Firestore
- Supabase Storage (for images)
- React hooks for state management
- Toast notifications for user feedback
