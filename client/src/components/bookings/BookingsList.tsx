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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Calendar,
  Banknote,
  User,
  MapPin,
} from "lucide-react";

// Mock data - replace with real data from your backend
const mockBookings = [
  {
    id: "BK001",
    travelerName: "John Doe",
    email: "john@example.com",
    tourPackage: "Bali Adventure Tour",
    tourDate: "2024-02-15",
    paymentStatus: "Paid",
    remainingBalance: 0,
    totalAmount: 1200,
    groupSize: 2,
  },
  {
    id: "BK002",
    travelerName: "Sarah Wilson",
    email: "sarah@example.com",
    tourPackage: "Thailand Cultural Experience",
    tourDate: "2024-02-20",
    paymentStatus: "Partial",
    remainingBalance: 400,
    totalAmount: 1800,
    groupSize: 1,
  },
  {
    id: "BK003",
    travelerName: "Mike Johnson",
    email: "mike@example.com",
    tourPackage: "Vietnam Discovery",
    tourDate: "2024-02-25",
    paymentStatus: "Pending",
    remainingBalance: 900,
    totalAmount: 900,
    groupSize: 3,
  },
];

const paymentStatuses = ["All", "Paid", "Partial", "Pending"];
const tourPackages = [
  "All",
  "Bali Adventure Tour",
  "Thailand Cultural Experience",
  "Vietnam Discovery",
];

export default function BookingsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tourFilter, setTourFilter] = useState("All");

  const filteredBookings = mockBookings.filter((booking) => {
    const matchesSearch =
      booking.travelerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || booking.paymentStatus === statusFilter;
    const matchesTour =
      tourFilter === "All" || booking.tourPackage === tourFilter;

    return matchesSearch && matchesStatus && matchesTour;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-spring-green/20 text-spring-green border border-spring-green/30";
      case "Partial":
        return "bg-sunglow-yellow/20 text-vivid-orange border border-sunglow-yellow/30";
      case "Pending":
        return "bg-crimson-red/20 text-crimson-red border border-crimson-red/30";
      default:
        return "bg-grey/20 text-muted-foreground border border-grey/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-hk-grotesk">
            Bookings
          </h1>
          <p className="text-muted-foreground">
            Manage all bookings and reservations
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200">
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Filters */}
      <Card className="border border-border shadow">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="flex items-center text-foreground">
            <Filter className="mr-2 h-5 w-5 text-royal-purple" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-royal-purple/60" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border focus:border-royal-purple focus:ring-royal-purple/20"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-border focus:border-royal-purple focus:ring-royal-purple/20">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                {paymentStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tourFilter} onValueChange={setTourFilter}>
              <SelectTrigger className="border-border focus:border-royal-purple focus:ring-royal-purple/20">
                <SelectValue placeholder="Tour Package" />
              </SelectTrigger>
              <SelectContent>
                {tourPackages.map((tour) => (
                  <SelectItem key={tour} value={tour}>
                    {tour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="w-full border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="border border-border shadow">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-foreground">All Bookings</CardTitle>
          <CardDescription className="text-muted-foreground">
            Showing {filteredBookings.length} of {mockBookings.length} bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left py-4 px-6 font-semibold text-foreground border-r border-border">
                    Booking ID
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground border-r border-border">
                    Traveler
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground border-r border-border">
                    Tour Package
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground border-r border-border">
                    Tour Date
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground border-r border-border">
                    Payment Status
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground border-r border-border">
                    Balance
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking, index) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-border transition-colors duration-200 ${
                      index % 2 === 0 ? "bg-background" : "bg-muted/20"
                    } hover:bg-royal-purple/5`}
                  >
                    <td className="py-4 px-6 border-r border-border">
                      <span className="font-mono text-sm bg-royal-purple/10 text-royal-purple px-2 py-1 rounded-md">
                        {booking.id}
                      </span>
                    </td>
                    <td className="py-4 px-6 border-r border-border">
                      <div>
                        <div className="font-semibold text-foreground">
                          {booking.travelerName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r border-border">
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4 text-royal-purple" />
                        <span className="text-foreground">
                          {booking.tourPackage}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r border-border">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-royal-purple" />
                        <span className="text-foreground">
                          {new Date(booking.tourDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r border-border">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          booking.paymentStatus
                        )}`}
                      >
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 border-r border-border">
                      <div className="flex items-center">
                        <Banknote className="mr-1 h-4 w-4 text-royal-purple" />
                        <span
                          className={
                            booking.remainingBalance > 0
                              ? "text-crimson-red font-semibold"
                              : "text-spring-green font-semibold"
                          }
                        >
                          ${booking.remainingBalance}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-royal-purple hover:bg-royal-purple/10 hover:text-royal-purple transition-all duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-royal-purple hover:bg-royal-purple/10 hover:text-royal-purple transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-royal-purple/20 rounded-xl">
                <Calendar className="h-6 w-6 text-royal-purple" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {mockBookings.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-spring-green/20 rounded-xl">
                <Banknote className="h-6 w-6 text-spring-green" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-foreground">
                  €
                  {mockBookings
                    .reduce((sum, booking) => sum + booking.totalAmount, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow hover:shadow-md transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-crimson-red/20 rounded-xl">
                <User className="h-6 w-6 text-crimson-red" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Payments
                </p>
                <p className="text-2xl font-bold text-foreground">
                  $
                  {mockBookings
                    .reduce((sum, booking) => sum + booking.remainingBalance, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
