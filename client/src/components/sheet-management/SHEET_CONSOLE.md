# Sheet Console

## Overview

The Sheet Console is a testing and debugging tool integrated into the Sheet Management tab. It provides a way to test function columns with actual row data from your bookings sheet.

## Location

- **Tab**: Sheet Management (`/sheet-management`)
- **Component**: `SheetConsole.tsx`
- **Toggle Button**: Located next to the "Filters" button in the search controls
- **Position**: Slides out from the right side of the screen

## Features

### 1. **Function Column Testing**

- Select any function column from a dropdown
- Select any row to test with
- See argument values preview before execution
- Execute the function with real row data

### 2. **Custom Code Execution**

- Write custom JavaScript/TypeScript code
- Access to:
  - `columns` array (all sheet columns)
  - `data` array (all sheet data)
  - Full Firebase access (`auth`, `db`, `storage`, etc.)
- Perfect for:
  - Analyzing sheet data
  - Bulk operations
  - Testing complex queries

### 3. **Execution Results**

- View execution history
- Success/Error indicators
- Execution time monitoring
- Console log capture
- Download results as JSON

## How to Use

### Testing a Function Column

1. Click the **"Console"** button next to Filters
2. Select a **Function Column** from the dropdown (e.g., "Total Price")
3. Select a **Test Row** from the dropdown (e.g., "Row 5")
4. View **Arguments Preview** to see what values will be passed
5. Click **"Run Function"**
6. View results below

### Example

**Column Configuration:**

- Column: "Total Price" (function type)
- Function: `calculateTotal(unitPrice, quantity)`
- Arguments:
  - `unitPrice` → Column Reference: "Unit Price"
  - `quantity` → Column Reference: "Quantity"

**Test in Console:**

1. Select "Total Price" column
2. Select "Row 5"
3. Arguments Preview shows:
   ```
   unitPrice: 1200
   quantity: 3
   ```
4. Click "Run Function"
5. Result: `3600`

### Custom Code Examples

#### Example 1: Count Function Columns

```javascript
const functionCols = columns.filter((c) => c.dataType === "function");
console.log("Function columns:", functionCols.length);
return functionCols.map((c) => c.columnName);
```

#### Example 2: Analyze Data

```javascript
const totalBookings = data.length;
const completedBookings = data.filter(
  (row) => row.status === "completed"
).length;
console.log(`Total: ${totalBookings}, Completed: ${completedBookings}`);
return { totalBookings, completedBookings };
```

#### Example 3: Query Firebase

```javascript
const snapshot = await getDocs(collection(db, "tours"));
const tours = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
console.log("Tours:", tours.length);
return tours;
```

## UI Layout

```
┌─────────────────────────────────────────┐
│ Sheet Console                    [🔄] [X]│
├─────────────────────────────────────────┤
│ Function Column:                        │
│ ┌─────────────────────────────────────┐ │
│ │ Select function column...        ▼ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Test Row:                               │
│ ┌─────────────────────────────────────┐ │
│ │ Select row...                    ▼ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Arguments Preview:                      │
│ ┌─────────────────────────────────────┐ │
│ │ unitPrice: 1200                     │ │
│ │ quantity: 3                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │        ▶ Run Function               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▼ Custom Code                           │
│ ▼ Results (3)                           │
│   ✓ Success | 12ms | 10:23 AM          │
│   ✗ Error | 5ms | 10:22 AM             │
└─────────────────────────────────────────┘
```

## Integration with Sheet

The Sheet Console complements the sheet's inline retry buttons:

- **Inline Retry** (in cells): Quick recomputation of a single cell
- **Sheet Console**: Comprehensive testing with full visibility into:
  - Argument values
  - Console logs
  - Execution details
  - Multiple test runs

## Differences from Functions Test Console

| Feature              | Functions Console     | Sheet Console            |
| -------------------- | --------------------- | ------------------------ |
| **Location**         | `/functions` page     | `/sheet-management` page |
| **Parameters**       | Manual input          | From actual row data     |
| **Data Source**      | User-entered          | Real booking data        |
| **Row Selection**    | N/A                   | Choose which row to test |
| **Column Selection** | Auto (active file)    | Choose function column   |
| **Purpose**          | Test before deploying | Debug production issues  |

## Benefits

1. **Debug Production Issues**: Test with real data from actual rows
2. **Verify Mappings**: Confirm argument mappings are correct
3. **Compare Results**: See if function output matches expectations
4. **Console Visibility**: View console logs that are hidden in the grid
5. **No Risk**: Testing doesn't modify sheet data
6. **Quick Iteration**: Test changes without navigating to Functions page

## Workflow

```
1. Notice incorrect value in function column
   ↓
2. Open Sheet Console
   ↓
3. Select the function column
   ↓
4. Select the problematic row
   ↓
5. View argument values in preview
   ↓
6. Run function to see execution details
   ↓
7. Check console logs for debugging info
   ↓
8. Fix function or column mappings as needed
```

## Keyboard Shortcuts

- **Open Console**: Click "Console" button (no shortcut yet)
- **Close Console**: Click X button or click backdrop
- **Run Function**: Click "Run Function" button

## Related Files

- **SheetConsole.tsx**: Main console component
- **BookingsDataGrid.tsx**: Parent component with console integration
- **function-execution-service.ts**: Executes functions
- **TestConsole.tsx**: Similar console for Functions page
