# Column Logger Utility

This utility provides comprehensive logging capabilities for the booking sheet columns, including their order, properties, and changes.

## Features

- **Detailed Column Logging**: Log all column properties including order, data type, width, form inclusion, etc.
- **Compact Logging**: Quick reference format with icons and minimal information
- **Order Change Tracking**: Detect and log when columns are reordered
- **Data Export**: Export column information to structured JSON format
- **React Hooks**: Easy integration with React components

## Files

- `column-logger.ts` - Main utility class with logging methods
- `use-column-logger.ts` - React hooks for automatic logging
- `log-columns.ts` - Standalone script for command-line logging

## Usage

### 1. Command Line Logging

Run the standalone script to log all default columns:

```bash
npm run log-columns
```

This will:

- Log all 60 default booking columns with their order
- Show detailed information for each column
- Export the data as JSON
- Display summary by data type

### 2. React Hook Integration

#### Automatic Logging on Column Changes

```typescript
import { useColumnLogger } from "@/hooks/use-column-logger";

function MyComponent() {
  const { columns } = useSheetManagement();

  // Log columns when they change (compact format)
  useColumnLogger(columns, {
    logOnChange: true,
    compact: true,
    logOrderChanges: true,
    prefix: "📊 MyComponent",
  });

  return <div>...</div>;
}
```

#### One-time Logging

```typescript
import { useColumnLoggerOnce } from "@/hooks/use-column-logger";

function MyComponent() {
  const { columns } = useSheetManagement();

  // Log columns only once when first loaded
  useColumnLoggerOnce(columns, {
    compact: false,
    prefix: "📊 Initial Load",
  });

  return <div>...</div>;
}
```

### 3. Direct Utility Usage

```typescript
import { ColumnLogger } from "@/utils/column-logger";

// Detailed logging
ColumnLogger.logColumns(columns);

// Compact logging
ColumnLogger.logColumnsCompact(columns);

// Export to structured data
const exportedData = ColumnLogger.exportColumns(columns);

// Log order changes
ColumnLogger.logColumnOrderChange(oldColumns, newColumns);
```

## Hook Options

### useColumnLogger Options

| Option            | Type    | Default | Description                        |
| ----------------- | ------- | ------- | ---------------------------------- |
| `logOnChange`     | boolean | `true`  | Whether to log when columns change |
| `compact`         | boolean | `false` | Use compact logging format         |
| `logOrderChanges` | boolean | `false` | Log when column order changes      |
| `prefix`          | string  | `"📊"`  | Custom log prefix                  |

### useColumnLoggerOnce Options

| Option    | Type    | Default | Description                |
| --------- | ------- | ------- | -------------------------- |
| `compact` | boolean | `false` | Use compact logging format |
| `prefix`  | string  | `"📊"`  | Custom log prefix          |

## Log Output Examples

### Detailed Logging

```
📊 BOOKING SHEET COLUMNS LOG
==================================================
Total Columns: 60

1. Booking ID
   ID: col-1
   Order: 1
   Data Type: string
   Width: 120px
   Include in Forms: Yes

2. Booking Code
   ID: col-2
   Order: 2
   Data Type: string
   Width: 120px
   Include in Forms: Yes
...
```

### Compact Logging

```
📋 COLUMNS QUICK REFERENCE
========================================
 1. 📝 📝 Booking ID (string)
 2. 📝 📝 Booking Code (string)
 3. 📝 📝 Tour Code (string)
 4. 📝 📅 Reservation Date (date)
 5. 📝 📋 Booking Type (select)
...
```

### Order Change Logging

```
🔄 COLUMN ORDER CHANGE
==============================
Before: Booking ID → Booking Code → Tour Code → ...
After:  Tour Code → Booking ID → Booking Code → ...
Moved columns: Tour Code
```

## Data Types and Icons

| Data Type | Icon | Description       |
| --------- | ---- | ----------------- |
| string    | 📝   | Text data         |
| number    | 🔢   | Numeric data      |
| currency  | 💰   | Monetary values   |
| date      | 📅   | Date values       |
| boolean   | ✅   | True/false values |
| select    | 📋   | Dropdown options  |
| function  | ⚙️   | Computed columns  |
| email     | 📧   | Email addresses   |

## Integration with BookingsSheet

The `BookingsSheet` component automatically uses the column logger with these settings:

```typescript
useColumnLogger(columns, {
  logOnChange: true,
  compact: true,
  logOrderChanges: true,
  prefix: "📊 BookingsSheet",
});
```

This provides real-time logging of column changes during development and debugging.

## Performance Considerations

- **Compact logging** is recommended for frequent updates to avoid console spam
- **Order change logging** only logs when columns are actually reordered
- **One-time logging** is best for initial load scenarios
- The hooks use `useRef` to prevent unnecessary re-renders

## Troubleshooting

### Columns not logging

- Ensure columns array is not empty
- Check that the hook is properly imported and used
- Verify the component is mounted and columns are loaded

### Too much logging

- Use `compact: true` for less verbose output
- Set `logOnChange: false` to disable automatic logging
- Use `useColumnLoggerOnce` for one-time logging only

### Missing column information

- Check that columns have proper `id` and `order` properties
- Ensure columns are sorted by order before logging
- Verify column data structure matches `SheetColumn` interface
