# Test Console Overview

## Location

- **Page Route**: `/functions`
- **Component**: `TestConsole.tsx` (client/src/components/functions/TestConsole.tsx)
- **Parent**: `FunctionsCenter.tsx` - The main Functions Management page

## Purpose

The Test Console is a **live testing environment** for TypeScript functions. It allows you to:

- Test functions with custom parameters
- Execute custom code snippets with Firebase access
- View execution results and console logs
- Debug function behavior before deploying to the sheet

## Architecture

```
/functions page
  └─ FunctionsCenter (main container)
      ├─ Left Sidebar (Folders & Files tree)
      ├─ Center Panel (Monaco Code Editor)
      └─ Right Slide-out (Test Console) ← slides in from right
```

## Key Features

### 1. **Function Parameter Testing**

- Automatically detects function parameters from the AST parser
- Generates input fields for each parameter with:
  - Parameter name
  - Type information (e.g., `string`, `number`, `Date`)
  - Optional badge if parameter is optional
  - Default value hints
- Smart type parsing:
  - Strings: Removes surrounding quotes
  - Numbers: Parses to numeric values
  - Booleans: `"true"` → `true`
  - Arrays: JSON parse or comma-separated values
  - Objects: JSON parse

### 2. **Custom Code Execution**

- Execute arbitrary JavaScript/TypeScript code
- Full access to Firebase utilities:
  - `auth`, `db`, `storage`
  - `collection`, `doc`, `getDocs`, `addDoc`, etc.
  - `httpsCallable`, `functions`
- Useful for:
  - Quick database queries
  - Testing Firebase operations
  - Prototyping logic before writing a full function

### 3. **Console Log Capture**

- Intercepts `console.log()`, `console.error()`, `console.warn()`
- Displays logs in the test results
- Color-coded by type:
  - `[LOG]` - Blue background
  - `[ERROR]` - Red background
  - `[WARN]` - Yellow background

### 4. **Execution Results**

- Shows execution history (newest first)
- For each execution:
  - ✓/✗ Success/Error indicator
  - Execution time in milliseconds
  - Timestamp
  - Full result or error message
  - Console logs
  - Download as JSON button

### 5. **Cache Management**

- **Clear Cache** button: Invalidates compiled function cache
- Forces next execution to use latest code
- Useful after editing function code

## How It Works

### Function Execution Flow

```typescript
1. User clicks "Run" button
   ↓
2. Parse parameter inputs
   - Convert strings to appropriate types
   - Handle optional parameters
   ↓
3. Clear function cache (invalidate)
   ↓
4. Get compiled function
   - Fetches TypeScript code from Firestore
   - Transpiles TypeScript → JavaScript
   - Creates sandboxed function with Firebase utilities
   ↓
5. Execute function with parameters
   - Capture console logs during execution
   - Handle async functions (await if needed)
   - Measure execution time
   ↓
6. Display results
   - Show return value or error
   - Show console logs
   - Show execution time
```

### Custom Code Execution Flow

```typescript
1. User types code in textarea
   ↓
2. User clicks "Run" (in Custom Code section)
   ↓
3. Import Firebase utilities dynamically
   ↓
4. Create sandbox with:
   - Firebase auth, db, storage
   - Firestore functions (collection, doc, etc.)
   - Firebase Functions (httpsCallable)
   ↓
5. Execute code in sandbox
   - Capture console logs
   - Measure execution time
   ↓
6. Display results
```

## UI Components

### Header

- Title: "Test" + Active file name badge
- Clear Cache button (🔄)
- Clear Results button (🔄)

### Collapsible Sections

#### 1. **Params** (if function has parameters)

- Shows parameter count badge
- Each parameter has:
  - Label with name, optional badge, and type
  - Input field with placeholder
- "Run" button to execute with current parameters

#### 2. **Function** (if function has no parameters)

- Shows "No params" badge
- "Run Function" button

#### 3. **Code** (Custom Code)

- Textarea for custom JavaScript/TypeScript
- "Run" button (disabled if empty)
- Full Firebase access

#### 4. **Results** (if any executions)

- Shows results count badge
- Each result displays:
  - Success/Error indicator
  - Execution time
  - Timestamp
  - Result content (formatted JSON)
  - Console logs (if any)
  - Download button

## Example Use Cases

### Use Case 1: Testing a Simple Function

**Function:**

```typescript
export default function calculateTotal(
  price: number,
  quantity: number
): number {
  return price * quantity;
}
```

**Test Console:**

1. Enter `100` for `price`
2. Enter `5` for `quantity`
3. Click "Run"
4. Result: `500`

### Use Case 2: Testing with Firebase Data

**Function:**

```typescript
export default async function getTourName(tourId: string): Promise<string> {
  const tourDoc = await getDoc(doc(db, "tours", tourId));
  return tourDoc.exists() ? tourDoc.data().name : "Tour not found";
}
```

**Test Console:**

1. Enter `"tour_123"` for `tourId`
2. Click "Run"
3. Result: `"Siargao Island Adventure"` (or whatever the tour name is)

### Use Case 3: Custom Code Query

**Custom Code:**

```javascript
const bookingsRef = collection(db, "bookings");
const q = query(bookingsRef, where("status", "==", "confirmed"));
const snapshot = await getDocs(q);
console.log(`Found ${snapshot.size} confirmed bookings`);
return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
```

**Test Console:**

1. Paste code in "Code" section
2. Click "Run"
3. Results show array of confirmed bookings
4. Console shows: `[LOG] Found 15 confirmed bookings`

### Use Case 4: Testing Error Handling

**Function:**

```typescript
export default function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Cannot divide by zero");
  return a / b;
}
```

**Test Console:**

1. Enter `10` for `a`
2. Enter `0` for `b`
3. Click "Run"
4. Result: ✗ Error: "Cannot divide by zero"

## Integration with Sheet Management

Functions tested in the Test Console can be **bound to sheet columns**:

1. **Test function** in Test Console with sample data
2. **Verify it works** correctly
3. Go to **Sheet Management** → Column Settings
4. Set column type to "function"
5. Select the tested function
6. Map parameters to column references
7. Function now executes automatically for each row

## Firebase Access

The Test Console has **full Firebase access** including:

### Authentication

```typescript
auth.currentUser; // Get current user
```

### Firestore

```typescript
// Collections and documents
collection(db, "bookings");
doc(db, "bookings", "123");

// Queries
query(collection(db, "bookings"), where("status", "==", "confirmed"));
getDocs(query);
getDoc(docRef);

// CRUD operations
addDoc(collectionRef, data);
updateDoc(docRef, updates);
deleteDoc(docRef);

// Advanced
serverTimestamp();
increment(5);
arrayUnion("item");
```

### Storage

```typescript
storage;
ref(storage, "path/to/file");
```

### Firebase Functions

```typescript
httpsCallable(functions, "functionName");
```

## Performance Monitoring

Each execution shows:

- **Execution Time**: How long the function took (in ms)
- **Character Count**: Size of result or error message
- **Timestamp**: When the execution occurred

Example:

```
✓ Success | 47ms | 10:23 AM
```

## Best Practices

### 1. **Test Before Deploying**

Always test functions in the Test Console before binding them to sheet columns to avoid runtime errors on every row.

### 2. **Use Console Logs**

Add `console.log()` statements to debug function behavior:

```typescript
export default function myFunction(input: string) {
  console.log("Input:", input);
  const result = input.toUpperCase();
  console.log("Result:", result);
  return result;
}
```

### 3. **Test Edge Cases**

- Empty strings: `""`
- Zero/negative numbers: `0`, `-5`
- Undefined/null values
- Large datasets

### 4. **Clear Cache After Edits**

After modifying function code in the editor, click **Clear Cache** to ensure the Test Console uses the latest version.

### 5. **Download Results**

For complex objects or large results, use the **Download** button to save as JSON for analysis.

### 6. **Custom Code for Quick Queries**

Use Custom Code section for:

- Quick database queries
- One-off operations
- Prototyping before writing a full function

## State Management

### State Preservation

- **Parameter values** persist while editing the same file
- **Test results** persist across file changes
- **Custom code** stays in textarea

### State Reset

- Parameter values reset when switching to a different file (first time only)
- Can manually clear results with "Clear Results" button

## Error Handling

The Test Console catches and displays:

- **Syntax errors**: Invalid JavaScript/TypeScript
- **Runtime errors**: Thrown exceptions during execution
- **Type errors**: Incorrect parameter types
- **Firebase errors**: Permission denied, not found, etc.

Errors show:

- Red background
- Error message
- Execution time
- Console logs leading up to the error

## Limitations

1. **Client-side execution only**: Functions run in the browser, not on Firebase servers
2. **10-second timeout**: Long-running functions will timeout
3. **No server-side APIs**: Can't access Node.js-specific APIs
4. **Security rules apply**: Must have Firebase permissions for operations

## Related Files

- **TestConsole.tsx**: Main test console component
- **FunctionsCenter.tsx**: Parent container with Monaco editor
- **function-execution-service.ts**: Service that compiles and executes functions
- **firebase-utils.ts**: Firebase utilities injected into functions
- **types/functions.ts**: TypeScript types for functions and arguments

## Comparison with Sheet Execution

| Feature        | Test Console        | Sheet Execution          |
| -------------- | ------------------- | ------------------------ |
| **Trigger**    | Manual button click | Automatic on data change |
| **Parameters** | Manual input        | Column values            |
| **Results**    | Display in console  | Written to cell          |
| **Errors**     | Show in console     | Silent (logged)          |
| **Cache**      | Can clear manually  | Auto-managed             |
| **Purpose**    | Testing & debugging | Production execution     |

## Future Enhancements

Potential improvements (not yet implemented):

- Syntax highlighting in custom code textarea
- Parameter presets/templates
- Export/import test cases
- Automated testing suites
- Performance benchmarking
- Result comparison (diff between runs)
- Breakpoint debugging
- Step-through execution
