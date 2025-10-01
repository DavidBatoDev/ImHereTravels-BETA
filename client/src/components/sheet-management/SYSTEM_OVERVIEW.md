# Sheet Management System Overview

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How Functions Work](#how-functions-work)
3. [Key Components](#key-components)
4. [Data Flow](#data-flow)
5. [Function Execution Pipeline](#function-execution-pipeline)
6. [Dependency Management](#dependency-management)

---

## Architecture Overview

The Sheet Management system is a Google Sheets-like interface built for managing booking data with powerful TypeScript function capabilities. It consists of:

### Core Components

- **BookingsDataGrid.tsx** - Main data grid component using `react-data-grid`
- **BookingsSheetWrapper.tsx** - Wrapper component that manages state
- **ColumnSettingsModal.tsx** - UI for configuring column properties including function bindings

### Core Services

- **function-execution-service.ts** - Executes TypeScript functions in the browser
- **typescript-functions-service.ts** - Manages function CRUD operations in Firestore
- **function-dependency-service.ts** - Tracks function dependencies (not currently used for column dependencies)
- **booking-sheet-columns-service.ts** - Manages column configuration
- **batched-writer.ts** - Batches multiple cell updates for efficient Firestore writes

### Core Hooks

- **use-sheet-management.ts** - Central hook that manages columns and data with real-time subscriptions

---

## How Functions Work

### 1. **Function Storage**

TypeScript functions are stored in Firestore in the `ts_files` collection with the following key fields:

```typescript
{
  id: string,
  name: string,                    // Display name
  functionName: string,            // Actual function name in code
  content: string,                 // TypeScript code
  arguments: FunctionArgument[],   // Parsed function parameters
  functionDependencies: string[],  // Names of other functions this calls
  isActive: boolean,
  exportType: "function",          // Must be "function"
  // ... metadata fields
}
```

### 2. **Function Parsing**

When a TypeScript function is saved, the AST Parser (`ast-parser.ts`) automatically:

- Extracts the function signature
- Identifies parameters with types
- Detects async/await patterns
- Finds dependencies (other functions called within)
- Determines complexity

### 3. **Binding Functions to Columns**

In the Column Settings Modal, you can:

1. Select a column's data type as "function"
2. Choose a TypeScript function from the available functions dropdown
3. Map the function's parameters to:
   - **Column References**: Values from other columns in the same row
   - **Static Values**: Hardcoded values
   - **Array of Column References**: Multiple column values as an array parameter

Example mapping:

```typescript
// Function signature: calculateTotal(price: number, quantity: number, tax: number)
// Column mappings:
// - price → references "Unit Price" column
// - quantity → references "Quantity" column
// - tax → static value: 0.13
```

### 4. **Function Execution**

When a function column is displayed in the grid:

#### Step 1: Argument Building

The `functionExecutionService.buildArgs()` method:

- Reads the column's argument mappings
- Pulls values from the current row based on column references
- Applies type coercion (string→number, etc.)
- Returns an array of argument values

#### Step 2: Function Compilation

The `functionExecutionService.getCompiledFunction()` method:

- Fetches the TypeScript code from Firestore (cached after first fetch)
- Transpiles TypeScript → JavaScript using the TypeScript compiler
- Creates a sandboxed function with Firebase utilities injected
- Caches the compiled function for reuse

#### Step 3: Execution

The `functionExecutionService.executeFunction()` method:

- Checks result cache first (30-second TTL)
- Executes the compiled function with the built arguments
- Handles async functions with a 10-second timeout
- Returns result with success/error status and execution time

#### Step 4: Display

The result is:

- Stored in the row data under the column's ID
- Rendered in the cell (supports HTML via `dangerouslySetInnerHTML`)
- Saved to Firestore via the batched writer

---

## Key Components

### BookingsDataGrid Component

**Purpose**: Main spreadsheet interface with real-time function computation

**Key Features**:

- React Data Grid for high performance with large datasets
- Real-time subscriptions to columns and booking data
- Smart caching to prevent unnecessary function recomputation
- Dependency tracking: when a cell changes, only affected function columns recompute

**State Management**:

```typescript
const [localData, setLocalData] = useState<SheetData[]>([]); // Synced from Firestore
const functionArgsCacheRef = useRef<Map<string, any[]>>(new Map()); // Argument cache
const isInitialLoadRef = useRef<boolean>(true); // Skip computation on load
```

**Function Computation Flow**:

```typescript
computeFunctionForRow(row, funcCol) {
  1. Build arguments from row data
  2. Check if arguments changed (skip if same)
  3. Check for undefined arguments (skip if missing data)
  4. Execute function via functionExecutionService
  5. Queue batch write to Firestore
  6. Firebase listener updates UI when confirmed
}
```

### Dependency Graph (Column-Level)

The `BookingsDataGrid` builds a dependency graph at the **column level**:

```typescript
// Maps: source column ID → array of function columns that depend on it
const dependencyGraph = useMemo(() => {
  const map = new Map<string, SheetColumn[]>();

  columns.forEach((funcColumn) => {
    if (funcColumn.dataType === "function") {
      funcColumn.arguments.forEach((arg) => {
        if (arg.columnReference) {
          // This function column depends on the referenced column
          const referencedColumn = findColumnByName(arg.columnReference);
          map.set(referencedColumn.id, [...existing, funcColumn]);
        }
      });
    }
  });

  return map;
}, [columns]);
```

**Example**:

- Column "Unit Price" (ID: `col_123`)
- Column "Total Price" (ID: `col_456`) is a function that references "Unit Price"
- Dependency Graph: `{ "col_123": [col_456] }`

When "Unit Price" changes in a row, only "Total Price" is recomputed for that row.

### Real-Time Updates

**Column Changes** (via `use-sheet-management.ts`):

```typescript
useEffect(() => {
  const unsubscribe = bookingSheetColumnService.subscribeToColumns(
    (columns) => {
      setColumns(columns);
    }
  );
  return () => unsubscribe();
}, []);
```

**Data Changes** (via `use-sheet-management.ts`):

```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(collection(db, "bookings")),
    (snapshot) => {
      setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }
  );
  return () => unsubscribe();
}, []);
```

**Function Definition Changes** (via `BookingsDataGrid`):

```typescript
useEffect(() => {
  // Subscribe to each function used by current columns
  columns
    .filter((c) => c.dataType === "function")
    .forEach((col) => {
      typescriptFunctionsService.subscribeToFunctionChanges(
        col.function,
        (updated) => {
          // Invalidate cached compiled function
          functionExecutionService.invalidate(col.function);
          // Recompute all rows for this function column
          recomputeForFunction(col.function);
        }
      );
    });
}, [columns]);
```

---

## Data Flow

### Initial Load

```
1. use-sheet-management hook initializes
   ↓
2. Real-time subscription to booking_sheet_columns collection
   ↓
3. Real-time subscription to bookings collection
   ↓
4. BookingsDataGrid receives columns and data props
   ↓
5. Builds dependency graph from column configurations
   ↓
6. Renders grid (function columns show existing values, no computation on initial load)
```

### User Edits a Cell

```
1. User changes value in cell (e.g., "Quantity")
   ↓
2. Save to Firestore via bookingService.updateBookingField()
   ↓
3. Firebase listener detects change
   ↓
4. UI updates with new data from Firestore
   ↓
5. recomputeDirectDependentsForRow() is called
   ↓
6. Dependency graph identifies affected function columns
   ↓
7. computeFunctionForRow() executes for each dependent column
   ↓
8. Function results batched and written to Firestore
   ↓
9. Firebase listener detects function result changes
   ↓
10. UI reflects all changes from Firestore
```

### User Changes Function Definition

```
1. User edits function code in Functions Management tab
   ↓
2. AST parser analyzes new code
   ↓
3. Function saved to ts_files collection
   ↓
4. Real-time subscription in BookingsDataGrid detects change
   ↓
5. functionExecutionService.invalidate() clears cached compilation
   ↓
6. recomputeForFunction() triggered for all rows
   ↓
7. Function re-executed with fresh compilation for every row
   ↓
8. All affected cells update
```

---

## Function Execution Pipeline

### Detailed Execution Flow

```typescript
// 1. TRIGGER: Cell edit or function definition change
handleCellChange(rowId, columnId, newValue);

// 2. IDENTIFY DEPENDENTS
const dependents = dependencyGraph.get(columnId) || [];
// Returns array of function columns that reference this column

// 3. FOR EACH DEPENDENT COLUMN
dependents.forEach(async (funcCol) => {
  // 4. BUILD ARGUMENTS
  const args = functionExecutionService.buildArgs(funcCol, row, allColumns);
  // Example: [1200, 5, 0.13] for calculateTotal(price, quantity, tax)

  // 5. CHECK CACHE
  const cacheKey = `${rowId}:${funcCol.id}:${funcCol.function}`;
  if (argumentsCacheMatch(cacheKey, args)) {
    return; // Skip computation, arguments haven't changed
  }

  // 6. UPDATE ARGUMENT CACHE
  functionArgsCacheRef.current.set(cacheKey, args);

  // 7. EXECUTE FUNCTION
  const result = await functionExecutionService.executeFunction(
    funcCol.function, // Function ID
    args, // [1200, 5, 0.13]
    10000 // 10 second timeout
  );

  // 8. QUEUE FIRESTORE UPDATE (BATCHED)
  batchedWriter.queueFieldUpdate(rowId, funcCol.id, result);
  // Note: Firebase listener will update UI when confirmed
});
```

### Function Compilation (Inside `getCompiledFunction`)

```typescript
// 1. Fetch TypeScript code from Firestore
const tsFile = await typescriptFunctionService.files.getById(fileId);

// 2. Transpile TypeScript → JavaScript
const transpiled = ts.transpileModule(tsFile.content, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2018,
  }
}).outputText;

// 3. Create sandboxed execution context with Firebase utilities
const factory = new Function(
  "exports", "moduleRef",
  "auth", "db", "storage", "collection", "doc", /* ... more Firebase utils */,
  `${transpiled}; return moduleRef.exports?.default ?? exports?.default;`
);

// 4. Execute factory to get compiled function
const compiled = factory(
  moduleObj.exports,
  moduleObj,
  auth, db, storage, collection, doc, /* ... actual Firebase instances */
);

// 5. Cache and return
this.cache.set(fileId, compiled);
return compiled;
```

### Caching Strategy

**Three levels of caching**:

1. **Compiled Function Cache** (in `FunctionExecutionService`)

   - Key: `fileId`
   - Duration: Until function definition changes
   - Purpose: Avoid re-transpiling TypeScript

2. **Result Cache** (in `FunctionExecutionService`)

   - Key: `${fileId}:${JSON.stringify(args)}`
   - Duration: 30 seconds
   - Purpose: Avoid re-executing with same arguments

3. **Argument Cache** (in `BookingsDataGrid`)
   - Key: `${rowId}:${columnId}:${functionId}`
   - Duration: Until argument values change
   - Purpose: Skip execution if arguments haven't changed

---

## Dependency Management

### Column Dependency Tracking

The system tracks **column-level dependencies** (which function columns depend on which data columns):

```typescript
// Example Column Configuration:
Column A: "Unit Price" (type: currency)
Column B: "Quantity" (type: number)
Column C: "Subtotal" (type: function)
  - Function: calculateTotal(price, quantity)
  - Arguments:
    - price → Column Reference: "Unit Price"
    - quantity → Column Reference: "Quantity"
Column D: "Tax" (type: function)
  - Function: calculateTax(subtotal)
  - Arguments:
    - subtotal → Column Reference: "Subtotal"

// Dependency Graph:
{
  "columnA_id": [Column C],  // Unit Price → Subtotal
  "columnB_id": [Column C],  // Quantity → Subtotal
  "columnC_id": [Column D],  // Subtotal → Tax
}
```

**Cascading Updates**:
When "Unit Price" changes:

1. "Subtotal" recomputes (direct dependent)
2. "Subtotal" value changes triggers data change listener
3. "Tax" recomputes (dependent of "Subtotal")

### Function Dependency Tracking

The `function-dependency-service.ts` tracks **function-level dependencies** (which functions call other functions):

```typescript
// Example:
Function: calculateTotalWithDiscount(price, quantity, discountPercent)
  - Calls: calculateSubtotal(price, quantity)
  - Calls: applyDiscount(subtotal, discountPercent)

// Function Dependencies:
{
  "calculateTotalWithDiscount_id": {
    dependencies: ["calculateSubtotal", "applyDiscount"],
    dependents: []
  }
}
```

**Note**: This function-level dependency tracking is built but **not currently used** for column recomputation. Column dependencies are determined by argument mappings only.

---

## Performance Optimizations

### 1. **Skip Initial Load Computation**

```typescript
const isInitialLoadRef = useRef<boolean>(true);

// On initial load, display existing function values without recomputing
if (isInitialLoadRef.current && !skipInitialCheck) {
  return row[funcCol.id];
}
```

### 2. **Argument-Based Caching**

```typescript
// Only recompute if arguments have changed
const argsChanged = !cachedArgs || !isEqual(cachedArgs, args);
if (!argsChanged) {
  return row[funcCol.id]; // Return existing value
}
```

### 3. **Batched Firestore Writes**

```typescript
// Queue multiple updates and write in batches
batchedWriter.queueFieldUpdate(rowId, fieldId, value);
// Automatically flushes after 500ms of inactivity or 50 queued updates
```

### 4. **Parallel Computation**

```typescript
// Compute all dependent function columns in parallel
await Promise.all(
  dependents.map((funcCol) => computeFunctionForRow(rowSnapshot, funcCol, true))
);
```

### 5. **Single Source of Truth (Firestore)**

```typescript
// Save to Firestore - Firebase listener will update the UI
await bookingService.updateBookingField(rowId, columnId, newValue);
// No local state updates - Firestore is the only source of truth
```

---

## Common Use Cases

### 1. **Computed Field Based on Other Fields**

```typescript
// Function: calculateTotal
export default function calculateTotal(
  unitPrice: number,
  quantity: number
): number {
  return unitPrice * quantity;
}

// Column Configuration:
// Type: function
// Function: calculateTotal
// Arguments:
//   - unitPrice → Column Reference: "Unit Price"
//   - quantity → Column Reference: "Quantity"
```

### 2. **Conditional Formatting**

```typescript
// Function: formatStatus
export default function formatStatus(isPaid: boolean, dueDate: Date): string {
  if (isPaid) {
    return '<span class="text-green-600">✓ Paid</span>';
  }
  const now = new Date();
  if (now > dueDate) {
    return '<span class="text-red-600">⚠ Overdue</span>';
  }
  return '<span class="text-yellow-600">⏳ Pending</span>';
}

// Column Configuration:
// Type: function
// Function: formatStatus
// Arguments:
//   - isPaid → Column Reference: "Paid"
//   - dueDate → Column Reference: "Due Date"
```

### 3. **Firebase Integration**

```typescript
// Function: fetchTourDetails
import { doc, getDoc } from "firebase/firestore";

export default async function fetchTourDetails(
  db: any,
  tourId: string
): Promise<string> {
  const tourDoc = await getDoc(doc(db, "tours", tourId));
  if (tourDoc.exists()) {
    return tourDoc.data().name;
  }
  return "Tour not found";
}

// Column Configuration:
// Type: function
// Function: fetchTourDetails
// Arguments:
//   - db → Injected automatically (Firebase db instance)
//   - tourId → Column Reference: "Tour ID"
```

---

## Troubleshooting

### Function Not Executing

**Check**:

1. Function `isActive` is `true`
2. Function has `exportType: "function"`
3. Function has a valid `functionName`
4. Column mapping includes all required arguments
5. Referenced columns exist with correct names

### Function Executing Too Often

**Check**:

1. Argument cache is working (check console logs)
2. Result cache TTL (currently 30 seconds)
3. Dependencies might be creating a cascade effect

### Function Errors

**Check**:

1. Console for execution errors
2. Function timeout (10 seconds max)
3. Firebase utilities are properly imported in function code
4. Type coercion for arguments (string vs number, etc.)

---

## Related Files

- **Components**: `client/src/components/sheet-management/`
- **Services**: `client/src/services/`
- **Types**: `client/src/types/sheet-management.ts`
- **Hooks**: `client/src/hooks/use-sheet-management.ts`
- **Default Columns**: `client/src/lib/default-booking-columns.ts`
- **Migrations**: `client/migrations/`

---

## Future Enhancements

1. **Transitive Column Dependencies**: Automatically recompute cascading function columns in a single pass
2. **Function Hot Reload**: Recompile without full page refresh
3. **Function Testing UI**: Test functions with sample data before deploying
4. **Circular Dependency Detection**: Warn users about circular column references
5. **Performance Profiling**: Show function execution times in UI
6. **Incremental Computation**: Only recompute rows visible in viewport
7. **Function Versioning**: Track function changes and allow rollback
