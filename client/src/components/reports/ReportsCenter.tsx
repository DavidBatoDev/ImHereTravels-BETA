"use client";

import { useState } from "react";
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
} from "lucide-react";

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
