export type ValidationErrors = Record<string, string>;

export interface GuestDetails {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
}

export interface TravelDateDetail {
  date: string;
  customDeposit?: number;
  customOriginal?: number;
  hasCustomDeposit?: boolean;
}

export interface TourPackage {
  id: string;
  slug?: string;
  name: string;
  travelDates: string[];
  status?: "active" | "inactive";
  stripePaymentLink?: string;
  deposit?: number;
  price: number;
  coverImage?: string;
  duration?: string;
  highlights?: (string | { text: string; image?: string })[];
  destinations?: string[];
  media?: {
    coverImage?: string;
    gallery?: string[];
  };
  description?: string;
  region?: string;
  country?: string;
  rating?: number;
  travelDateDetails?: TravelDateDetail[];
}

export interface PaymentTerm {
  id: string;
  name: string;
  description: string;
  paymentPlanType: string;
  monthsRequired?: number;
  monthlyPercentages?: number[];
  color: string;
}

export interface PersonPaymentPlan {
  plan: string;
  tourCostShare: number;
  reservationFeeShare: number;
}

export interface AvailablePaymentTerm {
  term: string;
  isLastMinute: boolean;
  isInvalid: boolean;
}

export interface PaymentScheduleItem {
  date: string;
  amount: number;
}

export interface AvailablePaymentPlanOption {
  id: string;
  type: string;
  label: string;
  description: string;
  color: string;
  monthsRequired?: number;
  schedule: PaymentScheduleItem[];
}
