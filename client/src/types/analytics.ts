import { Timestamp } from "firebase/firestore";

// ============================================================================
// ENHANCED ANALYTICS TYPES
// ============================================================================

export interface DashboardAnalytics {
  performanceOverview: PerformanceOverview;
  bookingPipeline: BookingPipelineData;
  urgentActions: UrgentActionItem[];
  recentActivity: ActivityItem[];
}

export interface PerformanceOverview {
  totalBookings: number;
  totalRevenue: number;
  pendingPayments: number;
  activeTours: number;
  conversionRate: number;
  averageBookingValue: number;
  customerSatisfaction: number;
  trends: {
    bookings: TrendData;
    revenue: TrendData;
    conversion: TrendData;
  };
}

export interface TrendData {
  current: number;
  previous: number;
  change: number; // Percentage change
  trend: "up" | "down" | "stable";
}

export interface BookingPipelineData {
  leads: number;
  qualified: number;
  proposals: number;
  bookings: number;
  conversionRates: {
    leadToQualified: number;
    qualifiedToProposal: number;
    proposalToBooking: number;
    overall: number;
  };
}

export interface UrgentActionItem {
  id: string;
  type:
    | "payment_overdue"
    | "tour_preparation"
    | "customer_response"
    | "system_alert";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  dueDate?: Timestamp;
  relatedId?: string; // booking, tour, etc.
  actionUrl?: string;
}

export interface ActivityItem {
  id: string;
  type: "booking_created" | "payment_received" | "email_sent" | "tour_updated";
  title: string;
  description: string;
  timestamp: Timestamp;
  userId: string;
  userName: string;
  relatedId?: string;
}

// ============================================================================
// FINANCIAL ANALYTICS TYPES
// ============================================================================

export interface FinancialAnalytics {
  revenueAnalysis: RevenueAnalysis;
  paymentAnalysis: PaymentAnalysis;
  profitabilityAnalysis: ProfitabilityAnalysis;
  forecastData: ForecastData;
}

export interface RevenueAnalysis {
  totalRevenue: number;
  recurringRevenue: number;
  oneTimeRevenue: number;
  averageBookingValue: number;
  revenueByTour: Array<{
    tourId: string;
    tourName: string;
    revenue: number;
    bookingCount: number;
    averageValue: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    bookingCount: number;
    growth: number;
  }>;
}

export interface PaymentAnalysis {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  paymentPlanDistribution: Array<{
    plan: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  overdueAnalysis: Array<{
    bookingId: string;
    amount: number;
    daysPastDue: number;
    riskLevel: "low" | "medium" | "high";
  }>;
}

export interface ProfitabilityAnalysis {
  grossProfit: number;
  profitMargin: number;
  profitByTour: Array<{
    tourId: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }>;
  costBreakdown: {
    operational: number;
    marketing: number;
    administrative: number;
    other: number;
  };
}

export interface ForecastData {
  nextMonthRevenue: number;
  nextQuarterRevenue: number;
  projectedBookings: number;
  seasonalTrends: Array<{
    month: string;
    projectedRevenue: number;
    confidence: number;
  }>;
}

// ============================================================================
// CUSTOMER ANALYTICS TYPES
// ============================================================================

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  retentionRate: number;
  churnRate: number;
  customerSegmentation: CustomerSegmentation;
  behaviorAnalysis: CustomerBehaviorAnalysis;
}

export interface CustomerSegmentation {
  byType: Array<{
    type: string;
    count: number;
    revenue: number;
    averageValue: number;
  }>;
  bySource: Array<{
    source: string;
    count: number;
    conversionRate: number;
    revenue: number;
  }>;
  byLocation: Array<{
    location: string;
    count: number;
    revenue: number;
  }>;
}

export interface CustomerBehaviorAnalysis {
  averageTimeToBook: number; // Days from first contact
  mostPopularTours: Array<{
    tourId: string;
    tourName: string;
    bookingCount: number;
    revenue: number;
  }>;
  seasonalPreferences: Array<{
    month: string;
    bookingCount: number;
    preferredTours: string[];
  }>;
  paymentPreferences: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

// ============================================================================
// TOUR PERFORMANCE ANALYTICS TYPES
// ============================================================================

export interface TourPerformanceAnalytics {
  popularityRankings: TourPopularityRanking[];
  capacityUtilization: TourCapacityData[];
  revenuePerformance: TourRevenueData[];
  customerSatisfaction: TourSatisfactionData[];
  seasonalTrends: TourSeasonalData[];
}

export interface TourPopularityRanking {
  tourId: string;
  tourName: string;
  bookingCount: number;
  revenue: number;
  averageRating: number;
  rank: number;
  change: number; // Change in rank from previous period
}

export interface TourCapacityData {
  tourId: string;
  tourName: string;
  totalCapacity: number;
  bookedCapacity: number;
  utilizationRate: number;
  waitingList: number;
}

export interface TourRevenueData {
  tourId: string;
  tourName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  revenuePerBooking: number;
}

export interface TourSatisfactionData {
  tourId: string;
  tourName: string;
  averageRating: number;
  totalReviews: number;
  recommendationRate: number;
  commonFeedback: string[];
}

export interface TourSeasonalData {
  tourId: string;
  tourName: string;
  monthlyData: Array<{
    month: string;
    bookings: number;
    revenue: number;
    avgTemperature?: number;
    seasonality: "peak" | "high" | "medium" | "low";
  }>;
}

// ============================================================================
// OPERATIONAL ANALYTICS TYPES
// ============================================================================

export interface OperationalAnalytics {
  agentPerformance: AgentPerformanceData[];
  communicationEffectiveness: CommunicationEffectivenessData;
  systemUsage: SystemUsageData;
  customerService: CustomerServiceMetrics;
}

export interface AgentPerformanceData {
  userId: string;
  userName: string;
  bookingsCreated: number;
  revenueGenerated: number;
  conversionRate: number;
  averageResponseTime: number; // In hours
  customerSatisfaction: number;
  taskCompletionRate: number;
}

export interface CommunicationEffectivenessData {
  emailMetrics: {
    totalSent: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
  };
  templatePerformance: Array<{
    templateId: string;
    templateName: string;
    usage: number;
    effectiveness: number;
    averageResponse: number;
  }>;
  channelPreferences: Array<{
    channel: string;
    usage: number;
    effectiveness: number;
  }>;
}

export interface SystemUsageData {
  activeUsers: number;
  sessionDuration: number;
  pageViews: number;
  featureUsage: Array<{
    feature: string;
    usage: number;
    users: number;
  }>;
  errorRate: number;
  performanceMetrics: {
    averageLoadTime: number;
    slowestPages: string[];
  };
}

export interface CustomerServiceMetrics {
  averageResponseTime: number;
  firstContactResolution: number;
  customerSatisfactionScore: number;
  escalationRate: number;
  commonIssues: Array<{
    issue: string;
    frequency: number;
    averageResolutionTime: number;
  }>;
}

// ============================================================================
// REPORT GENERATION TYPES
// ============================================================================

export interface ReportRequest {
  type: ReportType;
  period: TimePeriod;
  filters?: ReportFilters;
  format: ReportFormat;
  recipients?: string[];
  schedule?: ReportSchedule;
}

export type ReportType =
  | "financial"
  | "customer"
  | "tour_performance"
  | "operational"
  | "custom";

export type TimePeriod =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export interface ReportFilters {
  tourIds?: string[];
  userIds?: string[];
  customerTypes?: string[];
  bookingStatuses?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export type ReportFormat = "pdf" | "excel" | "csv" | "json";

export interface ReportSchedule {
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  dayOfWeek?: number; // For weekly reports (0-6)
  dayOfMonth?: number; // For monthly reports (1-31)
  time: string; // HH:mm format
  timezone: string;
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: Timestamp;
  generatedBy: string;
  period: TimePeriod;
  fileUrl: string;
  format: ReportFormat;
  size: number; // File size in bytes
  downloadCount: number;
}
