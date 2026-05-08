export interface CustomerReportRow {
  // Booking info
  bookingId: string;
  bookingCode: string;
  reservationDate: string; // YYYY-MM-DD
  tourDate: string; // YYYY-MM-DD
  tourName: string;
  numberOfGuests: number;
  isMainBooker: boolean;
  bookingStatus: string | null; // "Confirmed" | "Pending" | "Cancelled" | "Completed"

  // Guest demographics
  guestName: string;
  nationality: string | null;  // display label e.g. "British", "Irish"
  country: string | null;      // country name e.g. "United Kingdom"
  birthdate: string | null;    // YYYY-MM-DD
  ageAtReservation: number | null;
  gender: string | null;       // "Male" | "Female"

  // Data provenance
  source: string | null;       // "Reservation Form" | "Admin"
  passportLink: string | null; // Google Drive URL
  email: string | null;

  // Derived
  customerType: "New" | "Returning" | "Unknown";
  isOverdue: boolean;

  // Revenue
  grossRevenue: number;
  netRevenue: number;
}

export interface DemographicSlice {
  label: string;
  count: number;
  percent: number;
}

export interface CustomerReportMetrics {
  totalGuestRows: number;
  totalBookings: number;
  newCount: number;
  returningCount: number;
  averageAge: number | null;
  nationalityBreakdown: DemographicSlice[];     // all nationalities (no topN cap)
  countryBreakdown: DemographicSlice[];
  ageGroupBreakdown: DemographicSlice[];
  newVsReturning: DemographicSlice[];
  genderBreakdown: DemographicSlice[];           // Male, Female, Unknown
  bookingStatusBreakdown: DemographicSlice[];    // Confirmed, Pending, Cancelled, Completed
}

export interface CustomerReport {
  rows: CustomerReportRow[];
  metrics: CustomerReportMetrics;
}
