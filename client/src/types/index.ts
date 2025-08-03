// Core Firestore Types
import { Timestamp } from "firebase/firestore";

// ============================================================================
// COMMON UTILITY TYPES
// ============================================================================

export type CollectionName =
  | "bookings"
  | "tourPackages"
  | "users"
  | "communications"
  | "settings";

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  pendingPayments: number;
  activeTours: number;
  recentBookings: any[];
  upcomingPayments: any[];
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}
