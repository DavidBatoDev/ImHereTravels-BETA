
# ImHereTravels BETA

> Modern travel management platform for tour operators, agencies, and travelers.

## Overview

ImHereTravels is a comprehensive travel management web application designed to streamline booking, tour package management, payment tracking, and communication for travel businesses and their clients. Built with Next.js, Firebase, and modern UI technologies, it offers robust features for both administrators and end-users.

## Key Features

- **Tour Package Management**: Create, update, and organize tour packages with detailed itineraries, pricing, and availability.
- **Booking System**: Manage customer bookings, including multi-date, multi-person, and custom requests. Automated booking columns and calendar views.
- **Payment Tracking**: Integrated payment plans, reminders, and status tracking for each booking. Supports multiple currencies and custom payment terms.
- **Email Automation**: Automated email templates for booking confirmations, payment reminders, cancellations, and custom notifications.
- **User Roles & Permissions**: Admin, staff, and customer roles with tailored access and functionality.
- **Migration Toolkit**: Scripts and utilities for migrating legacy data and updating system columns.
- **Data Export/Import**: Export bookings, packages, and other data to JSON for backup or analysis. Import tools for bulk updates.
- **Customizable Columns**: Flexible column system for bookings and packages, supporting custom fields and dynamic operations.
- **Debug & Testing Utilities**: Tools for local debugging, test data generation, and function triggers.
- **Mobile-Friendly UI**: Responsive design for seamless use on desktop and mobile devices.

## Technologies Used

- **Next.js**: Frontend framework for fast, scalable web apps.
- **Firebase**: Authentication, Firestore database, and cloud functions.
- **Tailwind CSS**: Utility-first CSS for rapid UI development.
- **Node.js**: Backend scripts and migration tools.

## Getting Started

1. **Install dependencies**:
	```bash
	npm install
	```
2. **Run the development server**:
	```bash
	npm run dev
	```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `client/` — Main Next.js app, components, configs, and public assets.
- `functions/` — Firebase Cloud Functions, email logic, and backend scripts.
- `migrations/` — Data migration scripts for evolving database schemas.
- `exports/` — Data export files (JSON) for bookings, packages, etc.
- `keys/` — Service account keys for development and production.
- `documentation/` — System architecture, database, and feature docs.

## How It Works

1. **Tour Operators/Admins** create and manage packages, bookings, and payment plans.
2. **Customers** book tours, receive automated emails, and track payments.
3. **System** automates reminders, updates, and exports for reporting.

## Deployment

Deploy easily on [Vercel](https://vercel.com/) or your preferred cloud provider. See `firebase.json` and Next.js deployment docs for details.

## Contributing

Contributions are welcome! Please see the documentation folder for guidelines and submit pull requests via GitHub.

## License

MIT License. See LICENSE file for details.
