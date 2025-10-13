# Edit Booking Modal

A comprehensive modal component for editing booking details with real-time function execution capabilities.

## Features

### 🎨 **Consistent Theme**

- **Crimson Red Primary**: Uses the same `crimson-red` (#EF3340) color as BookingDetailModal
- **Royal Purple Functions**: Function fields highlighted with `royal-purple` (#685BC7) theme
- **Visual Harmony**: Maintains design consistency across all booking modals
- **Brand Alignment**: Follows the established brand color palette

### 📝 **Editable Fields**

- **Form Controls**: Supports various input types (text, number, email, date, select, boolean)
- **Smart Validation**: Required field validation with error display
- **Textarea Support**: Multi-line inputs for descriptions and notes
- **Read-only Fields**: Computed fields are displayed but not directly editable

### ⚡ **Function Execution**

- **Computed Fields**: Automatic calculation of function-based columns
- **Real-time Updates**: Execute functions on-demand with visual feedback
- **Error Handling**: Graceful error display for failed function executions
- **Progress Indicators**: Shows computing status with loading animations

### 🎨 **User Interface**

- **Dual View Modes**: Card view and list view for different preferences
- **Tabbed Organization**: Fields grouped by parentTab for better organization
- **Visual Indicators**: Function fields marked with badges and icons
- **Responsive Design**: Works on desktop and mobile devices

### 💾 **Data Management**

- **Real-time Updates**: Changes are saved to Firestore
- **Optimistic Updates**: UI updates immediately with server confirmation
- **Validation**: Client-side validation before saving
- **Error Recovery**: Graceful handling of save failures

## Usage

### Basic Implementation

```tsx
import EditBookingModal from "./EditBookingModal";

const [isEditModalOpen, setIsEditModalOpen] = useState(false);

<EditBookingModal
  isOpen={isEditModalOpen}
  onClose={() => setIsEditModalOpen(false)}
  booking={selectedBooking}
  onSave={(updatedBooking) => {
    // Handle the updated booking
    handleBookingUpdate(updatedBooking);
    setIsEditModalOpen(false);
  }}
/>;
```

### Integration with BookingDetailModal

The edit button has been added to the BookingDetailModal header with consistent crimson-red theming:

```tsx
<Button
  variant="default"
  size="sm"
  onClick={() => setIsEditModalOpen(true)}
  className="h-8 px-4 bg-crimson-red hover:bg-crimson-red/90 text-white shadow shadow-crimson-red/25"
>
  <FaEdit className="h-4 w-4" />
  <span className="text-xs font-medium">Edit</span>
</Button>
```

## Field Types & Behavior

### Standard Fields

- **String**: Regular text input
- **Number/Currency**: Numeric input with proper validation
- **Email**: Email input with validation
- **Date**: Date picker with calendar interface
- **Boolean**: Toggle switch
- **Select**: Dropdown with predefined options

### Function Fields

- **Display**: Shows computed value in read-only mode
- **Recalculate Button**: Manual trigger for function execution
- **Visual Feedback**: Loading spinner during computation
- **Error Display**: Shows function execution errors

### Special Cases

- **Descriptions/Reasons/Notes**: Automatically use textarea for multi-line input
- **Required Fields**: Marked and validated before saving
- **Read-only Fields**: Non-editable fields are visually distinguished

## Function Execution System

### Automatic Execution

- Functions are executed when their dependencies change
- Uses the existing `functionExecutionService`
- Handles both synchronous and asynchronous functions
- Results are cached to prevent unnecessary re-computations

### Manual Execution

- Each function field has a "Recalculate" button
- Provides immediate feedback on execution status
- Shows execution time and results
- Handles errors gracefully with user-friendly messages

### Dependencies

- Automatically builds arguments from current form data
- Supports column references and literal values
- Handles special cases like document ID references
- Validates required arguments before execution

## Error Handling

### Validation Errors

- Required field validation
- Type-specific validation (email, number, etc.)
- Custom validation rules per field type

### Function Errors

- Network timeout handling
- Function compilation errors
- Runtime execution errors
- User-friendly error messages

### Save Errors

- Network connectivity issues
- Permission errors
- Data validation failures
- Automatic retry mechanisms

## Performance Optimizations

### Caching

- Function results are cached to prevent re-computation
- Form state is optimized to minimize re-renders
- Column metadata is cached for faster lookups

### Lazy Loading

- Function execution is deferred until needed
- Large form sections are rendered on-demand
- Images and heavy content are loaded asynchronously

### Debouncing

- Form input changes are debounced
- Function executions are throttled
- Save operations are batched when possible

## Accessibility Features

### Keyboard Navigation

- Full keyboard support for all form controls
- Logical tab order through form fields
- Keyboard shortcuts for common actions

### Screen Reader Support

- Proper ARIA labels for all form controls
- Status announcements for function executions
- Error message associations with form fields

### Visual Accessibility

- High contrast colors for better visibility
- Loading indicators for async operations
- Clear visual hierarchy and grouping

## Technical Implementation

### State Management

```tsx
const [formData, setFormData] = useState<Partial<Booking>>({});
const [computingFields, setComputingFields] = useState<Set<string>>(new Set());
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
```

### Function Execution

```tsx
const executeFunction = useCallback(
  async (column: SheetColumn, currentFormData: Partial<Booking>) => {
    // Build arguments, execute function, handle results
  },
  [columns, toast]
);
```

### Form Rendering

```tsx
const renderFormField = (column: SheetColumn) => {
  // Dynamic field rendering based on column type
  // Handles all supported field types with proper validation
};
```

## Future Enhancements

### Planned Features

- **Batch Editing**: Edit multiple bookings simultaneously
- **Change History**: Track and display field change history
- **Field Templates**: Save and reuse common field configurations
- **Advanced Validation**: Custom validation rules per field
- **Conditional Fields**: Show/hide fields based on other field values

### Performance Improvements

- **Virtual Scrolling**: For forms with many fields
- **Progressive Loading**: Load field data as needed
- **Background Sync**: Sync changes in the background
- **Offline Support**: Edit bookings when offline

This modal provides a comprehensive solution for editing booking data with full support for computed fields and real-time function execution, making it a powerful tool for managing complex booking workflows.
