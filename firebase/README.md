# Firebase Setup Guide for ImHere Travels

This guide will help you set up Firebase Authentication and Firestore for the ImHere Travels application.

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project created at [Firebase Console](https://console.firebase.google.com)

## Firebase Project Setup

### 1. Authentication Setup

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable the following providers:
   - **Email/Password**: Enable this provider
   - **Google**: Enable this provider and configure OAuth consent screen

### 2. Firestore Database Setup

1. Go to Firebase Console → Firestore Database
2. Create database in **production mode**
3. Choose your preferred location (closest to your users)

### 3. Deploy Firestore Rules

```bash
cd firebase
firebase login
firebase use --add  # Select your Firebase project
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4. Storage Setup (Optional - for future file uploads)

1. Go to Firebase Console → Storage
2. Get started with default settings
3. Deploy storage rules:

```bash
firebase deploy --only storage
```

## Google Authentication Configuration

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Navigate to "APIs & Services" → "Credentials"
4. Find your OAuth 2.0 client ID (created by Firebase)
5. Add authorized domains:
   - `localhost` (for development)
   - Your production domain

### 2. Firebase Console Configuration

1. Go to Firebase Console → Authentication → Sign-in method
2. Click on Google provider
3. Add your project's public-facing name
4. Add support email
5. Save configuration

## Environment Variables

Make sure your web app has the correct Firebase configuration in `src/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

## Firestore Database Structure

The application creates the following collections:

### Users Collection (`/users/{uid}`)

```typescript
{
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferences?: {
    currency: string;
    language: string;
    dietaryRestrictions: string[];
    travelStyle: string[];
    newsletter: boolean;
    smsNotifications: boolean;
  };
  bookingHistory?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  role: 'user' | 'admin' | 'agent';
}
```

## Security Rules

The Firestore security rules ensure:

- Users can only read/write their own profile data
- Admin users can read all user profiles
- Proper validation of user data structure
- Protection against unauthorized access

## Testing Authentication

1. Start your development server: `npm run dev`
2. Navigate to your app
3. Click "Sign In" and test both email/password and Google authentication
4. Check Firebase Console → Authentication → Users to see registered users
5. Check Firestore → Data to see user profiles created automatically

## Troubleshooting

### Common Issues

1. **Google Sign-in not working**:
   - Check authorized domains in Google Cloud Console
   - Verify OAuth consent screen is configured
   - Ensure Google provider is enabled in Firebase Console

2. **Firestore permission denied**:
   - Verify security rules are deployed
   - Check user authentication status
   - Ensure user document exists

3. **User profile not created**:
   - Check browser console for errors
   - Verify Firestore rules allow user creation
   - Check network tab for failed requests

### Debug Commands

```bash
# Check Firebase project status
firebase projects:list

# Test Firestore rules locally
firebase emulators:start --only firestore

# Deploy specific services
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

## Next Steps

1. Set up Firebase hosting for production deployment
2. Configure custom email templates for authentication
3. Set up Firebase Functions for server-side logic
4. Implement booking and tour management features
5. Add file upload functionality for profile pictures

For more information, visit the [Firebase Documentation](https://firebase.google.com/docs).