"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  XCircle,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { financialReportsService } from "@/services/financial-reports-service";
import { FinancialReport, DateRangeFilter } from "@/types/financial-reports";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { useSessionDateRange } from "@/hooks/useSessionDateRange";

// ─── Chart line keys ──────────────────────────────────────────────────────────
type ChartLine = "grossRevenue" | "refunded" | "kept" | "cancelledCount";

const LINE_META: Record<ChartLine, { label: string; color: string; isCount?: boolean }> = {
  grossRevenue:   { label: "Gross Revenue", color: "#6b7280" },
  refunded:       { label: "Refunded",      color: "#ef4444" },
  kept:           { label: "Net Revenue",   color: "#22c55e" },
  cancelledCount: { label: "Cancellations", color: "#f59e0b", isCount: true },
};

// All possible lines in display order
const LINE_ORDER: ChartLine[] = ["grossRevenue", "kept", "refunded", "cancelledCount"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CancellationRow {
  bookingId: string;
  bookingCode: string;
  tourName: string;
  cancellationDate: string;
  totalPaid: number;
  refunded: number;
  kept: number;
}

type SortKey = keyof Pick<
  CancellationRow,
  "bookingCode" | "tourName" | "cancellationDate" | "totalPaid" | "refunded" | "kept"
>;
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return `£${Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = d.includes("T") ? new Date(d) : new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format YYYY-MM to "MMM YYYY" */
function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function buildCancellationRows(report: FinancialReport): CancellationRow[] {
  const rows: CancellationRow[] = [];

  for (const summary of report.bookingSummaries) {
    if (!summary.isCancelled) continue;

    const cancellationEv = summary.events.find(
      (e) => e.eventType === "cancellation"
    );
    const cancellationDate = cancellationEv?.date ?? "";
    const totalPaid = summary.totalGrossRevenue;
    const refunded = Math.abs(summary.totalRefunded);
    const kept = totalPaid - refunded;

    rows.push({
      bookingId: summary.bookingId,
      bookingCode: summary.bookingCode,
      tourName: summary.tourName,
      cancellationDate,
      totalPaid,
      refunded,
      kept,
    });
  }

  rows.sort((a, b) => b.cancellationDate.localeCompare(a.cancellationDate));
  return rows;
}

/** Returns the number of days between two ISO date strings */
function daysBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000;
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const dataPoint = (payload[0] as any)?.payload as {
    bookingId?: string;
    tourName?: string;
    xLabel?: string;
    isMonthly?: boolean;
    cancelledCount?: number;
  };

  const isCount = (name: string) =>
    name === LINE_META.cancelledCount.label;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-[200px]">
      {dataPoint?.xLabel && (
        <p className="font-semibold text-gray-700 mb-1 truncate">{dataPoint.xLabel}</p>
      )}
      {!dataPoint?.isMonthly && dataPoint?.bookingId && (
        <p className="font-mono text-xs font-semibold text-blue-700 mb-0.5 truncate">
          {dataPoint.bookingId}
        </p>
      )}
      {!dataPoint?.isMonthly && dataPoint?.tourName && (
        <p className="text-gray-500 text-xs mb-2 truncate">{dataPoint.tourName}</p>
      )}
      {dataPoint?.isMonthly && dataPoint?.cancelledCount !== undefined && (
        <p className="text-gray-400 text-xs mb-2">
          {dataPoint.cancelledCount} cancellation{dataPoint.cancelledCount !== 1 ? "s" : ""}
        </p>
      )}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 justify-between">
          <span style={{ color: entry.color }} className="font-medium">
            {entry.name}:
          </span>
          <span className="font-bold">
            {isCount(entry.name)
              ? String(entry.value)
              : fmt(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === col;
  return (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${className ?? ""}`}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3 text-blue-600" />
          ) : (
            <ArrowDown className="h-3 w-3 text-blue-600" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-gray-400" />
        )}
      </span>
    </th>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CancellationsDetailPageContent() {
  const router = useRouter();
  const params = useSearchParams();

  const startParam = params.get("start") ?? "";
  const endParam   = params.get("end")   ?? "";

  const [dateRange, setDateRange] = useSessionDateRange(
    startParam && endParam
      ? { preset: "custom", startDate: startParam, endDate: endParam }
      : undefined
  );

  const handleDateRangeChange = useCallback((range: DateRangeFilter) => {
    setDateRange(range);
    const p = new URLSearchParams();
    p.set("start", range.startDate);
    p.set("end", range.endDate);
    router.replace(`/reports/cancellations?${p.toString()}`);
  }, [setDateRange, router]);

  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("cancellationDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchText, setSearchText] = useState("");
  const [tourFilter, setTourFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Which lines are currently visible in the chart
  const [activeLines, setActiveLines] = useState<Set<ChartLine>>(
    () => new Set<ChartLine>(LINE_ORDER)
  );

  const toggleLine = (key: ChartLine) =>
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ── Fetch report ────────────────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await financialReportsService.generateReport(dateRange);
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ── Build rows ──────────────────────────────────────────────────────────────
  const allRows = useMemo(
    () => (report ? buildCancellationRows(report) : []),
    [report]
  );

  const sortedRows = useMemo(() => {
    return [...allRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allRows, sortKey, sortDir]);

  const uniqueTours = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.tourName))).sort(),
    [allRows]
  );

  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.bookingId.toLowerCase().includes(q) ||
          r.bookingCode.toLowerCase().includes(q) ||
          r.tourName.toLowerCase().includes(q)
      );
    }

    if (tourFilter) {
      rows = rows.filter((r) => r.tourName === tourFilter);
    }

    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allRows, searchText, tourFilter, sortKey, sortDir]);

  const activeFilterCount = [searchText.trim() !== "", tourFilter !== ""].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchText("");
    setTourFilter("");
  };

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalRefunded = allRows.reduce((s, r) => s + r.refunded, 0);
  const totalKept = allRows.reduce((s, r) => s + r.kept, 0);
  const totalPaid = allRows.reduce((s, r) => s + r.totalPaid, 0);

  // ── Chart data: monthly when range > 60 days, per-booking otherwise ─────────
  const isMonthlyChart = useMemo(
    () => daysBetween(dateRange.startDate, dateRange.endDate) > 60,
    [dateRange.startDate, dateRange.endDate]
  );

  const chartData = useMemo(() => {
    if (isMonthlyChart) {
      // Group by YYYY-MM
      const buckets = new Map<string, {
        name: string; xLabel: string; isMonthly: true;
        grossRevenue: number; refunded: number; kept: number; cancelledCount: number;
      }>();

      for (const r of allRows) {
        if (!r.cancellationDate) continue;
        const ym = r.cancellationDate.slice(0, 7);
        if (!buckets.has(ym)) {
          buckets.set(ym, {
            name: fmtMonth(ym),
            xLabel: fmtMonth(ym),
            isMonthly: true,
            grossRevenue: 0,
            refunded: 0,
            kept: 0,
            cancelledCount: 0,
          });
        }
        const b = buckets.get(ym)!;
        b.grossRevenue += r.totalPaid;
        b.refunded += r.refunded;
        b.kept += r.kept;
        b.cancelledCount++;
      }

      return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);
    }

    // Per-booking (short range)
    return sortedRows.slice(0, 20).map((r) => ({
      name: fmtDate(r.cancellationDate) || "—",
      xLabel: fmtDate(r.cancellationDate) || "—",
      isMonthly: false as const,
      bookingId: r.bookingId || r.bookingCode,
      tourName: r.tourName,
      grossRevenue: r.totalPaid,
      refunded: r.refunded,
      kept: r.kept,
      cancelledCount: 1,
    }));
  }, [allRows, sortedRows, isMonthlyChart]);

  // Dynamic chart title
  const chartTitle = useMemo(() => {
    const active = LINE_ORDER.filter((k) => activeLines.has(k));
    if (active.length === 0) return "No metrics selected";
    if (active.length === LINE_ORDER.length) return "Cancellations Overview";
    return active.map((k) => LINE_META[k].label).join(" vs ");
  }, [activeLines]);

  const hasCountLine = activeLines.has("cancelledCount");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/reports")}
            className="gap-1 text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
        </div>

        {/* Header row */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              Cancellations Report
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Cancelled bookings for{" "}
              <span className="font-medium">
                {dateRange.preset === "all_time"
                  ? "All time"
                  : `${fmtDate(dateRange.startDate)} – ${fmtDate(dateRange.endDate)}`}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
            <Button
              variant="outline"
              size="sm"
              onClick={loadReport}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading cancellations…
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {/* Summary Cards – click to toggle chart lines */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

          {/* Cancelled Bookings – toggles cancelledCount line */}
          {(() => {
            const key: ChartLine = "cancelledCount";
            const active = activeLines.has(key);
            return (
              <Card
                onClick={() => toggleLine(key)}
                className={`cursor-pointer transition-all select-none ${
                  active
                    ? "ring-2 ring-amber-400 shadow-md"
                    : "opacity-60 hover:opacity-80"
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Cancelled Bookings
                    </p>
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: LINE_META[key].color }}
                    />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{allRows.length}</p>
                </CardContent>
              </Card>
            );
          })()}

          {/* Gross Revenue – toggles grossRevenue line */}
          {(() => {
            const key: ChartLine = "grossRevenue";
            const active = activeLines.has(key);
            return (
              <Card
                onClick={() => toggleLine(key)}
                className={`cursor-pointer transition-all select-none ${
                  active
                    ? "ring-2 ring-gray-400 shadow-md"
                    : "opacity-60 hover:opacity-80"
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Gross Revenue
                    </p>
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: LINE_META[key].color }}
                    />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{fmt(totalPaid)}</p>
                </CardContent>
              </Card>
            );
          })()}

          {/* Total Refunded – toggles refunded line */}
          {(() => {
            const key: ChartLine = "refunded";
            const active = activeLines.has(key);
            return (
              <Card
                onClick={() => toggleLine(key)}
                className={`cursor-pointer transition-all select-none ${
                  active
                    ? "ring-2 ring-red-400 shadow-md"
                    : "opacity-60 hover:opacity-80"
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Total Refunded
                    </p>
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: LINE_META[key].color }}
                    />
                  </div>
                  <p className="text-2xl font-bold text-red-600">−{fmt(totalRefunded)}</p>
                </CardContent>
              </Card>
            );
          })()}

          {/* Net Revenue – toggles kept line */}
          {(() => {
            const key: ChartLine = "kept";
            const active = activeLines.has(key);
            return (
              <Card
                onClick={() => toggleLine(key)}
                className={`cursor-pointer transition-all select-none ${
                  active
                    ? "ring-2 ring-green-400 shadow-md"
                    : "opacity-60 hover:opacity-80"
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Net Revenue
                    </p>
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: LINE_META[key].color }}
                    />
                  </div>
                  <p className="text-2xl font-bold text-green-700">{fmt(totalKept)}</p>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Line Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{chartTitle}</CardTitle>
              <CardDescription>
                {isMonthlyChart
                  ? "Monthly aggregation — x-axis: cancellation month"
                  : "Per cancelled booking — x-axis: cancellation request date"}
                {!isMonthlyChart && chartData.length < allRows.length
                  ? ` (showing top ${chartData.length} of ${allRows.length})`
                  : ""}
                {activeLines.size === 0 && (
                  <span className="text-amber-500 ml-1">
                    — click a scorecard above to show a line
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer
                width="100%"
                height={Math.max(280, isMonthlyChart
                  ? chartData.length * 30 + 100
                  : chartData.length * 20 + 80)}
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: hasCountLine ? 50 : 30, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    angle={isMonthlyChart ? 0 : -35}
                    textAnchor={isMonthlyChart ? "middle" : "end"}
                    interval={0}
                  />
                  {/* Left Y-axis: monetary */}
                  <YAxis
                    yAxisId="money"
                    tickFormatter={(v) =>
                      `£${(v as number).toLocaleString("en-GB", { notation: "compact" })}`
                    }
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  {/* Right Y-axis: count (only rendered when count line is active) */}
                  {hasCountLine && (
                    <YAxis
                      yAxisId="count"
                      orientation="right"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#f59e0b" }}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                  )}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  {activeLines.has("grossRevenue") && (
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="grossRevenue"
                      name={LINE_META.grossRevenue.label}
                      stroke={LINE_META.grossRevenue.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: LINE_META.grossRevenue.color }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {activeLines.has("kept") && (
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="kept"
                      name={LINE_META.kept.label}
                      stroke={LINE_META.kept.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: LINE_META.kept.color }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {activeLines.has("refunded") && (
                    <Line
                      yAxisId="money"
                      type="monotone"
                      dataKey="refunded"
                      name={LINE_META.refunded.label}
                      stroke={LINE_META.refunded.color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: LINE_META.refunded.color }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {activeLines.has("cancelledCount") && (
                    <Line
                      yAxisId="count"
                      type="monotone"
                      dataKey="cancelledCount"
                      name={LINE_META.cancelledCount.label}
                      stroke={LINE_META.cancelledCount.color}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 4, fill: LINE_META.cancelledCount.color }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Cancellation Details</CardTitle>
                <CardDescription>
                  {filteredRows.length} cancelled booking
                  {filteredRows.length !== 1 ? "s" : ""}
                  {activeFilterCount > 0 && (
                    <span className="ml-1 text-orange-600 font-medium">
                      (filtered from {allRows.length})
                    </span>
                  )}
                  {" — click column headers to sort"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    showFilters || activeFilterCount > 0
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 bg-white text-blue-700 rounded-full px-1.5 text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Booking ID, tour name…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {searchText && (
                        <button
                          onClick={() => setSearchText("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-[220px]">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Tour Name</label>
                    <select
                      value={tourFilter}
                      onChange={(e) => setTourFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">All tours</option>
                      {uniqueTours.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Clear all
                    </button>
                  )}
                </div>

                {activeFilterCount > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {searchText.trim() && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs">
                        Search: &ldquo;{searchText.trim()}&rdquo;
                        <button onClick={() => setSearchText("")}><X className="h-2.5 w-2.5" /></button>
                      </span>
                    )}
                    {tourFilter && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs">
                        Tour: {tourFilter}
                        <button onClick={() => setTourFilter("")}><X className="h-2.5 w-2.5" /></button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortHeader label="Booking ID" col="bookingCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="pl-4" />
                    <SortHeader label="Tour Name" col="tourName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Cancellation Date" col="cancellationDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Gross Revenue" col="totalPaid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Refunded" col="refunded" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Net Revenue" col="kept" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right pr-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Totals summary row – pinned just below headers */}
                  {filteredRows.length > 0 && (
                    <tr className="bg-gray-50 border-b-2 border-gray-300">
                      <td colSpan={3} className="px-3 py-2 pl-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Totals ({filteredRows.length} booking{filteredRows.length !== 1 ? "s" : ""})
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-gray-700">
                        {fmt(filteredRows.reduce((s, r) => s + r.totalPaid, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-red-600">
                        −{fmt(filteredRows.reduce((s, r) => s + r.refunded, 0))}
                      </td>
                      <td className="px-3 py-2 pr-4 text-right text-sm font-bold text-green-700">
                        {fmt(filteredRows.reduce((s, r) => s + r.kept, 0))}
                      </td>
                    </tr>
                  )}
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-12 text-gray-400 text-sm"
                      >
                        No cancellations found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, i) => (
                      <tr
                        key={`${row.bookingId}-${i}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-3 py-3 pl-4 whitespace-nowrap">
                          <a
                            href={`/bookings?bookingId=${row.bookingId}`}
                            title={`Open booking ${row.bookingId}`}
                            className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold text-left leading-tight"
                          >
                            {row.bookingId}
                          </a>
                          {row.bookingCode && row.bookingCode !== row.bookingId && (
                            <div className="text-[10px] text-gray-400 font-mono leading-tight mt-0.5">
                              {row.bookingCode}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-900 max-w-[200px] truncate">
                          {row.tourName}
                        </td>
                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                          {fmtDate(row.cancellationDate)}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-600 whitespace-nowrap">
                          {fmt(row.totalPaid)}
                        </td>
                        <td className="px-3 py-3 text-right text-red-600 font-medium whitespace-nowrap">
                          −{fmt(row.refunded)}
                        </td>
                        <td className="px-3 py-3 pr-4 text-right text-green-700 font-semibold whitespace-nowrap">
                          {fmt(row.kept)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function CancellationsDetailPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-6 text-sm text-gray-500">Loading report…</div>
        </DashboardLayout>
      }
    >
      <CancellationsDetailPageContent />
    </Suspense>
  );
}
