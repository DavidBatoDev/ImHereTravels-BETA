"use client";

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
} from "lucide-react";

export default function DashboardOverview() {
  // Mock data - replace with real data from your backend
  const metrics = {
    bookingsToday: 12,
    bookingsThisWeek: 45,
    bookingsThisMonth: 156,
    revenueToday: 2400,
    revenueThisWeek: 8900,
    revenueThisMonth: 32400,
    upcomingTours: 8,
    pendingReminders: 15,
  };

  const quickActions = [
    {
      title: "Create New Booking",
      description: "Add a new booking to the system",
      icon: Plus,
      href: "/bookings/new",
      color: "bg-primary",
      iconColor: "text-white",
    },
    {
      title: "View Urgent Reminders",
      description: "Check pending payment reminders",
      icon: AlertTriangle,
      href: "/bookings?filter=urgent",
      color: "bg-crimson-red",
      iconColor: "text-white",
    },
    {
      title: "Generate Report",
      description: "Create financial or booking reports",
      icon: FileText,
      href: "/reports",
      color: "bg-spring-green",
      iconColor: "text-white",
    },
  ];

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
            className="border-border text-primary hover:bg-primary/10 hover:border-primary transition-all duration-200"
          >
            <Eye className="mr-2 h-4 w-4" />
            View All Bookings
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Bookings Today
            </CardTitle>
            <div className="p-2 bg-primary/20 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.bookingsToday}
            </div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Revenue Today
            </CardTitle>
            <div className="p-2 bg-spring-green/20 rounded-lg">
              <Banknote className="h-4 w-4 text-spring-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              €{metrics.revenueToday.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Upcoming Tours
            </CardTitle>
            <div className="p-2 bg-sunglow-yellow/20 rounded-lg">
              <Clock className="h-4 w-4 text-vivid-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.upcomingTours}
            </div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Pending Reminders
            </CardTitle>
            <div className="p-2 bg-crimson-red/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-crimson-red" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.pendingReminders}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-border shadow hover:border-primary/40"
          >
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${action.color} shadow-lg`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg text-foreground">
                  {action.title}
                </CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">
                {action.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-foreground">Booking Trends</CardTitle>
            <CardDescription className="text-muted-foreground">
              Last 30 days booking activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-xl border border-border">
              <div className="text-center">
                <div className="p-3 bg-primary/20 rounded-xl inline-block mb-3">
                  <TrendingUp className="h-8 w-8 text-primary mx-auto" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Chart placeholder
                </p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  Booking trends visualization will be implemented here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-foreground">Tour Popularity</CardTitle>
            <CardDescription className="text-muted-foreground">
              Most popular tour packages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-xl border border-border">
              <div className="text-center">
                <div className="p-3 bg-spring-green/20 rounded-xl inline-block mb-3">
                  <MapPin className="h-8 w-8 text-spring-green mx-auto" />
                </div>
                <p className="text-muted-foreground font-medium">
                  Heatmap placeholder
                </p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  Tour popularity heatmap will be implemented here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <CardDescription className="text-muted-foreground">
            Latest bookings and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200">
              <div className="w-3 h-3 bg-spring-green rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  New booking created
                </p>
                <p className="text-xs text-muted-foreground">
                  John Doe - Bali Adventure Tour
                </p>
              </div>
              <span className="text-xs text-muted-foreground/80 bg-background px-2 py-1 rounded-full border border-border">
                2 minutes ago
              </span>
            </div>
            <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200">
              <div className="w-3 h-3 bg-royal-purple rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Payment received
                </p>
                <p className="text-xs text-muted-foreground">
                  Sarah Wilson - €1,200
                </p>
              </div>
              <span className="text-xs text-muted-foreground/80 bg-background px-2 py-1 rounded-full border border-border">
                15 minutes ago
              </span>
            </div>
            <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200">
              <div className="w-3 h-3 bg-crimson-red rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Payment reminder sent
                </p>
                <p className="text-xs text-muted-foreground">
                  Mike Johnson - Due in 3 days
                </p>
              </div>
              <span className="text-xs text-muted-foreground/80 bg-background px-2 py-1 rounded-full border border-border">
                1 hour ago
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
