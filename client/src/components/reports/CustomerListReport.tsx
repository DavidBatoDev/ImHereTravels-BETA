"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw,
  XCircle,
  Users,
  Globe,
  UserCheck,
  UserPlus,
  CalendarDays,
  Hash,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  RotateCcw,
  Save,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { generateCustomerReport } from "@/services/customer-reports-service";
import { CustomerReport, CustomerReportRow } from "@/types/customer-reports";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { useSessionDateRange } from "@/hooks/useSessionDateRange";
import { DateRangeFilter } from "@/types/financial-reports";

// ---------------------------------------------------------------------------
// Column config
// ---------------------------------------------------------------------------

type ColKey =
  | "bookingCode"
  | "reservationDate"
  | "tourDate"
  | "tourName"
  | "guestName"
  | "email"
  | "nationality"
  | "country"
  | "birthdate"
  | "ageAtReservation"
  | "gender"
  | "customerType"
  | "numberOfGuests"
  | "source"
  | "passportLink"
  | "bookingStatus"
  | "grossRevenue"
  | "netRevenue";

interface ColDef {
  key: ColKey;
  label: string;
  type: "dimension" | "metric";
}

const COL_DEFS: ColDef[] = [
  { key: "bookingCode", label: "Booking ID", type: "dimension" },
  { key: "reservationDate", label: "Reservation Date", type: "dimension" },
  { key: "tourDate", label: "Tour Date", type: "dimension" },
  { key: "tourName", label: "Tour Name", type: "dimension" },
  { key: "guestName", label: "Guest Name", type: "dimension" },
  { key: "email", label: "Email", type: "dimension" },
  { key: "nationality", label: "Nationality", type: "dimension" },
  { key: "country", label: "Country", type: "dimension" },
  { key: "birthdate", label: "Birthdate", type: "dimension" },
  { key: "ageAtReservation", label: "Age", type: "metric" },
  { key: "gender", label: "Gender", type: "dimension" },
  { key: "customerType", label: "Customer Type", type: "dimension" },
  { key: "bookingStatus", label: "Booking Status", type: "dimension" },
  { key: "numberOfGuests", label: "No. of Guests", type: "metric" },
  { key: "source", label: "Source", type: "dimension" },
  { key: "passportLink", label: "Passport", type: "dimension" },
  { key: "grossRevenue", label: "Gross Revenue", type: "metric" },
  { key: "netRevenue", label: "Net Revenue", type: "metric" },
];

const DEFAULT_VISIBLE: Record<ColKey, boolean> = {
  bookingCode: true,
  reservationDate: true,
  tourDate: true,
  tourName: true,
  guestName: true,
  email: true,
  nationality: true,
  country: true,
  birthdate: true,
  ageAtReservation: true,
  gender: true,
  customerType: true,
  bookingStatus: false,
  numberOfGuests: true,
  source: true,
  passportLink: true,
  grossRevenue: true,
  netRevenue: true,
};

const STORAGE_KEY = "iht:customer-report:columns:v1";

function loadCols(): Record<ColKey, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_VISIBLE, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULT_VISIBLE };
}

function saveCols(cols: Record<ColKey, boolean>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cols)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Chart constants
// ---------------------------------------------------------------------------

const NAT_COLOR = "#685BC7";
const AGE_COLOR = "#26D07C";
const GENDER_COLORS: Record<string, string> = {
  Female: "#ec4899",
  Male: "#3b82f6",
  Unknown: "#9ca3af",
};
const STATUS_COLORS: Record<string, string> = {
  Confirmed: "#22c55e",
  Completed: "#3b82f6",
  Pending: "#f59e0b",
  Overdue: "#f97316",
  Cancelled: "#ef4444",
};
const PIE_COLORS_NVR = ["#26D07C", "#685BC7", "#9ca3af"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(amount: number): string {
  return `£${Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = d.includes("T") ? new Date(d) : new Date(d + "T00:00:00");
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const PAGE_SIZE_OPTIONS = [100, 500, 1000] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

type SortKey = keyof Pick<
  CustomerReportRow,
  | "bookingCode" | "reservationDate" | "tourDate" | "tourName" | "guestName"
  | "email" | "nationality" | "country" | "birthdate" | "ageAtReservation" | "customerType"
  | "numberOfGuests" | "gender" | "source" | "bookingStatus" | "grossRevenue" | "netRevenue"
>;
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SortTh({
  label, col, sortKey, sortDir, onSort, className = "",
}: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (col: SortKey) => void; className?: string;
}) {
  const active = sortKey === col;
  return (
    <th
      className={`px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap bg-gray-50 sticky top-0 z-10 ${className}`}
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-0.5">
        {label}
        {active
          ? sortDir === "asc"
            ? <ArrowUp className="h-2.5 w-2.5 text-blue-600 shrink-0" />
            : <ArrowDown className="h-2.5 w-2.5 text-blue-600 shrink-0" />
          : <ArrowUpDown className="h-2.5 w-2.5 text-gray-400 shrink-0" />}
      </span>
    </th>
  );
}

function MetricCard({ title, value, sub, icon: Icon, loading }: {
  title: string; value: string; sub?: string; icon: React.ElementType; loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5 truncate">{title}</p>
            {loading ? <Skeleton className="h-6 w-20 mb-1" /> : <p className="text-xl font-bold text-gray-900 truncate">{value}</p>}
            {sub && !loading && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{sub}</p>}
          </div>
          <Icon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
        </div>
      </CardContent>
    </Card>
  );
}

function BarTip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; payload: { percent: number } }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const { value, payload: p } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded shadow-lg p-2 text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-600">{value} ({p.percent}%)</p>
    </div>
  );
}

function PieTip({ active, payload }: {
  active?: boolean; payload?: Array<{ name: string; value: number; payload: { percent: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded shadow-lg p-2 text-xs">
      <p className="font-semibold">{name}</p>
      <p className="text-gray-600">{value} ({p.percent}%)</p>
    </div>
  );
}

// Controls panel (Shopify-style)
function ControlsPanel({
  open, onClose, cols, onToggle, onSave, onReset,
}: {
  open: boolean; onClose: () => void; cols: Record<ColKey, boolean>;
  onToggle: (k: ColKey) => void; onSave: () => void; onReset: () => void;
}) {
  const dimensions = COL_DEFS.filter((d) => d.type === "dimension");
  const metrics = COL_DEFS.filter((d) => d.type === "metric");

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed right-0 top-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm text-gray-900">Controls</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Metrics */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Metrics
            </p>
            <div className="space-y-1.5">
              {metrics.map((m) => (
                <label key={m.key} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
                  <input
                    type="checkbox"
                    checked={cols[m.key]}
                    onChange={() => onToggle(m.key)}
                    className="h-3.5 w-3.5 rounded accent-purple-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Dimensions
            </p>
            <div className="space-y-1.5">
              {dimensions.map((d) => (
                <label key={d.key} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
                  <input
                    type="checkbox"
                    checked={cols[d.key]}
                    onChange={() => onToggle(d.key)}
                    className="h-3.5 w-3.5 rounded accent-purple-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    {d.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t space-y-2">
          <Button onClick={onSave} size="sm" className="w-full gap-1.5 bg-gray-900 hover:bg-gray-800 text-white">
            <Save className="h-3.5 w-3.5" />
            Save preferences
          </Button>
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors py-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to defaults
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CustomerListReport() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const startParam = params.get("start") ?? "";
  const endParam = params.get("end") ?? "";

  const [dateRange, setDateRange] = useSessionDateRange(
    startParam && endParam
      ? { preset: "custom", startDate: startParam, endDate: endParam }
      : undefined
  );

  const [report, setReport] = useState<CustomerReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("reservationDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pageSize, setPageSize] = useState<PageSize>(100);
  const [page, setPage] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(DEFAULT_VISIBLE);

  // Load saved column prefs
  useEffect(() => {
    setVisibleCols(loadCols());
  }, []);

  const loadReport = useCallback(async (range: DateRangeFilter) => {
    setLoading(true);
    setError(null);
    setPage(1);
    try {
      setReport(await generateCustomerReport(range));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReport(dateRange); }, [dateRange, loadReport]);

  const handleDateRangeChange = useCallback((range: DateRangeFilter) => {
    setDateRange(range);
    const p = new URLSearchParams();
    p.set("start", range.startDate);
    p.set("end", range.endDate);
    router.replace(`/reports/customers?${p.toString()}`, { scroll: false });
  }, [setDateRange, router]);

  const handleSort = useCallback((col: SortKey) => {
    setPage(1);
    if (col === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir("asc"); }
  }, [sortKey]);

  const toggleCol = useCallback((key: ColKey) => {
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(() => {
    saveCols(visibleCols);
    toast({ title: "Saved", description: "Column preferences saved successfully." });
    setShowControls(false);
  }, [visibleCols, toast]);

  const handleReset = useCallback(() => {
    setVisibleCols({ ...DEFAULT_VISIBLE });
    saveCols({ ...DEFAULT_VISIBLE });
    toast({ title: "Reset", description: "Columns reset to defaults." });
  }, [toast]);

  const sortedRows = useMemo(() => {
    if (!report) return [];
    return [...report.rows].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [report, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const handleExportCSV = useCallback(() => {
    const visColDefs = COL_DEFS.filter((c) => visibleCols[c.key]);
    const headers = visColDefs.map((c) => c.label);
    const getExportValue = (row: CustomerReportRow, key: ColKey): unknown => {
      // Keep CSV Booking ID consistent with table display/deep-link target.
      if (key === "bookingCode") return row.bookingId || row.bookingCode || "";
      return row[key as keyof CustomerReportRow];
    };
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvRows = [
      headers.join(","),
      ...sortedRows.map((row) =>
        visColDefs
          .map(({ key }) => escape(getExportValue(row, key)))
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob(["﻿" + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `guest-list-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedRows, visibleCols, dateRange]);

  const m = report?.metrics;
  const vis = (k: ColKey) => visibleCols[k];

  // Top 5 nationality summary string
  const top5Nat = m?.nationalityBreakdown
    .filter((s) => s.label !== "Unknown")
    .slice(0, 5)
    .map((s) => `${s.label} (${s.percent}%)`)
    .join(", ") ?? "—";

  const newPct = m && m.totalGuestRows > 0 ? Math.round((m.newCount / m.totalGuestRows) * 100) : 0;
  const retPct = m && m.totalGuestRows > 0 ? Math.round((m.returningCount / m.totalGuestRows) * 100) : 0;

  // Nationality chart: all entries, dynamic height
  const natData = m?.nationalityBreakdown.filter((s) => s.label !== "Unknown") ?? [];
  const natChartHeight = Math.max(220, natData.length * 30 + 50);

  // Status bar — filter Unknown (shouldn't appear after service fix, but guard anyway)
  const statusBarData = (m?.bookingStatusBreakdown ?? []).filter((s) => s.label !== "Unknown");

  return (
    <>
      <ControlsPanel
        open={showControls}
        onClose={() => setShowControls(false)}
        cols={visibleCols}
        onToggle={toggleCol}
        onSave={handleSave}
        onReset={handleReset}
      />

      <div className="space-y-4 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="gap-1 pl-1 h-8">
                <ArrowLeft className="h-4 w-4" />
                Reports
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Customer Guest List</h1>
              <p className="text-xs text-gray-500">Demographics, nationality &amp; age breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => loadReport(dateRange)}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant={showControls ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowControls((v) => !v)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Controls
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-3 xl:grid-cols-6 gap-2">
          <MetricCard title="Total Guests" value={loading ? "—" : String(m?.totalGuestRows ?? 0)} icon={Users} loading={loading} />
          <MetricCard title="Total Bookings" value={loading ? "—" : String(m?.totalBookings ?? 0)} icon={Hash} loading={loading} />
          <MetricCard title="New Guests" value={loading ? "—" : `${newPct}%`} sub={loading ? undefined : `${m?.newCount ?? 0} guests`} icon={UserPlus} loading={loading} />
          <MetricCard title="Returning" value={loading ? "—" : `${retPct}%`} sub={loading ? undefined : `${m?.returningCount ?? 0} guests`} icon={UserCheck} loading={loading} />
          <MetricCard
            title="Top 5 Nationalities"
            value={loading ? "—" : (m?.nationalityBreakdown.filter((s) => s.label !== "Unknown")[0]?.label ?? "—")}
            sub={loading ? undefined : top5Nat}
            icon={Globe}
            loading={loading}
          />
          <MetricCard title="Average Age" value={loading ? "—" : m?.averageAge != null ? `${m.averageAge} yrs` : "—"} icon={CalendarDays} loading={loading} />
        </div>

        {/* Charts — Row 1: Nationality (wide) + Age */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Nationality breakdown — all labels, dynamic height */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-semibold">Nationality Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-2 pb-3">
              {loading ? (
                <Skeleton className="w-full" style={{ height: 220 }} />
              ) : natData.length === 0 ? (
                <div className="flex items-center justify-center text-gray-400 text-xs" style={{ height: 220 }}>No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={natChartHeight}>
                  <BarChart
                    layout="vertical"
                    data={natData}
                    margin={{ top: 4, right: 48, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
                    <RechartsTooltip content={<BarTip />} />
                    <Bar dataKey="count" fill={NAT_COLOR} radius={[0, 3, 3, 0]} label={{ position: "right", fontSize: 10, formatter: (v: number) => `${v}` }}>
                      {natData.map((_, i) => (
                        <Cell key={i} fill={NAT_COLOR} fillOpacity={Math.max(0.4, 1 - i * 0.05)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Age distribution */}
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-semibold">Age Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-2 pb-3">
              {loading ? (
                <Skeleton className="h-52 w-full" />
              ) : !m?.ageGroupBreakdown.filter((s) => s.label !== "Unknown").length ? (
                <div className="h-52 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={natChartHeight}>
                  <BarChart data={m.ageGroupBreakdown.filter((s) => s.label !== "Unknown")} margin={{ top: 4, right: 8, bottom: 4, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip content={<BarTip />} />
                    <Bar dataKey="count" fill={AGE_COLOR} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts — Row 2: Gender + New vs Returning + Booking Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Gender */}
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-semibold">Gender</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-2 pb-3">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : !m?.genderBreakdown.filter((s) => s.label !== "Unknown").length ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={m.genderBreakdown.filter((s) => s.label !== "Unknown")}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {m.genderBreakdown
                        .filter((s) => s.label !== "Unknown")
                        .map((entry, i) => (
                          <Cell key={i} fill={GENDER_COLORS[entry.label] ?? "#9ca3af"} />
                        ))}
                    </Pie>
                    <Legend
                      formatter={(value, entry: any) => `${value} (${entry.payload.percent}%)`}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <RechartsTooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* New vs Returning */}
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-semibold">New vs Returning</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-2 pb-3">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : !m?.newVsReturning.length ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={m.newVsReturning} dataKey="count" nameKey="label" cx="50%" cy="45%" innerRadius={44} outerRadius={68} paddingAngle={2}>
                      {m.newVsReturning.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS_NVR[i % PIE_COLORS_NVR.length]} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value, entry: any) => `${value} (${entry.payload.percent}%)`}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    <RechartsTooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Booking Status */}
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-semibold">Booking Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-2 pb-3">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : statusBarData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-xs">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusBarData} margin={{ top: 4, right: 24, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip content={<BarTip />} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {statusBarData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.label] ?? "#9ca3af"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Guest Records
                  {!loading && m && (
                    <span className="ml-1.5 text-xs font-normal text-gray-500">
                      ({m.totalGuestRows} guest{m.totalGuestRows !== 1 ? "s" : ""} across {m.totalBookings} booking{m.totalBookings !== 1 ? "s" : ""})
                    </span>
                  )}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Nationality &amp; country from passport form. Admin-created bookings show "—".
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>Show</span>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => { setPageSize(n); setPage(1); }}
                      className={`px-2 py-0.5 rounded border text-xs font-medium transition-colors ${
                        pageSize === n
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-300 text-gray-600 hover:border-gray-500"
                      }`}
                    >
                      {n === 1000 ? "1k" : n}
                    </button>
                  ))}
                  <span>per page</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleExportCSV}
                  disabled={loading || sortedRows.length === 0}
                >
                  <Download className="h-3 w-3" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-1.5">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : sortedRows.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                No guest records found for this date range.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs min-w-max">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {vis("bookingCode") && <SortTh label="Booking ID" col="bookingCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[190px] pl-4" />}
                        {vis("reservationDate") && <SortTh label="Res. Date" col="reservationDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[88px]" />}
                        {vis("tourDate") && <SortTh label="Tour Date" col="tourDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[88px]" />}
                        {vis("tourName") && <SortTh label="Tour Name" col="tourName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[130px]" />}
                        {vis("guestName") && <SortTh label="Guest Name" col="guestName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[150px]" />}
                        {vis("email") && <SortTh label="Email" col="email" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />}
                        {vis("nationality") && <SortTh label="Nationality" col="nationality" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[100px]" />}
                        {vis("country") && <SortTh label="Country" col="country" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[110px]" />}
                        {vis("birthdate") && <SortTh label="Birthdate" col="birthdate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[88px]" />}
                        {vis("ageAtReservation") && <SortTh label="Age" col="ageAtReservation" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[46px]" />}
                        {vis("gender") && <SortTh label="Gender" col="gender" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[70px]" />}
                        {vis("customerType") && <SortTh label="Type" col="customerType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[80px]" />}
                        {vis("bookingStatus") && <SortTh label="Status" col="bookingStatus" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[90px]" />}
                        {vis("numberOfGuests") && <SortTh label="Guests" col="numberOfGuests" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[52px]" />}
                        {vis("source") && <SortTh label="Source" col="source" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[78px]" />}
                        {vis("passportLink") && (
                          <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50 sticky top-0 z-10 min-w-[70px]">
                            Passport
                          </th>
                        )}
                        {vis("grossRevenue") && <SortTh label="Gross Rev." col="grossRevenue" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[82px] text-right" />}
                        {vis("netRevenue") && <SortTh label="Net Rev." col="netRevenue" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[82px] text-right pr-4" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedRows.map((row, idx) => (
                        <tr key={`${row.bookingId}-${idx}`} className={`hover:bg-gray-50/60 transition-colors ${!row.isMainBooker ? "bg-gray-50/40" : ""}`}>
                          {vis("bookingCode") && (
                            <td className="px-2 py-1.5 pl-4 whitespace-nowrap">
                              {(() => {
                                const bookingDisplayId = row.bookingId || row.bookingCode;
                                const bookingTargetId = row.bookingId || row.bookingCode;
                                const bookingHref = bookingTargetId
                                  ? `/bookings?tab=bookings&bookingId=${encodeURIComponent(bookingTargetId)}`
                                  : "/bookings?tab=bookings";

                                return (
                                  <div className="flex flex-col gap-0">
                                    <a
                                      href={bookingHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono text-[10px] text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                      title={bookingTargetId
                                        ? `Open booking ${bookingTargetId}`
                                        : "Open bookings page"}
                                    >
                                      {bookingDisplayId || "—"}
                                    </a>
                                    {!row.isMainBooker && (
                                      <span className="text-gray-400 text-[9px]">+guest</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          )}
                          {vis("reservationDate") && <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">{fmtDate(row.reservationDate)}</td>}
                          {vis("tourDate") && <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">{fmtDate(row.tourDate)}</td>}
                          {vis("tourName") && (
                            <td className="px-2 py-1.5 max-w-[140px]">
                              <span className="block truncate text-gray-700" title={row.tourName}>{row.tourName || "—"}</span>
                            </td>
                          )}
                          {vis("guestName") && (
                            <td className="px-2 py-1.5 max-w-[160px]">
                              <span className="block truncate font-medium text-gray-800" title={row.guestName}>{row.guestName || "—"}</span>
                            </td>
                          )}
                          {vis("email") && (
                            <td className="px-2 py-1.5 max-w-[200px]">
                              <span className="block truncate text-gray-600 text-[10px]" title={row.email ?? ""}>{row.email ?? "—"}</span>
                            </td>
                          )}
                          {vis("nationality") && <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">{row.nationality ?? "—"}</td>}
                          {vis("country") && <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">{row.country ?? "—"}</td>}
                          {vis("birthdate") && <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">{fmtDate(row.birthdate)}</td>}
                          {vis("ageAtReservation") && <td className="px-2 py-1.5 text-center text-gray-700">{row.ageAtReservation ?? "—"}</td>}
                          {vis("gender") && <td className="px-2 py-1.5 whitespace-nowrap text-gray-700">{row.gender ?? "—"}</td>}
                          {vis("customerType") && (
                            <td className="px-2 py-1.5">
                              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium ${
                                row.customerType === "New" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : row.customerType === "Returning" ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-gray-50 text-gray-500 border-gray-200"
                              }`}>
                                {row.customerType}
                              </Badge>
                            </td>
                          )}
                          {vis("bookingStatus") && (
                            <td className="px-2 py-1.5">
                              {(() => {
                                const label = row.isOverdue ? "Overdue" : row.bookingStatus;
                                if (!label) return "—";
                                const cls =
                                  label === "Confirmed" ? "bg-green-50 text-green-700 border-green-200"
                                  : label === "Completed" ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : label === "Pending" ? "bg-orange-50 text-orange-700 border-orange-200"
                                  : label === "Overdue" ? "bg-orange-100 text-orange-800 border-orange-300"
                                  : label === "Cancelled" ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-gray-50 text-gray-500 border-gray-200";
                                return (
                                  <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium ${cls}`}>
                                    {label}
                                  </Badge>
                                );
                              })()}
                            </td>
                          )}
                          {vis("numberOfGuests") && <td className="px-2 py-1.5 text-center text-gray-700">{row.isMainBooker ? row.numberOfGuests : "—"}</td>}
                          {vis("source") && (
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              <span className={`text-[10px] font-medium ${
                                row.source === "Reservation Form" ? "text-blue-600"
                                : row.source === "Admin" ? "text-gray-500"
                                : "text-gray-400"
                              }`}>
                                {row.source ?? "—"}
                              </span>
                            </td>
                          )}
                          {vis("passportLink") && (
                            <td className="px-2 py-1.5 text-center">
                              {row.passportLink ? (
                                <a href={row.passportLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 transition-colors" title="View passport">
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="text-[10px]">View</span>
                                </a>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          )}
                          {vis("grossRevenue") && <td className="px-2 py-1.5 text-right font-mono text-gray-700 whitespace-nowrap">{fmt(row.grossRevenue)}</td>}
                          {vis("netRevenue") && <td className="px-2 py-1.5 pr-4 text-right font-mono text-gray-700 whitespace-nowrap">{fmt(row.netRevenue)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
                    <span>
                      Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length} guests
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-2 font-medium text-gray-700">{page} / {totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
