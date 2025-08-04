// ============================================================================
// BARREL EXPORTS - Re-export all types for easier importing
// ============================================================================

// Main types
export * from "./index";

// Specific domain types
export * from "./bookings";
export * from "./tours";
export * from "./users";
export * from "./communications";
export * from "./settings";

// ============================================================================
// COMMON UTILITY TYPES
// ============================================================================

export type CollectionName =
  | "bookings"
  | "tourPackages"
  | "users"
  | "communications"
  | "settings";

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DashboardStats = {
  totalBookings: number;
  totalRevenue: number;
  pendingPayments: number;
  activeTours: number;
  recentBookings: unknown[];
  upcomingPayments: unknown[];
};

export type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
};
