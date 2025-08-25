# Conditional Rendering in Email Templates

This system allows you to create dynamic email templates that show different content based on variable values. It's perfect for creating personalized emails that adapt to different booking scenarios, payment terms, and customer types.

## How It Works

The conditional rendering system uses a simple syntax that looks similar to PHP but is processed entirely in JavaScript. This makes it safe and easy to use in email templates.

## Syntax

### Basic Conditional Block

```html
<? if (variable === "value") { ?>
<!-- Content to show when condition is true -->
<p>This will only appear when the condition is met</p>
<? } ?>
```

### Multiple Conditions

```html
<? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
<!-- Content for group bookings -->
<tr>
  <td><strong>Group ID:</strong></td>
  <td>{{groupId}}</td>
</tr>
<? } ?>
```

### Complex Conditions

```html
<? if (availablePaymentTerms !== "Invalid" && availablePaymentTerms !== "Full payment required within 48hrs") { ?>
<!-- Content for valid payment terms -->
<p>Thank you for your booking!</p>
<? } ?>
```

## Variables

Variables are referenced using double curly braces: `{{variableName}}`

### Common Variables in Your Templates

- `{{fullName}}` - Customer's full name
- `{{tourPackage}}` - Name of the tour package
- `{{reservationFee}}` - Deposit amount
- `{{availablePaymentTerms}}` - Payment plan type (P1, P2, P3, P4, Invalid, etc.)
- `{{bookingType}}` - Type of booking (Individual, Duo Booking, Group Booking)
- `{{tourDate}}` - Start date of the tour
- `{{returnDate}}` - End date of the tour
- `{{tourDuration}}` - Length of the tour
- `{{bookingId}}` - Unique booking identifier
- `{{groupId}}` - Group identifier (for group bookings)
- `{{mainBooker}}` - Main booker's name (for group bookings)

## Payment Terms Scenarios

### Invalid Booking

```html
<? if (availablePaymentTerms === "Invalid") { ?>
<!-- Show refund information -->
<h3 style="color: red;">Refund Details for Your Booking</h3>
<p>Unfortunately, we're unable to process your booking...</p>
<? } ?>
```

### P1 Payment Plan

```html
<? if (availablePaymentTerms === "P1") { ?>
<!-- Show P1 payment details -->
<h3>Final Payment Due Soon</h3>
<p>There is only one available payment plan...</p>
<? } ?>
```

### P2 Payment Plan

```html
<? if (availablePaymentTerms === "P2") { ?>
<!-- Show P2 payment options -->
<h3>Choose Your Payment Plan</h3>
<p>You have 2 available payment plans...</p>
<? } ?>
```

### Full Payment Required (48 hours)

```html
<? if (availablePaymentTerms === "Full payment required within 48hrs") { ?>
<!-- Show urgent payment requirement -->
<h3>⚠️ Final Payment Required Within 48 Hours</h3>
<p>Your tour is less than 30 days away...</p>
<? } ?>
```

## Conditional Content Examples

### Show/Hide Based on Booking Type

```html
<!-- Always show basic info -->
<tr>
  <td><strong>Traveler Name:</strong></td>
  <td>{{fullName}}</td>
</tr>

<!-- Only show for group bookings -->
<? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
<tr>
  <td><strong>Main Booker:</strong></td>
  <td>{{mainBooker}}</td>
</tr>
<tr>
  <td><strong>Group ID:</strong></td>
  <td>{{groupId}}</td>
</tr>
<? } ?>
```

### Conditional Payment Information

```html
<? if (availablePaymentTerms !== 'Invalid') { ?>
<!-- Show payment methods for valid bookings -->
<h3>Choose Your Payment Method</h3>
<div class="payment-methods">
  <!-- Payment method details -->
</div>
<? } ?>
```

## Using the Template Editor

### 1. Insert Conditional Blocks

1. Click the "Conditional" button in the editor toolbar
2. Use the helper to insert basic conditional blocks
3. Or click on existing variables to create variable-specific conditionals

### 2. Template Validation

The system automatically validates your template syntax:

- Checks for balanced conditional tags
- Validates variable syntax
- Shows errors and warnings

### 3. Live Preview

See how your template looks with different data scenarios:

- Switch between different payment term scenarios
- View how conditional content appears/disappears
- Test with various booking types

## Best Practices

### 1. Keep Conditions Simple

```html
<!-- Good -->
<? if (availablePaymentTerms === "P1") { ?>

<!-- Avoid complex nested conditions -->
<? if (availablePaymentTerms === "P1" && bookingType !== "Invalid" && reservationFee >
0) { ?>
```

### 2. Use Clear Variable Names

```html
<!-- Good -->
{{fullName}} {{tourPackage}}

<!-- Avoid -->
{{n}} {{tp}}
```

### 3. Test All Scenarios

- Test with each payment term type
- Test with different booking types
- Verify conditional content appears/disappears correctly

### 4. Handle Edge Cases

```html
<!-- Always provide fallback content -->
<? if (availablePaymentTerms === "P1") { ?>
<!-- P1 specific content -->
<? } ?>
<? if (availablePaymentTerms === "P2") { ?>
<!-- P2 specific content -->
<? } ?>
<!-- Default content for other cases -->
<p>Thank you for your booking!</p>
```

## Example Template Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Booking Confirmation</title>
  </head>
  <body>
    <!-- Header (always shown) -->
    <h1>Welcome to ImHereTravels!</h1>

    <!-- Conditional greeting based on payment terms -->
    <? if (availablePaymentTerms === "Invalid") { ?>
    <h2>Refund Information</h2>
    <p>We're sorry, but your booking cannot be processed...</p>
    <? } ?>

    <? if (availablePaymentTerms === "P1") { ?>
    <h2>Payment Plan P1</h2>
    <p>Your final payment is due on {{p1DueDate}}</p>
    <? } ?>

    <!-- Common footer (always shown) -->
    <p>Best regards,<br />The ImHereTravels Team</p>
  </body>
</html>
```

## Troubleshooting

### Common Issues

1. **Conditional tags not working**

   - Check syntax: `<? if (condition) { ?>` and `<? } ?>`
   - Ensure tags are properly closed
   - Verify variable names match exactly

2. **Content not showing**

   - Check your condition logic
   - Verify variable values in your data
   - Use the template validation to check for errors

3. **Template validation errors**
   - Fix mismatched conditional tags
   - Check for empty conditional expressions
   - Ensure proper HTML structure

### Debug Tips

1. Use the template validation feature
2. Test with different data scenarios
3. Check the browser console for errors
4. Use the live preview to see real-time changes

## Security Notes

- The conditional system only processes template logic
- No external code execution
- Variables are safely escaped
- Template validation prevents syntax errors

## Next Steps

1. Start with simple conditional blocks
2. Test with your existing email templates
3. Gradually add more complex logic
4. Use the demo component to experiment
5. Integrate with your email sending system

For more help, refer to the demo component or contact the development team.
