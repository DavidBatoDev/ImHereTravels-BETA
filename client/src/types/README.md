# Types Documentation

This folder contains all TypeScript interfaces and types for the ImHereTravels admin portal, organized by domain and following the Firestore database schema.

## 📁 File Structure

```
types/
├── index.ts          # Main types file with all interfaces
├── barrel.ts         # Barrel exports for easier importing
├── bookings.ts       # Booking-related types
├── tours.ts          # Tour package types
├── users.ts          # User and authentication types
├── communications.ts # Email and communication types
├── settings.ts       # System settings types
└── README.md         # This documentation
```

## 🗂️ Type Categories

### Core Collections

- **Bookings** (`bookings.ts`) - Booking management, payments, schedules
- **Tour Packages** (`tours.ts`) - Tour catalog, pricing, itineraries
- **Users** (`users.ts`) - User management, authentication, permissions
- **Communications** (`communications.ts`) - Email templates, sent emails
- **Settings** (`settings.ts`) - System configuration, API keys

### Business Logic Types

- Payment calculations and schedules
- Booking status and workflows
- User roles and permissions
- Email templates and variables

### Form Types

- Form data interfaces for all CRUD operations
- Validation and submission types
- Search and filter parameters

## 📦 Usage

### Import All Types

```typescript
import { Booking, User, TourPackage } from "@/types";
```

### Import Specific Domain Types

```typescript
import { Booking, Payment, BookingFormData } from "@/types/bookings";
import { User, UserRole, AuthUser } from "@/types/users";
```

### Import from Barrel

```typescript
import {
  Booking,
  User,
  TourPackage,
  ApiResponse,
  DashboardStats,
} from "@/types/barrel";
```

## 🔗 Database Schema Mapping

All types are designed to match the Firestore database schema defined in `documentation/proposed-db-schema.md`:

### Collections

- `bookings` → `Booking` interface
- `tourPackages` → `TourPackage` interface
- `users` → `User` interface
- `communications` → `CommunicationTemplate` interface
- `settings` → Various settings interfaces

### Subcollections

- `bookings/{id}/activity` → `BookingActivity` interface
- `tourPackages/{id}/stats` → `TourStatistics` interface
- `communications/{id}/sentEmails` → `SentEmail` interface

## 🎯 Key Features

### Type Safety

- All interfaces include proper TypeScript types
- Union types for status fields (e.g., `BookingStatus`)
- Optional fields marked with `?`
- Timestamp types for Firestore compatibility

### Business Logic

- Payment calculation types
- Booking workflow states
- User permission hierarchies
- Email template variables

### Form Integration

- Form data interfaces for all CRUD operations
- Validation types
- Search and filter parameters

## 🔄 Updates

When updating types:

1. **Add new interfaces** to the appropriate domain file
2. **Update the main index.ts** if needed
3. **Update this README** with new types
4. **Test imports** in components

## 📋 Type Checklist

- [x] Booking types (core, payment, communications)
- [x] Tour package types (pricing, details, media)
- [x] User types (profile, permissions, auth)
- [x] Communication types (templates, emails)
- [x] Settings types (payment, email, security)
- [x] Form data types for all entities
- [x] API response types
- [x] Dashboard and chart types
- [x] Search and filter types

## 🚀 Next Steps

1. **Connect to Firebase** - Replace mock data with real Firestore data
2. **Add Authentication** - Implement Firebase Auth integration
3. **Add Validation** - Create Zod schemas for form validation
4. **Add Real-time Updates** - Implement Firestore listeners
5. **Add Charts** - Integrate chart libraries with typed data
