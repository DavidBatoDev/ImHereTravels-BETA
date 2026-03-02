"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { financialReportsService } from "@/services/financial-reports-service";
import {
  FinancialReport,
  DateRangeFilter,
  BookingFinancialSummary,
} from "@/types/financial-reports";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CancellationRow {
  bookingId: string;
  bookingCode: string;
  tourName: string;
  cancellationDate: string;
  totalPaid: number;    // sum of all gross payments received before cancellation
  refunded: number;     // positive refund amount
  kept: number;         // totalPaid - refunded
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
  // Append local time to avoid UTC midnight → local-time day shift
  const date = d.includes("T") ? new Date(d) : new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildCancellationRows(report: FinancialReport): CancellationRow[] {
  const rows: CancellationRow[] = [];

  for (const summary of report.bookingSummaries) {
    if (!summary.isCancelled) continue;

    const cancellationEv = summary.events.find(
      (e) => e.eventType === "cancellation"
    );
    const cancellationDate = cancellationEv?.date ?? "";

    // Total paid = sum of all gross revenue events (excluding refund)
    const totalPaid = summary.totalGrossRevenue;
    // Refunded = positive absolute value
    const refunded = Math.abs(summary.totalRefunded);
    // Kept = what the company keeps
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

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2 max-w-[180px] truncate">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 justify-between">
          <span style={{ color: entry.color }} className="font-medium">
            {entry.name}:
          </span>
          <span className="font-bold">{fmt(entry.value)}</span>
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

export default function CancellationsDetailPage() {
  const router = useRouter();
  const params = useSearchParams();

  const startDate = params.get("start") ?? "";
  const endDate = params.get("end") ?? "";
  const dateRange: DateRangeFilter = {
    preset: "custom",
    startDate: startDate || new Date().toISOString().split("T")[0],
    endDate: endDate || new Date().toISOString().split("T")[0],
  };

  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("cancellationDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  // ── Summary stats ───────────────────────────────────────────────────────────
  const metrics = report?.metrics;
  const totalRefunded = allRows.reduce((s, r) => s + r.refunded, 0);
  const totalKept = allRows.reduce((s, r) => s + r.kept, 0);
  const totalPaid = allRows.reduce((s, r) => s + r.totalPaid, 0);

  const periodLabel =
    startDate && endDate
      ? `${fmtDate(startDate)} – ${fmtDate(endDate)}`
      : "All time";

  // ── Chart data (per-booking bar chart) ──────────────────────────────────────
  const chartData = useMemo(
    () =>
      sortedRows.slice(0, 20).map((r) => ({
        name: r.bookingId || r.bookingCode,
        tourName: r.tourName,
        totalPaid: r.totalPaid,
        refunded: r.refunded,
        kept: r.kept,
      })),
    [sortedRows]
  );

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

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              Cancellations Report
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Cancelled bookings for{" "}
              <span className="font-medium">{periodLabel}</span>
            </p>
          </div>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Cancelled Bookings
              </p>
              <p className="text-2xl font-bold text-gray-900">{allRows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Total Paid (before cancel)
              </p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Total Refunded
              </p>
              <p className="text-2xl font-bold text-red-600">−{fmt(totalRefunded)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Total Kept
              </p>
              <p className="text-2xl font-bold text-green-700">{fmt(totalKept)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Paid vs Refunded vs Kept per Booking</CardTitle>
              <CardDescription>
                Amount breakdown for each cancelled booking
                {chartData.length < allRows.length
                  ? ` (showing top ${chartData.length} of ${allRows.length})`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 45 + 60)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      `£${(v as number).toLocaleString("en-GB", { notation: "compact" })}`
                    }
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                  <Bar dataKey="totalPaid" name="Total Paid" fill="#6b7280" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="refunded" name="Refunded" fill="#ef4444" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="kept" name="Kept" fill="#22c55e" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Details</CardTitle>
            <CardDescription>
              {sortedRows.length} cancelled booking
              {sortedRows.length !== 1 ? "s" : ""} — click column headers to sort
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortHeader label="Booking ID" col="bookingCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="pl-4" />
                    <SortHeader label="Tour Name" col="tourName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Cancellation Date" col="cancellationDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Total Paid" col="totalPaid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Refunded" col="refunded" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right" />
                    <SortHeader label="Kept" col="kept" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="text-right pr-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-12 text-gray-400 text-sm"
                      >
                        No cancellations found for this period.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row, i) => (
                      <tr
                        key={`${row.bookingId}-${i}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-3 py-3 pl-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/bookings?bookingId=${row.bookingId}`)}
                            title={`Open booking ${row.bookingId}`}
                            className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold text-left leading-tight"
                          >
                            {row.bookingId}
                          </button>
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

                {/* Totals footer */}
                {sortedRows.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-3 py-3 pl-4 text-sm font-semibold text-gray-700">
                        Totals ({sortedRows.length} bookings)
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-gray-700">
                        {fmt(sortedRows.reduce((s, r) => s + r.totalPaid, 0))}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-red-600">
                        −{fmt(sortedRows.reduce((s, r) => s + r.refunded, 0))}
                      </td>
                      <td className="px-3 py-3 pr-4 text-right text-sm font-bold text-green-700">
                        {fmt(sortedRows.reduce((s, r) => s + r.kept, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
