# Booking Sheet Columns Service & Migration

## 🚀 Overview

This document describes the implementation of the hybrid booking system with dynamic columns. The system combines predefined default columns with user-defined custom columns, all managed through a centralized `bookingSheetColumns` collection in Firestore.

## 🏗️ Architecture

### Collections Structure

#### `bookingSheetColumns` Collection

- **Purpose**: Manages column metadata and behavior for the entire booking system
- **Structure**: Each document represents a single column definition
- **Content**: Column metadata, types, order, behavior, and validation rules
- **Default Columns**: 60 predefined columns that cannot be deleted or modified

#### `bookings` Collection

- **Purpose**: Stores actual booking documents
- **Structure**: Each document represents a single booking
- **Fields**: Combination of default columns + dynamic columns
- **Dynamic Nature**: Fields automatically sync with `bookingSheetColumns` collection

## 📊 Default Columns (60 Total)

### Core Booking Fields (1-10)

1. **Booking ID** - Unique identifier (non-editable)
2. **Booking Code** - Editable booking reference
3. **Tour Code** - Tour package identifier
4. **Reservation Date** - When booking was made
5. **Booking Type** - Individual/Group/Corporate
6. **Booking Status** - Confirmed/Pending/Cancelled/Completed
7. **Days Between Booking and Tour** - Calculated field
8. **Group ID** - For group bookings
9. **Is Main Booker?** - Boolean flag
10. **Delete** - Action button

### Traveller Information (11-15)

11. **Traveller Initials**
12. **First Name**
13. **Last Name**
14. **Full Name** (auto-generated)
15. **Email Address**

### Tour Details (16-21)

16. **Tour Package Name Unique Counter**
17. **Tour Package Name**
18. **Formatted Date**
19. **Tour Date**
20. **Return Date**
21. **Tour Duration**

### Pricing (22-24)

22. **Use Discounted Tour Cost?**
23. **Original Tour Cost**
24. **Discounted Tour Cost**

### Email Management - Reservation (25-32)

25. **Reservation Email**
26. **Include BCC (Reservation)**
27. **Generate Email Draft**
28. **Email Draft Link**
29. **Subject Line (Reservation)**
30. **Send Email?**
31. **Sent Email Link**
32. **Reservation Email Sent Date**

### Payment Terms (33-39)

33. **Payment Condition** - Full/Partial/Installment
34. **Eligible 2nd-of-Months**
35. **Available Payment Terms**
36. **Payment Plan** - Monthly/Quarterly/Custom
37. **Payment Method** - Credit Card/Bank Transfer/Cash/PayPal
38. **Enable Payment Reminder**
39. **Payment Progress**

### Payment Details (40-52)

40. **Full Payment**
41. **Full Payment Due Date**
42. **Full Payment Amount**
43. **Full Payment Date Paid**
    44-47. **Payment Terms 1-4** (Due Date, Amount, Date Paid, Reminder, Email Link, Calendar Event)
44. **Reservation Fee**
45. **Paid**
46. **Remaining Balance** (calculated)
47. **Manual Credit**
48. **Credit From**

### Cancellation Management (53-60)

53. **Reason for Cancellation**
54. **Include BCC (Cancellation)**
55. **Generate Cancellation Email Draft**
56. **Cancellation Email Draft Link**
57. **Subject Line (Cancellation)**
58. **Send Cancellation Email?**
59. **Sent Cancellation Email Link**
60. **Cancellation Email Sent Date**

## 🔧 Service Features

### CRUD Operations

- **createColumn()** - Add new custom columns
- **getColumn()** - Retrieve single column definition
- **getAllColumns()** - Get all columns ordered by position
- **updateColumn()** - Modify custom column properties
- **deleteColumn()** - Remove custom columns

### Special Operations

- **getDefaultColumns()** - Get only default columns
- **getCustomColumns()** - Get only user-defined columns
- **reorderColumns()** - Change column display order
- **isDefaultColumn()** - Check if column is protected

### Real-time Listeners

- **subscribeToColumns()** - Listen to all column changes
- **subscribeToColumnChanges()** - Listen to specific column changes

### Data Synchronization

- **syncColumnToAllBookings()** - Add new field to all existing bookings
- **removeColumnFromAllBookings()** - Remove field from all existing bookings

### Validation

- **validateColumn()** - Ensure column data integrity
- **Type Safety** - Enforce valid column types and constraints

## 🚀 Migration System

### Migration 012: Default Booking Sheet Columns

- **ID**: `012-default-booking-sheet-columns`
- **Purpose**: Populate `bookingSheetColumns` collection with all 60 default columns
- **Status**: Ready for execution

### Running the Migration

#### Command Line (Recommended)

```bash
# Run the migration
npm run migrate:012

# Test without changes (dry run)
npm run migrate:dry-run012

# Rollback if needed
npm run migrate:rollback012
```

#### Direct Execution

```bash
# Run the migration
tsx migrations/migrate.ts 012

# Test without changes (dry run)
tsx migrations/migrate.ts dry-run012

# Rollback if needed
tsx migrations/migrate.ts rollback012
```

### Migration Features

- **Dry Run Mode** - Test without making changes
- **Conflict Resolution** - Skip existing columns automatically
- **Batch Operations** - Efficient creation of multiple columns
- **Rollback Support** - Safe undo functionality
- **Error Handling** - Comprehensive error reporting

## 🛡️ Security & Protection

### Default Column Protection

- **Cannot be deleted** - Prevents loss of core functionality
- **Cannot be modified** - Ensures data consistency
- **Always visible** - Maintains system integrity

### Custom Column Flexibility

- **Fully editable** - Users can modify properties
- **Can be deleted** - Remove unused columns
- **Can be hidden** - Control column visibility

## 📈 Benefits

### Flexibility

- **Custom Fields** - Add business-specific columns
- **Scalability** - System grows without code changes
- **Adaptability** - Easy to accommodate new requirements

### Consistency

- **Data Structure** - All bookings maintain consistent fields
- **Validation** - Centralized rules ensure data quality
- **Reporting** - Standardized format for analytics

### Maintainability

- **Single Source of Truth** - Column definitions centralized
- **Auto-sync** - Changes propagate automatically
- **Version Control** - Track column structure changes

## 🔄 Data Flow

### Adding New Columns

1. **Create Column Definition** → Add to `bookingSheetColumns`
2. **Sync to All Bookings** → Add field to existing documents
3. **UI Update** → Refresh booking sheet interface

### Deleting Columns

1. **Remove Column Definition** → Delete from `bookingSheetColumns`
2. **Sync from All Bookings** → Remove field from existing documents
3. **UI Update** → Hide column in interface

### Modifying Columns

1. **Update Column Definition** → Modify in `bookingSheetColumns`
2. **Validation** → Ensure data compliance
3. **UI Update** → Refresh column behavior

## 🚨 Important Notes

### Before Running Migration

- Ensure Firebase is configured with proper credentials
- Check Firestore rules allow write operations
- Backup existing data if needed

### After Running Migration

- Verify columns were created in Firestore console
- Test the booking sheet interface
- Check column behavior and validation

### Rollback Considerations

- **Rollback is destructive** - removes all created columns
- **Use dry run first** to see what will be affected
- **Cannot undo rollback** - data is permanently deleted

## 🔮 Future Enhancements

### Advanced Features

- **Column Templates** - Predefined column sets
- **Conditional Columns** - Show/hide based on criteria
- **Column Dependencies** - Link related columns
- **Column History** - Track definition changes

### Integration

- **API Endpoints** - RESTful column management
- **Webhook Support** - Notify external systems
- **Export/Import** - Bulk configuration management
- **Multi-tenant Support** - Different column sets per organization

## 📞 Support

If you encounter issues:

1. **Check console logs** for detailed error messages
2. **Verify Firebase configuration** is correct
3. **Ensure Firestore rules** allow the operations
4. **Use dry run mode** to debug issues
5. **Check the migration script** for syntax errors

## 🎯 Success Indicators

Your migration was successful if:

- ✅ Console shows "Migration SUCCESS"
- ✅ All 60 columns appear in Firestore `bookingSheetColumns` collection
- ✅ Column IDs match the default column definitions
- ✅ Column metadata (types, widths, options) are correct
- ✅ No errors in the results

---

**Happy Column Managing! 🚀**
