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
  DollarSign,
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
          <h1 className="text-3xl font-bold text-creative-midnight font-hk-grotesk">
            Dashboard
          </h1>
          <p className="text-grey text-lg">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
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
        <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-creative-midnight">
              Bookings Today
            </CardTitle>
            <div className="p-2 bg-royal-purple/20 rounded-lg">
              <Calendar className="h-4 w-4 text-royal-purple" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-creative-midnight">
              {metrics.bookingsToday}
            </div>
            <p className="text-xs text-grey">+2 from yesterday</p>
          </CardContent>
        </Card>

        <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-creative-midnight">
              Revenue Today
            </CardTitle>
            <div className="p-2 bg-spring-green/20 rounded-lg">
              <DollarSign className="h-4 w-4 text-spring-green" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-creative-midnight">
              ${metrics.revenueToday.toLocaleString()}
            </div>
            <p className="text-xs text-grey">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-creative-midnight">
              Upcoming Tours
            </CardTitle>
            <div className="p-2 bg-sunglow-yellow/20 rounded-lg">
              <Clock className="h-4 w-4 text-vivid-orange" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-creative-midnight">
              {metrics.upcomingTours}
            </div>
            <p className="text-xs text-grey">Next 7 days</p>
          </CardContent>
        </Card>

        <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-creative-midnight">
              Pending Reminders
            </CardTitle>
            <div className="p-2 bg-crimson-red/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-crimson-red" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-creative-midnight">
              {metrics.pendingReminders}
            </div>
            <p className="text-xs text-grey">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-royal-purple/20 shadow hover:border-royal-purple/40"
          >
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${action.color} shadow-lg`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg text-creative-midnight">
                  {action.title}
                </CardTitle>
              </div>
              <CardDescription className="text-grey">
                {action.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-creative-midnight">
              Booking Trends
            </CardTitle>
            <CardDescription className="text-grey">
              Last 30 days booking activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-light-grey/30 rounded-xl border border-royal-purple/20">
              <div className="text-center">
                <div className="p-3 bg-royal-purple/20 rounded-xl inline-block mb-3">
                  <TrendingUp className="h-8 w-8 text-royal-purple mx-auto" />
                </div>
                <p className="text-grey font-medium">Chart placeholder</p>
                <p className="text-sm text-grey/80 mt-1">
                  Booking trends visualization will be implemented here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-creative-midnight">
              Tour Popularity
            </CardTitle>
            <CardDescription className="text-grey">
              Most popular tour packages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-light-grey/30 rounded-xl border border-royal-purple/20">
              <div className="text-center">
                <div className="p-3 bg-spring-green/20 rounded-xl inline-block mb-3">
                  <MapPin className="h-8 w-8 text-spring-green mx-auto" />
                </div>
                <p className="text-grey font-medium">Heatmap placeholder</p>
                <p className="text-sm text-grey/80 mt-1">
                  Tour popularity heatmap will be implemented here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
        <CardHeader className="bg-light-grey/50 border-b border-royal-purple/20">
          <CardTitle className="text-creative-midnight">
            Recent Activity
          </CardTitle>
          <CardDescription className="text-grey">
            Latest bookings and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-light-grey/30 transition-colors duration-200">
              <div className="w-3 h-3 bg-spring-green rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-creative-midnight">
                  New booking created
                </p>
                <p className="text-xs text-grey">
                  John Doe - Bali Adventure Tour
                </p>
              </div>
              <span className="text-xs text-grey/80 bg-white px-2 py-1 rounded-full border border-royal-purple/20">
                2 minutes ago
              </span>
            </div>
            <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-light-grey/30 transition-colors duration-200">
              <div className="w-3 h-3 bg-royal-purple rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-creative-midnight">
                  Payment received
                </p>
                <p className="text-xs text-grey">Sarah Wilson - $1,200</p>
              </div>
              <span className="text-xs text-grey/80 bg-white px-2 py-1 rounded-full border border-royal-purple/20">
                15 minutes ago
              </span>
            </div>
            <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-light-grey/30 transition-colors duration-200">
              <div className="w-3 h-3 bg-crimson-red rounded-full shadow-sm"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-creative-midnight">
                  Payment reminder sent
                </p>
                <p className="text-xs text-grey">
                  Mike Johnson - Due in 3 days
                </p>
              </div>
              <span className="text-xs text-grey/80 bg-white px-2 py-1 rounded-full border border-royal-purple/20">
                1 hour ago
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
