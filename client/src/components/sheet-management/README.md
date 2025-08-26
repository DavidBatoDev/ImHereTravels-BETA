# Sheet Management System

This is a Google Sheets-like table management system built with React Table v8 for the ImHereTravels Bookings page.

## Features

- **Customizable Columns**: Add, edit, delete, and reorder columns
- **Multiple Data Types**: Support for string, number, date, boolean, select, function, email, and currency
- **Column Settings**: Configure width, validation, behavior, and appearance
- **Inline Editing**: Click on editable cells to modify data
- **Sorting & Filtering**: Sort by any column and filter data
- **Column Visibility**: Show/hide columns as needed
- **Responsive Design**: Works on desktop and mobile devices

## Components

### BookingsSheet

The main component that renders the sheet with React Table v8 integration.

### ColumnSettingsModal

Modal for editing column properties including:

- Name and data type
- Width constraints
- Validation rules
- Behavior settings (editable, sortable, filterable, etc.)

### AddColumnModal

Modal for creating new columns with all the same configuration options.

## Data Types

- **string**: Plain text input
- **number**: Numeric values with optional min/max validation
- **date**: Date picker with validation
- **boolean**: Yes/No toggle
- **select**: Dropdown with custom options
- **function**: Special actions (like delete buttons)
- **email**: Email input with validation
- **currency**: Monetary values with proper formatting

## Usage

1. **View Data**: The sheet displays all booking data in a table format
2. **Edit Columns**: Click the settings icon (⚙️) on any column header to modify its properties
3. **Add Columns**: Use the "Add Column" button to create new columns
4. **Edit Data**: Click on editable cells to modify values inline
5. **Sort & Filter**: Use the sort arrows and filter options to organize data
6. **Column Management**: Use the Columns dropdown to show/hide specific columns

## Firebase Integration

The system is designed to be Firebase-friendly:

- All documents in the collection will have the same fields
- Column configuration is stored separately from data
- Data structure is flexible and can accommodate new columns
- Real-time updates can be easily implemented

## Future Enhancements

- Drag and drop column reordering
- Advanced filtering and search
- Data export/import functionality
- Column templates and presets
- Real-time collaboration
- Undo/redo functionality
- Bulk operations
- Data validation rules
- Conditional formatting

## Technical Details

- Built with React Table v8 for performance and flexibility
- Uses TypeScript for type safety
- Responsive design with Tailwind CSS
- Modular component architecture
- Custom hooks for state management
- Optimized for large datasets
