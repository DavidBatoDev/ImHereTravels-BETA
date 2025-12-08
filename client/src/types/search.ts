import { LucideIcon } from "lucide-react";

export type SearchCategory =
  | "bookings"
  | "tours"
  | "payment-terms"
  | "email-templates"
  | "scheduled-emails"
  | "bcc-users"
  | "storage"
  | "discount-events";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: SearchCategory;
  icon: LucideIcon;
  url: string;
  metadata?: {
    status?: string;
    badge?: string;
    badgeColor?: string;
    date?: string;
    [key: string]: any;
  };
  score?: number;
}

export interface CategoryConfig {
  key: SearchCategory;
  label: string;
  icon: LucideIcon;
  fetchData: () => Promise<any[]>;
  searchKeys: Array<{ name: string; weight: number }>;
  threshold: number;
  formatResult: (item: any) => SearchResult;
  useRealtimeListener?: boolean; // For bookings
}

export interface RecentSearch {
  query: string;
  timestamp: number;
  category?: SearchCategory;
}
