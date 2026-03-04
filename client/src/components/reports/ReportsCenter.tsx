"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Banknote,
  TrendingUp,
  Users,
  AlertCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { financialReportsService } from "@/services/financial-reports-service";
import { FinancialReport, DateRangeFilter } from "@/types/financial-reports";
import { useSessionDateRange } from "@/hooks/useSessionDateRange";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatDisplayDate(value: string): string {
  return parseIsoDate(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPreviousPeriodRange(range: DateRangeFilter): DateRangeFilter | null {
  if (!range.startDate || !range.endDate || range.preset === "all_time") return null;

  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);
  const diffDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);

  return {
    preset: "custom",
    startDate: toIsoDate(prevStart),
    endDate: toIsoDate(prevEnd),
  };
}

function pctDelta(current: number, previous: number): string {
  if (!previous) return "—";
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function pctDeltaForCsv(current: number, previous: number): string {
  if (!previous) return "N/A";
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}%`;
}

function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function exportTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number): string {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/** Format a currency amount with a symbol prefix */
function formatCurrency(amount: number, currency = "£"): string {
  return `${currency}${Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Metric tooltip definitions */
const METRIC_DEFINITIONS: Record<string, string> = {
  "Net Revenue":
    "Gross Revenue minus total Refunded Amounts. Represents actual money retained.",
  "Gross Revenue":
    "Sum of all Reservation Fees and Px payments (P1–P4) actually received within the date range.",
  "Outstanding Balances":
    "Truly unpaid overdue installments (past due date + 1 day, no payment received). Paid-late amounts are excluded.",
  "Expected Revenue":
    "Future scheduled installment amounts based on Px Due Dates falling within the date range.",
  "Total Refunded":
    "Sum of refundable amounts issued on Cancellation Request Dates within the date range.",
  "Cancelled Bookings":
    "Number of bookings with a Cancellation Request Date within the date range.",
  "Avg. Booking Value":
    "Net Revenue divided by the number of non-cancelled bookings in the date range.",
};

export default function ReportsCenter() {
  const [dateRange, setDateRange] = useSessionDateRange();
  const [comparisonMode, setComparisonMode] = useState<"none" | "previous_period" | "custom">("previous_period");
  const [comparisonCustomRange, setComparisonCustomRange] = useState<DateRangeFilter>(() => {
    const previous = getPreviousPeriodRange(dateRange);
    return previous ?? { preset: "custom", startDate: dateRange.startDate, endDate: dateRange.endDate };
  });

  // Financial report state
  const [financialReport, setFinancialReport] =
    useState<FinancialReport | null>(null);
  const [comparisonReport, setComparisonReport] = useState<FinancialReport | null>(null);
  const [comparisonRange, setComparisonRange] = useState<DateRangeFilter | null>(null);
  const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);

  const { toast } = useToast();

  // Load financial report
  const loadFinancialReport = useCallback(
    async (
      range: DateRangeFilter,
      mode: "none" | "previous_period" | "custom",
      customRange: DateRangeFilter
    ) => {
      setIsLoadingFinancial(true);
      setFinancialError(null);
      try {
        const report = await financialReportsService.generateReport(range);
        setFinancialReport(report);

        const resolvedComparisonRange =
          mode === "none"
            ? null
            : mode === "previous_period"
            ? getPreviousPeriodRange(range)
            : customRange;

        setComparisonRange(resolvedComparisonRange);
        if (resolvedComparisonRange) {
          const previousReport = await financialReportsService.generateReport(resolvedComparisonRange);
          setComparisonReport(previousReport);
        } else {
          setComparisonReport(null);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load financial report";
        setFinancialError(msg);
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsLoadingFinancial(false);
      }
    },
    [toast],
  );

  // Load financial report whenever date range changes
  useEffect(() => {
    loadFinancialReport(dateRange, comparisonMode, comparisonCustomRange);
  }, [dateRange, comparisonMode, comparisonCustomRange, loadFinancialReport]);

  const metrics = financialReport?.metrics;
  const previousMetrics = comparisonReport?.metrics;
  const router = useRouter();

  const toTransactionsUrl = (status?: "paid" | "overdue" | "pending") => {
    const base = `/reports/transactions?start=${dateRange.startDate}&end=${dateRange.endDate}`;
    if (status) return `${base}&status=${status}&scrollTo=paymentSchedule`;
    return base;
  };
  const toCancellationsUrl = () =>
    `/reports/cancellations?start=${dateRange.startDate}&end=${dateRange.endDate}`;

  const hasComparison = comparisonMode !== "none" && !!previousMetrics;

  const comparisonLabel = comparisonMode === "none"
    ? "No comparison"
    : comparisonMode === "previous_period"
    ? `vs previous period (${comparisonRange?.startDate ? formatDisplayDate(comparisonRange.startDate) : "—"} → ${comparisonRange?.endDate ? formatDisplayDate(comparisonRange.endDate) : "—"})`
    : `vs custom comparison (${comparisonRange?.startDate ? formatDisplayDate(comparisonRange.startDate) : "—"} → ${comparisonRange?.endDate ? formatDisplayDate(comparisonRange.endDate) : "—"})`;

  const comparisonSelectorLabel =
    comparisonMode === "none"
      ? "No comparison"
      : comparisonMode === "previous_period"
      ? "Previous period"
      : "Custom comparison";

  const scorecardDelta = (
    current: number,
    previous: number | undefined,
    options?: { higherIsBetter?: boolean }
  ) => {
    const higherIsBetter = options?.higherIsBetter ?? true;

    if (comparisonMode === "none") {
      return { text: "No comparison", className: "text-muted-foreground" };
    }
    if (previous === undefined || previous === null) {
      return { text: "No comparison data", className: "text-muted-foreground" };
    }
    const delta = deltaPercent(current, previous);
    if (delta === null) {
      return { text: "— vs comparison", className: "text-muted-foreground" };
    }

    const isPositiveTrend = delta > 0;
    const isGoodTrend = higherIsBetter ? isPositiveTrend : !isPositiveTrend;

    if (delta > 0) {
      return {
        text: `↑ ${delta.toFixed(1)}% vs comparison`,
        className: isGoodTrend ? "text-emerald-600" : "text-red-600",
      };
    }
    if (delta < 0) {
      return {
        text: `↓ ${Math.abs(delta).toFixed(1)}% vs comparison`,
        className: isGoodTrend ? "text-emerald-600" : "text-red-600",
      };
    }
    return { text: "→ 0.0% vs comparison", className: "text-muted-foreground" };
  };

  const comparisonRangeText = comparisonRange
    ? `${formatDisplayDate(comparisonRange.startDate)} → ${formatDisplayDate(comparisonRange.endDate)}`
    : "—";

  const renderComparisonIndicator = (
    metricLabel: string,
    current: number,
    previous: number | undefined,
    formatValue: (value: number) => string,
    options?: { higherIsBetter?: boolean }
  ) => {
    const delta = scorecardDelta(current, previous, options);

    if (!hasComparison || previous === undefined || previous === null) {
      return <p className={`text-[11px] mt-1 ${delta.className}`}>{delta.text}</p>;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className={`text-[11px] mt-1 cursor-help underline decoration-dotted underline-offset-2 ${delta.className}`}>
              {delta.text}
            </p>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-relaxed space-y-1.5">
            <p className="font-semibold">{metricLabel}</p>
            <p>Current: {formatValue(current)}</p>
            <p>Comparison: {formatValue(previous)}</p>
            <p>Range: {comparisonRangeText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const trendWithComparison = metrics?.revenueTrend.map((bucket, index) => ({
    ...bucket,
    prevLabel: previousMetrics?.revenueTrend[index]?.label ?? "—",
    prevGrossRevenue: previousMetrics?.revenueTrend[index]?.grossRevenue ?? 0,
    prevExpectedRevenue: previousMetrics?.revenueTrend[index]?.expectedRevenue ?? 0,
    prevRefundedAmount: previousMetrics?.revenueTrend[index]?.refundedAmount ?? 0,
  })) ?? [];

  const tourWithComparison = (() => {
    const currentTours = metrics?.revenueByTour ?? [];
    const previousTours = previousMetrics?.revenueByTour ?? [];
    const prevMap = new Map(previousTours.map((tour) => [tour.tourName, tour]));
    return currentTours.map((tour) => ({
      ...tour,
      previousNetRevenue: prevMap.get(tour.tourName)?.netRevenue ?? 0,
      previousBookingCount: prevMap.get(tour.tourName)?.bookingCount ?? 0,
    }));
  })();

  const handleExport = (type: "summary-csv" | "trend-csv" | "tour-csv" | "full-json") => {
    if (!financialReport) return;
    const stamp = `${dateRange.startDate}_to_${dateRange.endDate}`;

    const currentRangeText = `${formatDisplayDate(dateRange.startDate)} to ${formatDisplayDate(dateRange.endDate)}`;
    const comparisonRangeCsvText = comparisonRange
      ? `${formatDisplayDate(comparisonRange.startDate)} to ${formatDisplayDate(comparisonRange.endDate)}`
      : "No comparison";
    const comparisonModeText =
      comparisonMode === "none"
        ? "none"
        : comparisonMode === "previous_period"
        ? "previous_period"
        : "custom";

    const csvMetaRows = [
      ["Date Range", currentRangeText],
      ["Comparison Mode", comparisonModeText],
      ["Comparison Date Range", comparisonRangeCsvText],
      [],
    ];

    if (type === "summary-csv") {
      const rows = [
        ...csvMetaRows,
        ["Metric", "Current", "Previous", "Delta %"],
        ["Net Revenue", metrics?.totalNetRevenue ?? 0, previousMetrics?.totalNetRevenue ?? 0, pctDeltaForCsv(metrics?.totalNetRevenue ?? 0, previousMetrics?.totalNetRevenue ?? 0)],
        ["Gross Revenue", metrics?.totalGrossRevenue ?? 0, previousMetrics?.totalGrossRevenue ?? 0, pctDeltaForCsv(metrics?.totalGrossRevenue ?? 0, previousMetrics?.totalGrossRevenue ?? 0)],
        ["Outstanding Balances", metrics?.totalOverdueUnpaid ?? 0, previousMetrics?.totalOverdueUnpaid ?? 0, pctDeltaForCsv(metrics?.totalOverdueUnpaid ?? 0, previousMetrics?.totalOverdueUnpaid ?? 0)],
        ["Expected Revenue", metrics?.totalExpectedRevenue ?? 0, previousMetrics?.totalExpectedRevenue ?? 0, pctDeltaForCsv(metrics?.totalExpectedRevenue ?? 0, previousMetrics?.totalExpectedRevenue ?? 0)],
        ["Total Refunded", metrics?.totalRefunded ?? 0, previousMetrics?.totalRefunded ?? 0, pctDeltaForCsv(metrics?.totalRefunded ?? 0, previousMetrics?.totalRefunded ?? 0)],
        ["Cancelled Bookings", metrics?.cancelledBookingsCount ?? 0, previousMetrics?.cancelledBookingsCount ?? 0, pctDeltaForCsv(metrics?.cancelledBookingsCount ?? 0, previousMetrics?.cancelledBookingsCount ?? 0)],
      ];
      const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
      exportTextFile(`financial_summary_${stamp}.csv`, csv, "text/csv;charset=utf-8;");
      return;
    }

    if (type === "trend-csv") {
      const rows = [
        ...csvMetaRows,
        ["Label", "Comparison Label", "Gross Revenue", "Expected Revenue", "Refunded", "Prev Gross", "Prev Expected", "Prev Refunded"],
        ...trendWithComparison.map((b) => [
          b.label,
          b.prevLabel,
          b.grossRevenue,
          b.expectedRevenue,
          b.refundedAmount,
          b.prevGrossRevenue,
          b.prevExpectedRevenue,
          b.prevRefundedAmount,
        ]),
      ];
      const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
      exportTextFile(`revenue_trends_${stamp}.csv`, csv, "text/csv;charset=utf-8;");
      return;
    }

    if (type === "tour-csv") {
      const rows = [
        ...csvMetaRows,
        ["Tour", "Net Revenue", "Gross Revenue", "Booking Count", "Share %", "Prev Net Revenue", "Prev Booking Count"],
        ...tourWithComparison.map((tour) => [
          tour.tourName,
          tour.netRevenue,
          tour.grossRevenue,
          tour.bookingCount,
          tour.percentage,
          tour.previousNetRevenue,
          tour.previousBookingCount,
        ]),
      ];
      const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
      exportTextFile(`revenue_by_tour_${stamp}.csv`, csv, "text/csv;charset=utf-8;");
      return;
    }

    const payload = {
      currentRange: dateRange,
      previousRange: comparisonRange,
      current: financialReport,
      previous: comparisonReport,
    };
    exportTextFile(
      `financial_report_${stamp}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8;"
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-600">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-[34px]">
                {comparisonSelectorLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Comparison</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setComparisonMode("none")}>
                No comparison
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setComparisonMode("previous_period")}>
                Previous period
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (!comparisonCustomRange?.startDate || !comparisonCustomRange?.endDate) {
                    const previous = getPreviousPeriodRange(dateRange);
                    if (previous) setComparisonCustomRange(previous);
                  }
                  setComparisonMode("custom");
                }}
              >
                Custom date range
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {comparisonMode === "custom" && (
            <DateRangePicker value={comparisonCustomRange} onChange={setComparisonCustomRange} />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-[34px] gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("summary-csv")}>Summary (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("trend-csv")}>Revenue Trends (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("tour-csv")}>Revenue by Tour (CSV)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("full-json")}>Full Report (JSON)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadFinancialReport(dateRange, comparisonMode, comparisonCustomRange)}
            disabled={isLoadingFinancial}
            className="h-[34px]"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingFinancial ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Loading / Error states */}
        {isLoadingFinancial && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx}>
                  <CardHeader className="space-y-2 pb-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[280px] w-full" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-52" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[240px] w-full" />
              </CardContent>
            </Card>
          </div>
        )}
        {financialError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            <XCircle className="h-4 w-4" />
            {financialError}
          </div>
        )}

        {!isLoadingFinancial && (
          <>
            {/* 7 Financial Metric Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Net Revenue */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(toTransactionsUrl("paid"))}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-sm font-medium">
                      Net Revenue
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground cursor-help text-xs select-none"
                            aria-label="Net Revenue info"
                          >
                            ⓘ
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-relaxed">
                          {METRIC_DEFINITIONS["Net Revenue"]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {metrics ? formatCurrency(metrics.totalNetRevenue) : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gross minus refunds
                  </p>
                  {renderComparisonIndicator(
                    "Net Revenue",
                    metrics?.totalNetRevenue ?? 0,
                    previousMetrics?.totalNetRevenue,
                    (value) => formatCurrency(value)
                  )}
                </CardContent>
              </Card>

              {/* Gross Revenue */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(toTransactionsUrl("paid"))}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-sm font-medium">
                      Gross Revenue
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground cursor-help text-xs select-none"
                            aria-label="Gross Revenue info"
                          >
                            ⓘ
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-relaxed">
                          {METRIC_DEFINITIONS["Gross Revenue"]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {metrics ? formatCurrency(metrics.totalGrossRevenue) : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All payments received
                  </p>
                  {renderComparisonIndicator(
                    "Gross Revenue",
                    metrics?.totalGrossRevenue ?? 0,
                    previousMetrics?.totalGrossRevenue,
                    (value) => formatCurrency(value)
                  )}
                </CardContent>
              </Card>

              {/* Outstanding Balances */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(toTransactionsUrl("overdue"))}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-sm font-medium">
                      Outstanding Balances
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground cursor-help text-xs select-none"
                            aria-label="Outstanding Balances info"
                          >
                            ⓘ
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-relaxed">
                          {METRIC_DEFINITIONS["Outstanding Balances"]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-orange-600">
                    {metrics
                      ? metrics.totalOverdueUnpaid > 0
                        ? formatCurrency(metrics.totalOverdueUnpaid)
                        : "—"
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics && metrics.totalOverdueUnpaid > 0
                      ? "Requires attention"
                      : "All payments current"}
                  </p>
                  {renderComparisonIndicator(
                    "Outstanding Balances",
                    metrics?.totalOverdueUnpaid ?? 0,
                    previousMetrics?.totalOverdueUnpaid,
                    (value) => formatCurrency(value),
                    { higherIsBetter: false }
                  )}
                </CardContent>
              </Card>

              {/* Expected Revenue */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(toTransactionsUrl("pending"))}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-sm font-medium">
                      Expected Revenue
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground cursor-help text-xs select-none"
                            aria-label="Expected Revenue info"
                          >
                            ⓘ
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-relaxed">
                          {METRIC_DEFINITIONS["Expected Revenue"]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {metrics
                      ? formatCurrency(metrics.totalExpectedRevenue)
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scheduled future payments
                  </p>
                  {renderComparisonIndicator(
                    "Expected Revenue",
                    metrics?.totalExpectedRevenue ?? 0,
                    previousMetrics?.totalExpectedRevenue,
                    (value) => formatCurrency(value)
                  )}
                </CardContent>
              </Card>

              {/* Total Refunded */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(toCancellationsUrl())}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-sm font-medium">
                      Total Refunded
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground cursor-help text-xs select-none"
                            aria-label="Total Refunded info"
                          >
                            ⓘ
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-relaxed">
                          {METRIC_DEFINITIONS["Total Refunded"]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <XCircle className="h-4 w-4 text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-red-600">
                    {metrics
                      ? metrics.totalRefunded > 0
                        ? `−${formatCurrency(metrics.totalRefunded)}`
                        : "—"
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cancellation refunds
                  </p>
                  {renderComparisonIndicator(
                    "Total Refunded",
                    metrics?.totalRefunded ?? 0,
                    previousMetrics?.totalRefunded,
                    (value) => `−${formatCurrency(value)}`,
                    { higherIsBetter: false }
                  )}
                </CardContent>
              </Card>

              {/* Cancelled Bookings */}
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(toCancellationsUrl())}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-sm font-medium">
                      Cancelled Bookings
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground cursor-help text-xs select-none"
                            aria-label="Cancelled Bookings info"
                          >
                            ⓘ
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs leading-relaxed">
                          {METRIC_DEFINITIONS["Cancelled Bookings"]}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {metrics ? metrics.cancelledBookingsCount : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Within date range
                  </p>
                  {renderComparisonIndicator(
                    "Cancelled Bookings",
                    metrics?.cancelledBookingsCount ?? 0,
                    previousMetrics?.cancelledBookingsCount,
                    (value) => `${value}`,
                    { higherIsBetter: false }
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>
                  Revenue over time — hover for details{hasComparison ? ` (${comparisonLabel})` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics && trendWithComparison.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={trendWithComparison}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          `£${(v as number).toLocaleString("en-GB", {
                            notation: "compact",
                          })}`
                        }
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={false}
                        width={72}
                      />
                      <RechartsTooltip
                        content={(props: any) => {
                          const { active, payload, label } = props;
                          if (!active || !payload?.length) return null;
                          const point = payload[0]?.payload;
                          return (
                            <div className="flex gap-2 items-start">
                              <div className="bg-popover border border-border rounded-lg shadow-md p-3 text-sm text-popover-foreground min-w-[200px]">
                                <p className="font-semibold mb-2">Current: {label}</p>
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium text-[#22c55e]">Gross Revenue:</span>
                                    <span className="font-bold">{formatCurrency(point.grossRevenue as number)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium text-[#3b82f6]">Expected Revenue:</span>
                                    <span className="font-bold">{formatCurrency(point.expectedRevenue as number)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="font-medium text-[#ef4444]">Refunded:</span>
                                    <span className="font-bold">{formatCurrency(point.refundedAmount as number)}</span>
                                  </div>
                                </div>
                              </div>
                              {hasComparison && (
                                <div className="bg-popover border border-border rounded-lg shadow-md p-3 text-sm text-popover-foreground min-w-[220px]">
                                  <p className="font-semibold mb-2">Comparison: {point.prevLabel}</p>
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="font-medium text-[#22c55e]">Prev Gross Revenue:</span>
                                      <span className="font-bold">{formatCurrency(point.prevGrossRevenue as number)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="font-medium text-[#3b82f6]">Prev Expected Revenue:</span>
                                      <span className="font-bold">{formatCurrency(point.prevExpectedRevenue as number)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="font-medium text-[#ef4444]">Prev Refunded:</span>
                                      <span className="font-bold">{formatCurrency(point.prevRefundedAmount as number)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="grossRevenue"
                        name="Gross Revenue"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      {hasComparison && (
                        <Line
                          type="monotone"
                          dataKey="prevGrossRevenue"
                          name="Prev Gross Revenue"
                          stroke="#22c55e"
                          strokeOpacity={0.45}
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={false}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="expectedRevenue"
                        name="Expected Revenue"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      {hasComparison && (
                        <Line
                          type="monotone"
                          dataKey="prevExpectedRevenue"
                          name="Prev Expected Revenue"
                          stroke="#3b82f6"
                          strokeOpacity={0.45}
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={false}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="refundedAmount"
                        name="Refunded"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                      {hasComparison && (
                        <Line
                          type="monotone"
                          dataKey="prevRefundedAmount"
                          name="Prev Refunded"
                          stroke="#ef4444"
                          strokeOpacity={0.45}
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">
                        No trend data for this period
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Tour Package */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Tour Package</CardTitle>
                <CardDescription>
                  Net revenue and booking count per tour{hasComparison ? ` (${comparisonLabel})` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!metrics || tourWithComparison.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No revenue data for this period.
                  </p>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(
                      220,
                      tourWithComparison.length * 52 + 60,
                    )}
                  >
                    <BarChart
                      data={tourWithComparison}
                      layout="vertical"
                      margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
                      barCategoryGap="35%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#f0f0f0"
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(v) =>
                          `£${(v as number).toLocaleString("en-GB", {
                            notation: "compact",
                          })}`
                        }
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="tourName"
                        width={175}
                        tick={{ fontSize: 11, fill: "#374151" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "#f9fafb" }}
                        content={(props: any) => {
                          const { active, payload } = props;
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="flex gap-2 items-start">
                              <div className="bg-popover border border-border rounded-lg shadow-md p-3 text-sm text-popover-foreground min-w-[210px]">
                                <p className="font-semibold mb-1 max-w-[200px] break-words">
                                  Current: {d.tourName}
                                </p>
                                <p className="text-blue-600 font-bold">
                                  Net: {formatCurrency(d.netRevenue)}
                                </p>
                                <p className="text-gray-500">
                                  Gross: {formatCurrency(d.grossRevenue)}
                                </p>
                                <p className="text-gray-500">
                                  {d.bookingCount} booking
                                  {d.bookingCount !== 1 ? "s" : ""} &middot;{" "}
                                  {d.percentage}%
                                </p>
                              </div>
                              {hasComparison && (
                                <div className="bg-popover border border-border rounded-lg shadow-md p-3 text-sm text-popover-foreground min-w-[210px]">
                                  <p className="font-semibold mb-1 max-w-[200px] break-words">
                                    Comparison: {d.tourName}
                                  </p>
                                  <p className="text-slate-600 font-bold">
                                    Prev Net: {formatCurrency(d.previousNetRevenue)}
                                  </p>
                                  <p className="text-gray-500">
                                    Prev bookings: {d.previousBookingCount}
                                  </p>
                                  <p className="text-gray-500">
                                    Range: {comparisonRangeText}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="netRevenue"
                        name="Net Revenue"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                      />
                      {hasComparison && (
                        <Bar
                          dataKey="previousNetRevenue"
                          name="Prev Net Revenue"
                          fill="#94a3b8"
                          radius={[0, 4, 4, 0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
