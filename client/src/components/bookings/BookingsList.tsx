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
  DollarSign,
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
        return "bg-green-100 text-green-800";
      case "Partial":
        return "bg-yellow-100 text-yellow-800";
      case "Pending":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">Manage all bookings and reservations</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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
              <SelectTrigger>
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
            <Button variant="outline" className="w-full">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            Showing {filteredBookings.length} of {mockBookings.length} bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium border border-gray-200">
                    Booking ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium border border-gray-200">
                    Traveler
                  </th>
                  <th className="text-left py-3 px-4 font-medium border border-gray-200">
                    Tour Package
                  </th>
                  <th className="text-left py-3 px-4 font-medium border border-gray-200">
                    Tour Date
                  </th>
                  <th className="text-left py-3 px-4 font-medium border border-gray-200">
                    Payment Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium border border-gray-200">
                    Balance
                  </th>
                  <th className="text-left py-3 px-4 font-medium border border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 border border-gray-200">
                      <span className="font-mono text-sm">{booking.id}</span>
                    </td>
                    <td className="py-3 px-4 border border-gray-200">
                      <div>
                        <div className="font-medium">
                          {booking.travelerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.email}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 border border-gray-200">
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        {booking.tourPackage}
                      </div>
                    </td>
                    <td className="py-3 px-4 border border-gray-200">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                        {new Date(booking.tourDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 border border-gray-200">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          booking.paymentStatus
                        )}`}
                      >
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 border border-gray-200">
                      <div className="flex items-center">
                        <DollarSign className="mr-1 h-4 w-4 text-gray-400" />
                        <span
                          className={
                            booking.remainingBalance > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          ${booking.remainingBalance}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 border border-gray-200">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockBookings.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {mockBookings
                    .reduce((sum, booking) => sum + booking.totalAmount, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <User className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Pending Payments
                </p>
                <p className="text-2xl font-bold text-gray-900">
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
