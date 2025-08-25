# Email Template Service

A comprehensive Firebase-based service for managing email templates with full CRUD operations, validation, and real-time updates.

## Features

- ✅ **Full CRUD Operations**: Create, Read, Update, Delete templates
- ✅ **Template Validation**: Built-in validation for HTML content and variables
- ✅ **Real-time Updates**: Subscribe to template changes with Firestore listeners
- ✅ **Advanced Filtering**: Filter by type, status, creator, and search terms
- ✅ **Pagination Support**: Efficient pagination for large template collections
- ✅ **Bulk Operations**: Bulk update statuses and delete multiple templates
- ✅ **Template Duplication**: Easy template copying with automatic naming
- ✅ **Usage Tracking**: Track how often templates are used
- ✅ **Analytics**: Get comprehensive template statistics
- ✅ **Archive System**: Soft delete with archive/restore functionality
- ✅ **Variable Extraction**: Automatic extraction of template variables from HTML

## Installation

The service is already integrated with your Firebase setup. Make sure you have the required dependencies:

```bash
npm install firebase
```

## Basic Usage

### Import the Service

```typescript
import EmailTemplateService from "@/services/email-template-service";
```

### Create a Template

```typescript
const templateData = {
  type: "reservation" as const,
  name: "Booking Confirmation",
  subject: "Your Adventure Awaits - Booking Confirmed!",
  content: "<!DOCTYPE html><html>...</html>",
  variables: ["{{traveler_name}}", "{{tour_name}}"],
  status: "draft" as const,
};

try {
  const templateId = await EmailTemplateService.createTemplate(
    templateData,
    "user123"
  );
  console.log("Template created:", templateId);
} catch (error) {
  console.error("Failed to create template:", error);
}
```

### Get All Templates

```typescript
try {
  const result = await EmailTemplateService.getTemplates({
    filters: { status: "active" },
    sortBy: "metadata.updatedAt",
    sortOrder: "desc",
    limit: 10,
  });

  console.log("Templates:", result.templates);
  console.log("Total:", result.total);
  console.log("Has more:", result.hasMore);
} catch (error) {
  console.error("Failed to get templates:", error);
}
```

### Update a Template

```typescript
try {
  await EmailTemplateService.updateTemplate({
    id: "template123",
    name: "Updated Template Name",
    status: "active",
  });
  console.log("Template updated successfully");
} catch (error) {
  console.error("Failed to update template:", error);
}
```

### Delete a Template

```typescript
try {
  await EmailTemplateService.deleteTemplate("template123");
  console.log("Template deleted successfully");
} catch (error) {
  console.error("Failed to delete template:", error);
}
```

## Advanced Features

### Real-time Updates

```typescript
// Subscribe to real-time template updates
const unsubscribe = EmailTemplateService.subscribeToTemplates(
  (templates) => {
    console.log("Templates updated:", templates);
    // Update your UI here
  },
  {
    filters: { status: "active" },
    sortBy: "metadata.updatedAt",
    sortOrder: "desc",
  }
);

// Don't forget to unsubscribe when component unmounts
useEffect(() => {
  return () => unsubscribe();
}, []);
```

### Template Validation

```typescript
const validation = EmailTemplateService.validateTemplate(templateData);

if (validation.isValid) {
  console.log("Template is valid");
  if (validation.warnings.length > 0) {
    console.log("Warnings:", validation.warnings);
  }
} else {
  console.error("Validation errors:", validation.errors);
}
```

### Bulk Operations

```typescript
// Bulk update status
try {
  await EmailTemplateService.bulkUpdateStatus(
    ["template1", "template2", "template3"],
    "archived"
  );
  console.log("Bulk status update completed");
} catch (error) {
  console.error("Bulk update failed:", error);
}

// Bulk delete
try {
  await EmailTemplateService.bulkDeleteTemplates([
    "template1",
    "template2",
    "template3",
  ]);
  console.log("Bulk delete completed");
} catch (error) {
  console.error("Bulk delete failed:", error);
}
```

### Template Statistics

```typescript
try {
  const stats = await EmailTemplateService.getTemplateStats();

  console.log("Total templates:", stats.total);
  console.log("By type:", stats.byType);
  console.log("By status:", stats.byStatus);
  console.log("By user:", stats.byUser);
  console.log("Recent activity:", stats.recentActivity);
} catch (error) {
  console.error("Failed to get stats:", error);
}
```

### Template Duplication

```typescript
try {
  const newTemplateId = await EmailTemplateService.duplicateTemplate(
    "originalTemplate123",
    "user456"
  );
  console.log("Template duplicated:", newTemplateId);
} catch (error) {
  console.error("Failed to duplicate template:", error);
}
```

### Archive/Restore

```typescript
// Archive instead of delete
try {
  await EmailTemplateService.archiveTemplate("template123");
  console.log("Template archived");
} catch (error) {
  console.error("Failed to archive template:", error);
}

// Restore archived template
try {
  await EmailTemplateService.restoreTemplate("template123");
  console.log("Template restored");
} catch (error) {
  console.error("Failed to restore template:", error);
}
```

## Filtering and Search

### Advanced Filtering

```typescript
const filters: TemplateFilters = {
  type: "reservation",
  status: "active",
  search: "booking",
  createdBy: "user123",
};

const result = await EmailTemplateService.getTemplates({
  filters,
  sortBy: "metadata.createdAt",
  sortOrder: "desc",
  limit: 20,
});
```

### Search Templates

```typescript
const searchResult = await EmailTemplateService.searchTemplates(
  "confirmation email",
  {
    sortBy: "metadata.updatedAt",
    sortOrder: "desc",
    limit: 10,
  }
);
```

## Error Handling

The service provides comprehensive error handling with meaningful error messages:

```typescript
try {
  await EmailTemplateService.createTemplate(templateData, userId);
} catch (error) {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes("validation failed")) {
      // Handle validation errors
      console.error("Template validation failed");
    } else if (error.message.includes("permission denied")) {
      // Handle permission errors
      console.error("Insufficient permissions");
    } else {
      // Handle other errors
      console.error("Unexpected error:", error.message);
    }
  } else {
    console.error("Unknown error occurred");
  }
}
```

## Integration with Components

### TemplateDialog Integration

```typescript
const handleSaveTemplate = async (templateData: CommunicationTemplate) => {
  try {
    setIsLoading(true);

    if (templateData.id) {
      // Update existing template
      await EmailTemplateService.updateTemplate({
        id: templateData.id,
        name: templateData.name,
        subject: templateData.subject,
        content: templateData.content,
        status: templateData.status,
        variables: templateData.variables,
      });
    } else {
      // Create new template
      const newId = await EmailTemplateService.createTemplate(
        {
          type: templateData.type,
          name: templateData.name,
          subject: templateData.subject,
          content: templateData.content,
          variables: templateData.variables,
          status: templateData.status,
        },
        currentUserId
      );

      templateData.id = newId;
    }

    // Refresh templates list
    await refreshTemplates();
  } catch (error) {
    console.error("Failed to save template:", error);
    // Show error message to user
  } finally {
    setIsLoading(false);
  }
};
```

### CommunicationsCenter Integration

```typescript
const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
const [isLoading, setIsLoading] = useState(false);

// Load templates on component mount
useEffect(() => {
  loadTemplates();
}, []);

const loadTemplates = async () => {
  try {
    setIsLoading(true);
    const result = await EmailTemplateService.getTemplates({
      filters: {
        type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchTerm || undefined,
      },
      sortBy: "metadata.updatedAt",
      sortOrder: "desc",
    });
    setTemplates(result.templates);
  } catch (error) {
    console.error("Failed to load templates:", error);
  } finally {
    setIsLoading(false);
  }
};

// Real-time updates
useEffect(() => {
  const unsubscribe = EmailTemplateService.subscribeToTemplates(
    (updatedTemplates) => {
      setTemplates(updatedTemplates);
    },
    {
      filters: {
        type: typeFilter === "all" ? undefined : typeFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      },
      sortBy: "metadata.updatedAt",
      sortOrder: "desc",
    }
  );

  return () => unsubscribe();
}, [typeFilter, statusFilter]);
```

## Performance Considerations

### Pagination

For large template collections, always use pagination:

```typescript
const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
const [lastDoc, setLastDoc] = useState<any>(null);
const [hasMore, setHasMore] = useState(true);

const loadMoreTemplates = async () => {
  if (!hasMore) return;

  const result = await EmailTemplateService.getTemplates({
    limit: 20,
    startAfter: lastDoc,
  });

  setTemplates((prev) => [...prev, ...result.templates]);
  setLastDoc(result.lastDoc);
  setHasMore(result.hasMore);
};
```

### Real-time Subscriptions

Be careful with real-time subscriptions as they can impact performance:

```typescript
// Only subscribe when needed
const [isSubscribed, setIsSubscribed] = useState(false);

useEffect(() => {
  if (isSubscribed) {
    const unsubscribe = EmailTemplateService.subscribeToTemplates(
      setTemplates,
      { limit: 50 } // Limit the number of templates in real-time
    );

    return () => unsubscribe();
  }
}, [isSubscribed]);
```

## Security Rules

Make sure your Firestore security rules allow the necessary operations:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /emailTemplates/{templateId} {
      // Allow read for authenticated users
      allow read: if request.auth != null;

      // Allow create/update/delete for template owners or admins
      allow write: if request.auth != null && (
        request.auth.uid == resource.data.metadata.createdBy ||
        request.auth.token.admin == true
      );
    }
  }
}
```

## Testing

The service includes comprehensive error handling and logging. You can test it with:

```typescript
// Test validation
const invalidTemplate = {
  type: "reservation" as const,
  name: "", // Invalid: empty name
  subject: "Test",
  content: "Test content",
  variables: [],
  status: "draft" as const,
};

const validation = EmailTemplateService.validateTemplate(invalidTemplate);
console.log("Validation result:", validation);
// Should show: { isValid: false, errors: ['Template name is required'], warnings: [] }
```

## Migration from Mock Data

To migrate your existing components from mock data to Firebase:

1. **Replace local state with service calls**
2. **Add error handling for all operations**
3. **Implement loading states**
4. **Add real-time subscriptions where needed**
5. **Update your types to match the Firebase data structure**

## Support

For issues or questions about the email template service, check:

1. Firebase console for any Firestore errors
2. Browser console for detailed error messages
3. Network tab for failed API calls
4. Firestore security rules for permission issues

## Future Enhancements

- [ ] Full-text search with Algolia integration
- [ ] Template versioning and history
- [ ] Template sharing and collaboration
- [ ] Advanced analytics and reporting
- [ ] Template performance metrics
- [ ] A/B testing for templates
- [ ] Template approval workflows
- [ ] Multi-language template support
