export interface UserProfile {
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
  bookingHistory?: string[]; // Array of booking IDs
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  role: 'user' | 'admin' | 'agent';
}

export interface CreateUserData {
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
}

export interface UpdateUserData {
  displayName?: string;
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
}