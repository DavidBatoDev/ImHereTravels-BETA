# TypeScript Functions with Firebase SDK

This directory contains TypeScript functions that have access to the Firebase SDK. Each function can interact with Firestore, Authentication, and Storage services.

**🔐 Pre-Authenticated**: All functions are automatically pre-authenticated with admin credentials (`admin@imheretravels.com`) and will run regardless of the current user's authentication state.

**🎯 DataCamp-Style**: Firebase utilities are automatically injected at runtime - users can use them without seeing import statements or implementation details, similar to DataCamp's learning environment.

## Getting Started

### Creating a New TypeScript Function

1. In the FunctionsCenter UI, create a new folder if needed
2. Click the "New TypeScript File" button
3. The new file will automatically include Firebase SDK imports and a basic template

### Available Firebase Services

All TypeScript functions have access to:

- **Firestore**: Database operations
- **Authentication**: User management
- **Storage**: File operations

## Firebase SDK Access

Firebase utilities are automatically available in all TypeScript functions - no imports needed! The following variables are injected at runtime:

- `firebaseUtils` - Utility functions for common operations
- `db` - Firestore database instance
- `auth` - Firebase Authentication instance
- `storage` - Firebase Storage instance
- `collection`, `doc`, `getDocs`, `addDoc`, `updateDoc`, `deleteDoc` - Firestore functions
- `query`, `where`, `orderBy` - Firestore query functions
- `serverTimestamp` - Firestore timestamp function

**No import statements required** - just use them directly in your functions!

## Utility Functions

The `firebaseUtils` object provides convenient helper functions:

### Authentication

- `firebaseUtils.getCurrentUser()` - Get current authenticated user (admin@imheretravels.com)
- `firebaseUtils.isAuthenticated()` - Check if user is authenticated (always true)
- `firebaseUtils.getUserId()` - Get current user ID (admin user)
- `firebaseUtils.ensureAuthenticated()` - Ensure authentication before operations
- `firebaseUtils.reAuthenticate()` - Force re-authentication with admin credentials

### Firestore Operations

- `firebaseUtils.getDocumentData(collectionName, docId)` - Get a single document
- `firebaseUtils.getCollectionData(collectionName, constraints?)` - Get collection data
- `firebaseUtils.addDocument(collectionName, data)` - Add a new document
- `firebaseUtils.updateDocument(collectionName, docId, data)` - Update a document
- `firebaseUtils.deleteDocument(collectionName, docId)` - Delete a document

### Storage Operations

- `firebaseUtils.createStorageRef(path)` - Create a storage reference

## Example Functions

### User Management

```typescript
export default function userManagement(action, userData, userId) {
  // Functions are pre-authenticated, no need to check auth state
  switch (action) {
    case "create":
      return createUser(userData);
    case "update":
      return updateUser(userId, userData);
    // ... other cases
  }
}
```

### Data Analytics

```typescript
export default function dataAnalytics(operation, options) {
  // Functions are pre-authenticated, no need to check auth state
  switch (operation) {
    case "summary":
      return getDataSummary(options.collectionName);
    case "trends":
      return getTrends(options.collectionName, options.dateRange);
    // ... other operations
  }
}
```

### File Operations

```typescript
export default function fileOperations(operation, options) {
  // Functions are pre-authenticated, no need to check auth state
  switch (operation) {
    case "upload":
      return uploadFile(options.file, options.fileName);
    case "download":
      return downloadFile(options.fileName);
    // ... other operations
  }
}
```

## Best Practices

1. **No authentication checks needed** - Functions are pre-authenticated with admin credentials
2. **Use try-catch blocks** for error handling
3. **Return consistent response objects** with success/error states
4. **Use TypeScript types** for better code quality
5. **Leverage the utility functions** instead of direct Firebase calls when possible

## Error Handling

Always wrap Firebase operations in try-catch blocks:

```typescript
try {
  const result = await firebaseUtils.addDocument("users", userData);
  return { success: true, data: result };
} catch (error) {
  console.error("Error:", error);
  throw new Error("Operation failed");
}
```

## Testing Functions

Use the Test Console in the FunctionsCenter UI to test your functions with different parameters and see the results in real-time.

## Available Collections

The system uses these Firestore collections:

- `ts_folders` - TypeScript function folders
- `ts_files` - TypeScript function files
- `users` - User data (example)
- `analytics` - Analytics data (example)

You can create and use any additional collections as needed for your functions.
