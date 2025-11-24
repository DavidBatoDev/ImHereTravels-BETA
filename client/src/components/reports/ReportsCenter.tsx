"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Calendar,
  Banknote,
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  MapPin,
  Clock,
  FileText,
  AlertCircle,
  History,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { bookingVersionHistoryService } from "@/services/booking-version-history-service";
import { BookingVersionSnapshot } from "@/types/version-history";
import { useToast } from "@/hooks/use-toast";

// Mock data - replace with real data from your backend
const mockFinancialData = {
  totalRevenue: 45600,
  monthlyGrowth: 12.5,
  outstandingBalances: 8900,
  averageBookingValue: 1520,
  revenueByTour: [
    { tour: "Bali Adventure Tour", revenue: 18000, bookings: 15 },
    { tour: "Thailand Cultural Experience", revenue: 14400, bookings: 8 },
    { tour: "Vietnam Discovery", revenue: 10800, bookings: 12 },
  ],
};

const mockBookingData = {
  totalBookings: 35,
  conversionRate: 68.5,
  averageResponseTime: "2.3 hours",
  topSources: [
    { source: "Direct Website", bookings: 18, percentage: 51.4 },
    { source: "Social Media", bookings: 12, percentage: 34.3 },
    { source: "Referrals", bookings: 5, percentage: 14.3 },
  ],
};

const mockOperationalData = {
  agentPerformance: [
    { agent: "Sarah Wilson", bookings: 12, revenue: 18200, rating: 4.8 },
    { agent: "Mike Johnson", bookings: 15, revenue: 19800, rating: 4.6 },
    { agent: "Lisa Chen", bookings: 8, revenue: 7600, rating: 4.9 },
  ],
  emailEffectiveness: {
    openRate: 78.5,
    clickRate: 23.2,
    conversionRate: 12.8,
  },
  tourCapacity: {
    averageUtilization: 85.2,
    peakSeasonUtilization: 92.1,
    offSeasonUtilization: 68.3,
  },
};

export default function ReportsCenter() {
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("financial");
  const [activityLogs, setActivityLogs] = useState<BookingVersionSnapshot[]>(
    []
  );
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const { toast } = useToast();

  // Load activity logs from booking version history
  useEffect(() => {
    loadActivityLogs();
  }, [dateRange]);

  const loadActivityLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const versions = await bookingVersionHistoryService.getAllVersions({
        orderBy: "createdAt",
        orderDirection: "desc",
        limit: 100,
      });

      // Filter by date range
      const filteredVersions = versions.filter((version) => {
        const createdAt = version.metadata.createdAt;
        if (!createdAt) return false;

        let versionDate: Date;
        if (createdAt instanceof Date) {
          versionDate = createdAt;
        } else if (typeof createdAt === "object" && "toDate" in createdAt) {
          versionDate = (createdAt as any).toDate();
        } else if (typeof createdAt === "number") {
          versionDate = new Date(createdAt);
        } else {
          return false;
        }

        return versionDate >= startDate;
      });

      setActivityLogs(filteredVersions);
    } catch (error) {
      console.error("Failed to load activity logs:", error);
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return "Unknown";

    try {
      let date: Date;
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === "object" && "toDate" in timestamp) {
        date = timestamp.toDate();
      } else if (typeof timestamp === "number") {
        date = new Date(timestamp);
      } else {
        return "Unknown";
      }

      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Unknown";
    }
  };

  const getChangeTypeColor = (changeType: string): string => {
    switch (changeType) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "restore":
        return "bg-purple-100 text-purple-800";
      case "bulk":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reports & Analytics
          </h1>
          <p className="text-gray-600">
            Comprehensive insights into your business performance
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList>
          <TabsTrigger value="financial" className="flex items-center">
            <Banknote className="mr-2 h-4 w-4" />
            Financial Reports
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Booking Analytics
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Operational Reports
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center">
            <History className="mr-2 h-4 w-4" />
            Activity Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          {/* Financial Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{mockFinancialData.totalRevenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{mockFinancialData.monthlyGrowth}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Outstanding Balances
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${mockFinancialData.outstandingBalances.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requires attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Booking Value
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${mockFinancialData.averageBookingValue}
                </div>
                <p className="text-xs text-muted-foreground">Per booking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Growth
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  +{mockFinancialData.monthlyGrowth}%
                </div>
                <p className="text-xs text-muted-foreground">Revenue growth</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Tour */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Tour Package</CardTitle>
              <CardDescription>
                Revenue breakdown by tour package
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFinancialData.revenueByTour.map((tour) => (
                  <div
                    key={tour.tour}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{tour.tour}</p>
                        <p className="text-sm text-gray-500">
                          {tour.bookings} bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${tour.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(
                          (tour.revenue / mockFinancialData.totalRevenue) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Revenue over time visualization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Chart placeholder</p>
                  <p className="text-sm text-gray-400">
                    Revenue trends chart will be implemented here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          {/* Booking Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Bookings
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockBookingData.totalBookings}
                </div>
                <p className="text-xs text-muted-foreground">This period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockBookingData.conversionRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Inquiries to bookings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Response Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockBookingData.averageResponseTime}
                </div>
                <p className="text-xs text-muted-foreground">
                  To customer inquiries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Customer Satisfaction
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.7/5</div>
                <p className="text-xs text-muted-foreground">Average rating</p>
              </CardContent>
            </Card>
          </div>

          {/* Booking Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Sources</CardTitle>
              <CardDescription>Where your bookings come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockBookingData.topSources.map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">{source.source}</p>
                        <p className="text-sm text-gray-500">
                          {source.bookings} bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{source.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Trends</CardTitle>
              <CardDescription>Booking activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Chart placeholder</p>
                  <p className="text-sm text-gray-400">
                    Booking trends chart will be implemented here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          {/* Agent Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Performance metrics by agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockOperationalData.agentPerformance.map((agent) => (
                  <div
                    key={agent.agent}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{agent.agent}</p>
                        <p className="text-sm text-gray-500">
                          {agent.bookings} bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${agent.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {agent.rating}/5 rating
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Email Effectiveness */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Email Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockOperationalData.emailEffectiveness.openRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average open rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Click Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockOperationalData.emailEffectiveness.clickRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average click rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockOperationalData.emailEffectiveness.conversionRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Email to booking
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tour Capacity */}
          <Card>
            <CardHeader>
              <CardTitle>Tour Capacity Utilization</CardTitle>
              <CardDescription>
                How well your tours are performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Average Utilization
                  </span>
                  <span className="text-sm font-medium">
                    {mockOperationalData.tourCapacity.averageUtilization}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${mockOperationalData.tourCapacity.averageUtilization}%`,
                    }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <p className="text-sm font-medium">Peak Season</p>
                    <p className="text-2xl font-bold">
                      {mockOperationalData.tourCapacity.peakSeasonUtilization}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Off Season</p>
                    <p className="text-2xl font-bold">
                      {mockOperationalData.tourCapacity.offSeasonUtilization}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {/* Activity Logs Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Booking Activity Logs
                  </CardTitle>
                  <CardDescription>
                    Complete history of all booking changes and operations
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={loadActivityLogs}
                  disabled={isLoadingLogs}
                  className="flex items-center gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoadingLogs ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading activity logs...</span>
                  </div>
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Activity Found</p>
                    <p className="text-sm mt-2">
                      No booking changes in the selected time period
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Header with change type badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={getChangeTypeColor(
                                log.metadata.changeType
                              )}
                            >
                              {log.metadata.changeType.toUpperCase()}
                            </Badge>
                            {(log.metadata.changeType === "bulk_update" ||
                              log.metadata.changeType === "bulk_delete" ||
                              log.metadata.changeType === "bulk_import") && (
                              <Badge variant="outline" className="bg-orange-50">
                                BULK OPERATION
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              Version {log.versionNumber}
                            </span>
                          </div>

                          {/* Booking Information */}
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {log.bookingId
                                ? `Booking #${log.bookingId}`
                                : "Booking"}
                            </span>
                          </div>

                          {/* Description */}
                          {log.metadata.changeDescription && (
                            <p className="text-sm text-muted-foreground">
                              {log.metadata.changeDescription}
                            </p>
                          )}

                          {/* Changes Summary */}
                          {log.changes && log.changes.length > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                Changes:
                              </span>{" "}
                              {log.changes.slice(0, 3).map((change, idx) => (
                                <span key={idx}>
                                  {idx > 0 && ", "}
                                  <span className="font-medium">
                                    {change.fieldName || change.fieldPath}
                                  </span>
                                  {change.oldValue !== undefined &&
                                    change.newValue !== undefined && (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        ({String(change.oldValue)} →{" "}
                                        {String(change.newValue)})
                                      </span>
                                    )}
                                </span>
                              ))}
                              {log.changes.length > 3 && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  +{log.changes.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Branch Information */}
                          {log.branchInfo && !log.branchInfo.isMainBranch && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">
                                Branch:
                              </span>
                              <Badge variant="outline">
                                {log.branchInfo.branchName || log.branchId}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Right side - User and Time */}
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 justify-end">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {log.metadata.createdByName || "Unknown User"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 justify-end text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">
                              {formatTimestamp(log.metadata.createdAt)}
                            </span>
                          </div>
                          {log.parentVersionId && (
                            <div className="text-xs text-muted-foreground">
                              Branched from v
                              {
                                activityLogs.find(
                                  (v) => v.id === log.parentVersionId
                                )?.versionNumber
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Statistics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Changes
                </CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityLogs.length}</div>
                <p className="text-xs text-muted-foreground">
                  In selected period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Creates</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {
                    activityLogs.filter(
                      (log) => log.metadata.changeType === "create"
                    ).length
                  }
                </div>
                <p className="text-xs text-muted-foreground">New bookings</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Updates</CardTitle>
                <FileText className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {
                    activityLogs.filter(
                      (log) => log.metadata.changeType === "update"
                    ).length
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Modified bookings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deletes</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {
                    activityLogs.filter(
                      (log) => log.metadata.changeType === "delete"
                    ).length
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Deleted bookings
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
          <CardDescription>Download reports in various formats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Button variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Export as PDF
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export as Excel
            </Button>
            <Button variant="outline" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
