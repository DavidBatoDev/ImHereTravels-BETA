import { Timestamp } from "firebase/firestore";

// ============================================================================
// PAYMENT SETTINGS TYPES
// ============================================================================

export interface PaymentTermsSettings {
  id: "paymentTerms";
  terms: PaymentTerm[];
}

export interface PaymentTerm {
  condition: string; // "Standard Booking, P1"
  term: string; // "P1"
}

export interface StripeConfigSettings {
  id: "stripeConfig";
  apiKey: string; // Encrypted
  webhookSecret: string;
  dashboardLink: string;
}

export interface PaymentGateway {
  name: "stripe" | "revolut" | "paypal";
  displayName: string;
  description: string;
  features: string[];
  isEnabled: boolean;
}

// ============================================================================
// EMAIL SETTINGS TYPES
// ============================================================================

export interface EmailConfigSettings {
  id: "emailConfig";
  provider: "resend" | "sendgrid" | "gmail";
  apiKey: string; // Encrypted
  fromAddress: string;
  bccAddresses: string[];
}

export interface SMTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  useSSL: boolean;
  useTLS: boolean;
}

// ============================================================================
// CALENDAR SETTINGS TYPES
// ============================================================================

export interface CalendarConfigSettings {
  id: "calendarConfig";
  provider: "google";
  credentials: object; // Encrypted
}

export interface CalendarProvider {
  name: "google" | "outlook" | "ical";
  displayName: string;
  description: string;
  features: string[];
}

// ============================================================================
// CANCELLATION SETTINGS TYPES
// ============================================================================

export interface CancellationReasonsSettings {
  id: "cancellationReasons";
  reasons: string[]; // ["Tour Date too close", ...]
}

export interface CancellationPolicy {
  id: string;
  name: string;
  description: string;
  refundPercentage: number;
  timeLimit: number; // Days before tour
  isActive: boolean;
}

// ============================================================================
// NOTIFICATION SETTINGS TYPES
// ============================================================================

export interface NotificationSettings {
  emailNotifications: boolean;
  paymentReminders: boolean;
  bookingConfirmations: boolean;
  systemAlerts: boolean;
  dailyReports: boolean;
}

export interface NotificationPreferences {
  newBookings: boolean;
  payments: boolean;
  cancellations: boolean;
  systemUpdates: boolean;
  marketing: boolean;
}

// ============================================================================
// SECURITY SETTINGS TYPES
// ============================================================================

export interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number; // Minutes
  passwordExpiry: number; // Days
  failedLoginAttempts: number;
  passwordPolicy: PasswordPolicy;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
}

// ============================================================================
// SYSTEM SETTINGS TYPES
// ============================================================================

export interface SystemSettings {
  timezone: string;
  dateFormat: string;
  currency: "USD" | "EUR" | "GBP";
  language: "en" | "es" | "fr";
  maintenanceMode: boolean;
  backupFrequency: "daily" | "weekly" | "monthly";
}

export interface SystemInfo {
  version: string;
  databaseStatus: "connected" | "disconnected" | "error";
  lastBackup: Timestamp;
  storageUsed: number;
  storageLimit: number;
  uptime: number;
}

// ============================================================================
// API KEYS TYPES
// ============================================================================

export interface ApiKey {
  id: string;
  name: string;
  key: string; // Masked
  provider: "stripe" | "email" | "calendar" | "other";
  isActive: boolean;
  lastUsed?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

export interface ApiKeyFormData {
  name: string;
  provider: "stripe" | "email" | "calendar" | "other";
  key: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface PaymentSettingsFormData {
  terms: PaymentTerm[];
  gateway: "stripe" | "revolut" | "paypal";
  apiKey: string;
  webhookUrl: string;
}

export interface EmailSettingsFormData {
  provider: "resend" | "sendgrid" | "gmail";
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromEmail: string;
}

export interface SecuritySettingsFormData {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  failedLoginAttempts: number;
  passwordPolicy: PasswordPolicy;
}

export interface NotificationSettingsFormData {
  emailNotifications: boolean;
  paymentReminders: boolean;
  bookingConfirmations: boolean;
  systemAlerts: boolean;
  dailyReports: boolean;
}

// ============================================================================
// SETTINGS STATUS TYPES
// ============================================================================

export type SettingsCategory =
  | "payment"
  | "email"
  | "security"
  | "notifications"
  | "system"
  | "api";

export type SettingStatus = "active" | "inactive" | "error";

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface SettingsValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SettingsBackup {
  id: string;
  name: string;
  createdAt: Timestamp;
  createdBy: string;
  size: number;
  description?: string;
}
