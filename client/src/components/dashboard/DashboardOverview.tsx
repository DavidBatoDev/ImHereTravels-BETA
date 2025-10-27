"use client";

import { useState, useEffect } from "react";
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
  Calendar,
  Banknote,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  FileText,
  Eye,
  MapPin,
  Users,
  CreditCard,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { collection, onSnapshot, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Booking } from "@/types/bookings";

export default function DashboardOverview() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real booking data from Firebase
  useEffect(() => {
    const bookingsQuery = query(collection(db, "bookings"));

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingData = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Convert Firebase Timestamps to JavaScript Date objects
        return {
          id: doc.id,
          ...data,
          reservationDate: data.reservationDate?.toDate
            ? data.reservationDate.toDate()
            : new Date(data.reservationDate),
          tourDate: data.tourDate?.toDate
            ? data.tourDate.toDate()
            : new Date(data.tourDate),
          returnDate: data.returnDate?.toDate
            ? data.returnDate.toDate()
            : data.returnDate
            ? new Date(data.returnDate)
            : null,
        };
      }) as Booking[];

      setBookings(bookingData);
      setIsLoading(false);
      console.log("Loaded bookings:", bookingData.length, bookingData);
    });

    return () => unsubscribe();
  }, []);

  // Helper function to determine booking status category (same as BookingsSection)
  const getBookingStatusCategory = (
    status: string | null | undefined
  ): string => {
    if (typeof status !== "string" || status.trim() === "") return "Pending";

    const statusLower = status.toLowerCase();
    if (statusLower.includes("confirmed")) return "Confirmed";
    if (statusLower.includes("cancelled")) return "Cancelled";
    if (statusLower.includes("installment")) return "Pending"; // Installments are pending payments
    if (statusLower.includes("completed")) return "Completed";

    return "Pending"; // Default fallback
  };

  // Calculate metrics from real data
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const metrics = {
    bookingsToday: bookings.filter(
      (booking) => new Date(booking.reservationDate) >= startOfToday
    ).length,
    bookingsThisWeek: bookings.filter(
      (booking) => new Date(booking.reservationDate) >= startOfWeek
    ).length,
    bookingsThisMonth: bookings.filter(
      (booking) => new Date(booking.reservationDate) >= startOfMonth
    ).length,
    totalBookings: bookings.length,
    totalRevenue: bookings.reduce(
      (sum, booking) => sum + (booking.paid || 0),
      0
    ),
    revenueToday: bookings
      .filter((booking) => new Date(booking.reservationDate) >= startOfToday)
      .reduce((sum, booking) => sum + (booking.paid || 0), 0),
    revenueThisWeek: bookings
      .filter((booking) => new Date(booking.reservationDate) >= startOfWeek)
      .reduce((sum, booking) => sum + (booking.paid || 0), 0),
    revenueThisMonth: bookings
      .filter((booking) => new Date(booking.reservationDate) >= startOfMonth)
      .reduce((sum, booking) => sum + (booking.paid || 0), 0),
    upcomingTours: bookings.filter(
      (booking) =>
        new Date(booking.tourDate) > today &&
        getBookingStatusCategory(booking.bookingStatus) === "Confirmed"
    ).length,
    pendingReminders: bookings.filter(
      (booking) => booking.enablePaymentReminder && booking.remainingBalance > 0
    ).length,
    confirmedBookings: bookings.filter(
      (booking) =>
        getBookingStatusCategory(booking.bookingStatus) === "Confirmed"
    ).length,
    pendingBookings: bookings.filter(
      (booking) => getBookingStatusCategory(booking.bookingStatus) === "Pending"
    ).length,
    cancelledBookings: bookings.filter(
      (booking) =>
        getBookingStatusCategory(booking.bookingStatus) === "Cancelled"
    ).length,
    completedBookings: bookings.filter(
      (booking) =>
        getBookingStatusCategory(booking.bookingStatus) === "Completed"
    ).length,
  };

  // Prepare chart data with fallback for empty data
  const bookingStatusData = [
    { name: "Confirmed", value: metrics.confirmedBookings, color: "#26D07C" },
    { name: "Pending", value: metrics.pendingBookings, color: "#FF8200" },
    { name: "Completed", value: metrics.completedBookings, color: "#685BC7" },
    { name: "Cancelled", value: metrics.cancelledBookings, color: "#EF3340" },
  ].filter((item) => item.value > 0);

  // If no data, show a placeholder
  if (bookingStatusData.length === 0) {
    bookingStatusData.push({ name: "No Data", value: 1, color: "#e5e5e5" });
  }

  // Monthly booking trends (last 6 months)
  const getMonthlyTrends = () => {
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthBookings = bookings.filter((booking) => {
        try {
          if (!booking.reservationDate) return false;

          let bookingDate;
          if (booking.reservationDate instanceof Date) {
            bookingDate = booking.reservationDate;
          } else {
            bookingDate = new Date(booking.reservationDate);
          }

          // Check if date is valid
          if (isNaN(bookingDate.getTime())) return false;

          return bookingDate >= monthStart && bookingDate <= monthEnd;
        } catch (error) {
          console.error(
            "Error parsing booking date:",
            booking.reservationDate,
            error
          );
          return false;
        }
      });

      const monthRevenue = monthBookings.reduce(
        (sum, booking) => sum + (booking.paid || 0),
        0
      );

      trends.push({
        month: date.toLocaleDateString("en", { month: "short" }),
        bookings: monthBookings.length,
        revenue: monthRevenue,
      });
    }
    return trends;
  };

  const monthlyTrends = getMonthlyTrends();

  // Tour package popularity
  const getTourPopularity = () => {
    if (bookings.length === 0) {
      // Return sample data for testing
      return [
        { name: "Bali Adventure", count: 5 },
        { name: "Tokyo Experience", count: 3 },
        { name: "Paris Romance", count: 2 },
      ];
    }

    const tourCount: { [key: string]: number } = {};
    bookings.forEach((booking) => {
      // Check multiple possible fields for tour name
      const tourName =
        booking.tourPackageName ||
        booking.tourPackage ||
        booking.tourName ||
        booking.tour ||
        booking.package ||
        null;

      if (tourName && tourName.trim() !== "") {
        const cleanName = tourName.trim();
        tourCount[cleanName] = (tourCount[cleanName] || 0) + 1;
      }
    });

    const popularity = Object.entries(tourCount)
      .filter(([name, count]) => count > 0) // Only include tours with bookings
      .map(([name, count]) => ({
        name: name.length > 20 ? name.substring(0, 20) + "..." : name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Show top 8

    // If no real tour data, show sample data
    if (popularity.length === 0) {
      return [
        { name: "Sample Tour A", count: 1 },
        { name: "Sample Tour B", count: 1 },
      ];
    }

    return popularity;
  };

  const tourPopularity = getTourPopularity();

  // Debug logging
  console.log("🔥 DASHBOARD DEBUG:", {
    totalBookings: bookings.length,
    tourPopularityData: tourPopularity,
    hasBookings: bookings.length > 0,
    tourPopularityLength: tourPopularity.length,
    firstFewBookings: bookings.slice(0, 3).map((b) => ({
      id: b.id,
      tourPackageName: b.tourPackageName,
      tourPackage: b.tourPackage,
      tourName: b.tourName,
      tour: b.tour,
      package: b.package,
    })),
    metrics,
    bookingStatusData,
  });

  const quickActions = [
    {
      title: "Create New Booking",
      description: "Add a new booking to the system",
      icon: Plus,
      onClick: () => router.push("/bookings"),
      color: "bg-primary",
      iconColor: "text-white",
    },
    {
      title: "View All Bookings",
      description: "Manage and view all bookings",
      icon: Eye,
      onClick: () => router.push("/bookings"),
      color: "bg-spring-green",
      iconColor: "text-white",
    },
    {
      title: "Payment Reminders",
      description: "Check pending payment reminders",
      icon: AlertTriangle,
      onClick: () => router.push("/bookings?filter=urgent"),
      color: "bg-vivid-orange",
      iconColor: "text-white",
    },
    {
      title: "Generate Report",
      description: "Create financial or booking reports",
      icon: FileText,
      onClick: () => router.push("/reports"),
      color: "bg-royal-purple",
      iconColor: "text-white",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="border border-border">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crimson-red mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg">
              Loading dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-hk-grotesk">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => router.push("/bookings")}
            className="border-border text-primary hover:bg-primary/10 hover:border-primary transition-all duration-200"
          >
            <Eye className="mr-2 h-4 w-4" />
            View All Bookings
          </Button>
          <Button
            onClick={() => router.push("/bookings")}
            className="bg-crimson-red hover:bg-crimson-red/90 text-white shadow shadow-crimson-red/25 transition-all duration-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Bookings */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Total Bookings
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {metrics.totalBookings}
                </p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-spring-green"></div>
                    <p className="text-xs text-muted-foreground">
                      Confirmed:{" "}
                      <span className="text-spring-green font-bold">
                        {metrics.confirmedBookings}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-vivid-orange"></div>
                    <p className="text-xs text-muted-foreground">
                      Pending:{" "}
                      <span className="text-vivid-orange font-bold">
                        {metrics.pendingBookings}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-crimson-red/20 rounded-xl">
                <Users className="h-6 w-6 text-crimson-red" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="border border-border hover:border-spring-green transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold text-foreground">
                  €{metrics.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-spring-green" />
                    <p className="text-xs text-spring-green font-bold">
                      This month: €{metrics.revenueThisMonth.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-spring-green/20 rounded-xl">
                <Banknote className="h-6 w-6 text-spring-green" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tours */}
        <Card className="border border-border hover:border-royal-purple transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Upcoming Tours
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {metrics.upcomingTours}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-royal-purple" />
                    <p className="text-xs text-muted-foreground">
                      Confirmed bookings
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-royal-purple/20 rounded-xl">
                <Clock className="h-6 w-6 text-royal-purple" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Reminders */}
        <Card className="border border-border hover:border-vivid-orange transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Payment Reminders
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {metrics.pendingReminders}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-vivid-orange" />
                    <p className="text-xs text-muted-foreground">
                      Require attention
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-vivid-orange/20 rounded-xl">
                <CreditCard className="h-6 w-6 text-vivid-orange" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            onClick={action.onClick}
            className="cursor-pointer hover:shadow-lg transition-all duration-300 border border-border shadow hover:border-crimson-red/40 group"
          >
            <CardContent className="p-5">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-3 rounded-xl ${action.color} shadow-lg group-hover:scale-110 transition-transform duration-200`}
                >
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm font-bold text-foreground mb-1">
                    {action.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    {action.description}
                  </CardDescription>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Booking Status Distribution */}
        <Card className="border border-border shadow hover:shadow-lg transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-crimson-red/5 to-spring-green/5 border-b border-border">
            <CardTitle className="text-foreground font-hk-grotesk">
              Booking Status Overview
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Current distribution of booking statuses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64">
              {bookings.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="p-3 bg-muted/20 rounded-xl inline-block mb-3">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      No bookings data
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Add your first booking to see the status distribution
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={bookingStatusData.length > 1 ? 5 : 0}
                      dataKey="value"
                    >
                      {bookingStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Booking Trends */}
        <Card className="border border-border shadow hover:shadow-lg transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-royal-purple/5 to-vivid-orange/5 border-b border-border">
            <CardTitle className="text-foreground font-hk-grotesk">
              Monthly Trends
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Bookings and revenue over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64">
              {bookings.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="p-3 bg-muted/20 rounded-xl inline-block mb-3">
                      <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto" />
                    </div>
                    <p className="text-muted-foreground font-medium">
                      No trends data
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Booking trends will appear once you have some bookings
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: any, name: string) => [
                        name === "revenue"
                          ? `€${value.toLocaleString()}`
                          : value,
                        name === "revenue" ? "Revenue" : "Bookings",
                      ]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      stroke="#26D07C"
                      strokeWidth={3}
                      dot={{ fill: "#26D07C", strokeWidth: 2, r: 4 }}
                      name="Bookings"
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#685BC7"
                      strokeWidth={3}
                      dot={{ fill: "#685BC7", strokeWidth: 2, r: 4 }}
                      name="Revenue (€)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tour Popularity Chart */}
      <Card className="border border-border shadow hover:shadow-lg transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-sunglow-yellow/5 to-spring-green/5 border-b border-border">
          <CardTitle className="text-foreground font-hk-grotesk">
            Most Popular Tours
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Top performing tour packages by booking count
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-80">
            {tourPopularity.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="p-3 bg-muted/20 rounded-xl inline-block mb-3">
                    <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    No tour data
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Tour popularity will show once you have bookings with tour
                    packages
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-2">
                    Debug: {bookings.length} bookings, {tourPopularity.length}{" "}
                    tours with data
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tourPopularity}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: any) => [value, "Bookings"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="#FF8200"
                    radius={[4, 4, 0, 0]}
                    name="Bookings"
                    minPointSize={5}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border border-border shadow hover:shadow-lg transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-crimson-red/5 to-royal-purple/5 border-b border-border">
          <CardTitle className="text-foreground font-hk-grotesk">
            Recent Activity
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Latest bookings and updates from your system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-3 bg-muted/20 rounded-xl inline-block mb-3">
                <Users className="h-8 w-8 text-muted-foreground mx-auto" />
              </div>
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking, index) => (
                <div
                  key={booking.id}
                  className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200 border border-transparent hover:border-border"
                >
                  <div
                    className={`w-3 h-3 rounded-full shadow-sm ${
                      booking.bookingStatus === "Confirmed"
                        ? "bg-spring-green"
                        : booking.bookingStatus === "Pending"
                        ? "bg-vivid-orange"
                        : booking.bookingStatus === "Completed"
                        ? "bg-royal-purple"
                        : "bg-crimson-red"
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {booking.bookingStatus === "Confirmed"
                        ? "Booking Confirmed"
                        : booking.bookingStatus === "Pending"
                        ? "New Booking"
                        : booking.bookingStatus === "Completed"
                        ? "Tour Completed"
                        : "Booking Cancelled"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.fullName} - {booking.tourPackageName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground/80 bg-background px-2 py-1 rounded-full border border-border">
                      {booking.remainingBalance > 0
                        ? `€${booking.remainingBalance} due`
                        : `€${booking.paid} paid`}
                    </span>
                  </div>
                </div>
              ))}
              {bookings.length > 5 && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/bookings")}
                    className="text-xs"
                  >
                    View All Bookings ({bookings.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
