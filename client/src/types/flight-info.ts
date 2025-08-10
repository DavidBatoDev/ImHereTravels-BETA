import { Timestamp } from "firebase/firestore";

// ============================================================================
// FLIGHT INFO TYPES
// ============================================================================

export interface FlightInfo {
  id: string;
  bookingId: string;
  route: string;
  airline: string;
  flightNumber: string;
  departure: Timestamp;
  arrival: Timestamp;
  terminal?: string;
  gate?: string;
  notes?: string;
  status: FlightStatus;
  type: FlightType;
  metadata: FlightInfoMetadata;
}

export type FlightStatus = 
  | "scheduled"
  | "delayed"
  | "cancelled"
  | "boarding"
  | "departed"
  | "arrived"
  | "unknown";

export type FlightType = 
  | "arrival"
  | "departure"
  | "connecting"
  | "domestic"
  | "international";

export interface FlightInfoMetadata {
  addedBy: string; // Reference to users
  addedAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy?: string; // Reference to users
  source?: "manual" | "api" | "import"; // How the flight info was added
}

// ============================================================================
// FLIGHT TRACKING TYPES
// ============================================================================

export interface FlightUpdate {
  id: string;
  flightInfoId: string;
  updateType: FlightUpdateType;
  oldValue?: string;
  newValue?: string;
  timestamp: Timestamp;
  source: "manual" | "api" | "airline";
  notes?: string;
}

export type FlightUpdateType = 
  | "status_change"
  | "delay"
  | "gate_change"
  | "terminal_change"
  | "cancellation"
  | "time_change";

// ============================================================================
// FLIGHT FORM TYPES
// ============================================================================

export interface FlightInfoFormData {
  bookingId: string;
  route: string;
  airline: string;
  flightNumber: string;
  departure: string; // ISO date string
  arrival: string; // ISO date string
  terminal?: string;
  gate?: string;
  notes?: string;
  type: FlightType;
}

export interface BulkFlightImportData {
  bookingId: string;
  route: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  terminal?: string;
  gate?: string;
  type: FlightType;
  notes?: string;
}

// ============================================================================
// FLIGHT ANALYTICS TYPES
// ============================================================================

export interface FlightAnalytics {
  totalFlights: number;
  onTimeRate: number; // Percentage of on-time flights
  averageDelay: number; // In minutes
  topAirlines: Array<{
    airline: string;
    count: number;
    onTimeRate: number;
  }>;
  topRoutes: Array<{
    route: string;
    count: number;
    averageDelay: number;
  }>;
  statusDistribution: Array<{
    status: FlightStatus;
    count: number;
    percentage: number;
  }>;
}

export interface FlightDelayAnalytics {
  totalDelays: number;
  averageDelayTime: number;
  delaysByAirline: Array<{
    airline: string;
    delays: number;
    averageDelay: number;
  }>;
  delaysByRoute: Array<{
    route: string;
    delays: number;
    averageDelay: number;
  }>;
  seasonalDelayTrends: Array<{
    month: string;
    delayCount: number;
    averageDelay: number;
  }>;
}

// ============================================================================
// FLIGHT SEARCH AND FILTER TYPES
// ============================================================================

export interface FlightFilters {
  status?: FlightStatus;
  type?: FlightType;
  airline?: string;
  route?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasDelays?: boolean;
  bookingId?: string;
}

export interface FlightSearchParams {
  query: string;
  filters: FlightFilters;
  sortBy: "departure" | "arrival" | "airline" | "route" | "addedAt";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

// ============================================================================
// FLIGHT NOTIFICATION TYPES
// ============================================================================

export interface FlightNotification {
  id: string;
  flightInfoId: string;
  bookingId: string;
  type: FlightNotificationType;
  message: string;
  scheduled: Timestamp;
  sent: boolean;
  sentAt?: Timestamp;
  recipients: string[]; // Email addresses
}

export type FlightNotificationType = 
  | "delay_alert"
  | "gate_change"
  | "cancellation"
  | "check_in_reminder"
  | "departure_reminder"
  | "arrival_update";

// ============================================================================
// AIRPORT AND AIRLINE REFERENCE TYPES
// ============================================================================

export interface Airport {
  code: string; // IATA code (e.g., "UIO")
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface Airline {
  code: string; // IATA code (e.g., "AA")
  name: string;
  country: string;
  website?: string;
  phone?: string;
}
