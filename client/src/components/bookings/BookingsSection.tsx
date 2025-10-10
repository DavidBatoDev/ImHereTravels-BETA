"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Search, Filter, X, User, Grid3X3, List } from "lucide-react";
import { FaUser, FaMapMarkerAlt, FaPlus, FaPlane } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { BsCalendar3, BsCalendarEvent } from "react-icons/bs";
import { IoWallet } from "react-icons/io5";
import { HiTrendingUp } from "react-icons/hi";
import type { Booking } from "@/types/bookings";

// Mock data for demonstration - replace with real data
const mockBookings: Booking[] = [
  {
    id: "1",
    bookingId: "BK-2024-001",
    bookingCode: "BK001",
    tourCode: "EC-001",
    reservationDate: new Date("2024-01-15"),
    bookingType: "Individual",
    bookingStatus: "Confirmed",
    daysBetweenBookingAndTour: 45,
    isMainBooker: true,
    travellerInitials: "JD",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    emailAddress: "john.doe@example.com",
    tourPackageNameUniqueCounter: 1,
    tourPackageName: "Ecuador Adventure Tour",
    formattedDate: "Mar 1, 2024",
    tourDate: new Date("2024-03-01"),
    tourDuration: 7,
    useDiscountedTourCost: false,
    originalTourCost: 2500,
    includeBccReservation: false,
    generateEmailDraft: false,
    sendEmail: false,
    eligible2ndOfMonths: false,
    availablePaymentTerms: "FU - Full Payment",
    enablePaymentReminder: true,
    paymentProgress: 100,
    paid: 2500,
    remainingBalance: 0,
    includeBccCancellation: false,
    generateCancellationEmailDraft: false,
    sendCancellationEmail: false,
  },
  {
    id: "2",
    bookingId: "BK-2024-002",
    bookingCode: "BK002",
    tourCode: "PE-002",
    reservationDate: new Date("2024-01-20"),
    bookingType: "Group",
    bookingStatus: "Pending",
    daysBetweenBookingAndTour: 60,
    groupId: "GRP-001",
    isMainBooker: true,
    travellerInitials: "SW",
    firstName: "Sarah",
    lastName: "Wilson",
    fullName: "Sarah Wilson",
    emailAddress: "sarah.wilson@example.com",
    tourPackageNameUniqueCounter: 1,
    tourPackageName: "Peru Cultural Experience",
    formattedDate: "Mar 20, 2024",
    tourDate: new Date("2024-03-20"),
    tourDuration: 10,
    useDiscountedTourCost: true,
    originalTourCost: 3200,
    discountedTourCost: 2800,
    includeBccReservation: false,
    generateEmailDraft: false,
    sendEmail: false,
    paymentCondition: "Partial Payment",
    eligible2ndOfMonths: true,
    availablePaymentTerms: "P2 - 2 Months",
    enablePaymentReminder: true,
    paymentProgress: 50,
    paid: 1400,
    remainingBalance: 1400,
    includeBccCancellation: false,
    generateCancellationEmailDraft: false,
    sendCancellationEmail: false,
  },
  {
    id: "3",
    bookingId: "BK-2024-003",
    bookingCode: "BK003",
    tourCode: "CL-003",
    reservationDate: new Date("2024-01-25"),
    bookingType: "Individual",
    bookingStatus: "Confirmed",
    daysBetweenBookingAndTour: 90,
    isMainBooker: true,
    travellerInitials: "MJ",
    firstName: "Michael",
    lastName: "Johnson",
    fullName: "Michael Johnson",
    emailAddress: "michael.johnson@company.com",
    tourPackageNameUniqueCounter: 1,
    tourPackageName: "Chile Patagonia Trek",
    formattedDate: "Apr 25, 2024",
    tourDate: new Date("2024-04-25"),
    tourDuration: 14,
    useDiscountedTourCost: false,
    originalTourCost: 4500,
    includeBccReservation: false,
    generateEmailDraft: false,
    sendEmail: false,
    paymentCondition: "Installment",
    eligible2ndOfMonths: false,
    availablePaymentTerms: "P4 - 4 Months",
    enablePaymentReminder: true,
    paymentProgress: 25,
    paid: 1125,
    remainingBalance: 3375,
    includeBccCancellation: false,
    generateCancellationEmailDraft: false,
    sendCancellationEmail: false,
  },
];

export default function BookingsSection() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // Calculate statistics
  const totalBookings = mockBookings.length;
  const confirmedBookings = mockBookings.filter(
    (b) => b.bookingStatus === "Confirmed"
  ).length;
  const pendingBookings = mockBookings.filter(
    (b) => b.bookingStatus === "Pending"
  ).length;
  const cancelledBookings = mockBookings.filter(
    (b) => b.bookingStatus === "Cancelled"
  ).length;
  const completedBookings = mockBookings.filter(
    (b) => b.bookingStatus === "Completed"
  ).length;
  const totalRevenue = mockBookings.reduce(
    (sum, booking) => sum + booking.paid,
    0
  );
  const pendingPayments = mockBookings.reduce(
    (sum, booking) => sum + booking.remainingBalance,
    0
  );

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-spring-green/20";
      case "Pending":
        return "bg-sunglow-yellow/20";
      case "Cancelled":
        return "bg-crimson-red/20";
      case "Completed":
        return "bg-blue-500/20";
      default:
        return "bg-gray-200";
    }
  };

  const getBookingTypeBgColor = (type: string) => {
    switch (type) {
      case "Individual":
        return "bg-crimson-red/20";
      case "Group":
        return "bg-blue-500/20";
      default:
        return "bg-gray-200";
    }
  };

  const getPaymentPlanCode = (booking: Booking) => {
    // If paymentPlan exists, use it
    if (booking.paymentPlan) {
      return booking.paymentPlan.substring(0, 2).toUpperCase();
    }

    // Otherwise, extract from availablePaymentTerms
    if (booking.availablePaymentTerms) {
      const terms = booking.availablePaymentTerms.trim();
      // Get first 2 characters
      return terms.substring(0, 2).toUpperCase();
    }

    return null;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (statusFilter !== "All") count++;
    if (typeFilter !== "All") count++;
    return count;
  };

  // Filter bookings based on search and filters
  const filteredBookings = mockBookings.filter((booking) => {
    const matchesSearch =
      searchTerm === "" ||
      booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.emailAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.tourPackageName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || booking.bookingStatus === statusFilter;

    const matchesType =
      typeFilter === "All" || booking.bookingType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Statistics Cards with Add Button */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
        {/* Total Bookings */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Total Bookings
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {totalBookings}
                </p>
                {/* Breakdown */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {confirmedBookings > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-spring-green"></div>
                      <p className="text-xs text-muted-foreground">
                        Confirmed:{" "}
                        <span className="text-spring-green font-bold">
                          {confirmedBookings}
                        </span>
                      </p>
                    </div>
                  )}
                  {pendingBookings > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-vivid-orange"></div>
                      <p className="text-xs text-muted-foreground">
                        Pending:{" "}
                        <span className="text-vivid-orange font-bold">
                          {pendingBookings}
                        </span>
                      </p>
                    </div>
                  )}
                  {completedBookings > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-xs text-muted-foreground">
                        Completed:{" "}
                        <span className="text-blue-500 font-bold">
                          {completedBookings}
                        </span>
                      </p>
                    </div>
                  )}
                  {cancelledBookings > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-crimson-red"></div>
                      <p className="text-xs text-muted-foreground">
                        Cancelled:{" "}
                        <span className="text-crimson-red font-bold">
                          {cancelledBookings}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-full rounded-br-none">
                <BsCalendar3 className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue & Pending */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Revenue
                </p>
                <p className="text-2xl font-bold text-spring-green">
                  {formatCurrency(totalRevenue)}
                </p>
                {pendingPayments > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-crimson-red"></div>
                    <p className="text-xs text-muted-foreground">
                      Pending:{" "}
                      <span className="text-crimson-red font-bold">
                        {formatCurrency(pendingPayments)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gradient-to-br from-crimson-red/20 to-crimson-red/10 rounded-full rounded-br-none">
                <HiTrendingUp className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Booking Button */}
        <div className="flex items-center justify-center">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="group h-20 w-20 rounded-full rounded-br-none bg-crimson-red hover:bg-royal-purple text-white transition-all duration-300 hover:scale-105 shadow-lg relative"
            title="Add New Booking"
          >
            <FaPlus className="h-10 w-10 absolute group-hover:opacity-0 group-hover:scale-0 transition-all duration-300" />
            <span className="text-[9px] font-medium opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 whitespace-nowrap font-hk-grotesk">
              Add booking
            </span>
          </Button>
        </div>
      </div>

      {/* Search and Filters Section */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking ID, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border focus:border-crimson-red focus:ring-crimson-red/20"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Filters Button */}
            <Dialog open={showFilters} onOpenChange={setShowFilters}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-border hover:bg-crimson-red/10 hover:border-crimson-red hover:text-crimson-red"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {getActiveFiltersCount() > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 bg-crimson-red text-white"
                    >
                      {getActiveFiltersCount()}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-foreground">
                    Advanced Filters
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Booking Status
                    </Label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="border-border focus:border-crimson-red focus:ring-crimson-red/20">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Status</SelectItem>
                        <SelectItem value="Confirmed">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-spring-green"></div>
                            Confirmed
                          </div>
                        </SelectItem>
                        <SelectItem value="Pending">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-vivid-orange"></div>
                            Pending
                          </div>
                        </SelectItem>
                        <SelectItem value="Completed">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            Completed
                          </div>
                        </SelectItem>
                        <SelectItem value="Cancelled">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-crimson-red"></div>
                            Cancelled
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Booking Type
                    </Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="border-border focus:border-crimson-red focus:ring-crimson-red/20">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Types</SelectItem>
                        <SelectItem value="Individual">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Individual
                          </div>
                        </SelectItem>
                        <SelectItem value="Group">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Group
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear All Filters */}
                  {getActiveFiltersCount() > 0 && (
                    <div className="pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStatusFilter("All");
                          setTypeFilter("All");
                        }}
                        className="w-full border-border hover:bg-crimson-red/10 hover:border-crimson-red hover:text-crimson-red"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* View Mode Toggle */}
            <div className="flex border border-border rounded-md bg-background shadow-sm">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className={`rounded-r-none border-r border-border transition-colors ${
                  viewMode === "cards"
                    ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25"
                    : "hover:bg-crimson-red/10"
                }`}
                title="Card view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-l-none transition-colors ${
                  viewMode === "list"
                    ? "bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25"
                    : "hover:bg-crimson-red/10"
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Display */}
      {filteredBookings.length === 0 ? (
        <Card className="border-2 border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No bookings found
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              No bookings match your search criteria. Try adjusting your
              filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
                setTypeFilter("All");
              }}
              className="border-border hover:bg-crimson-red/10 hover:border-crimson-red hover:text-crimson-red"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredBookings.map((booking) => (
            <Card
              key={booking.id}
              className="group border border-border hover:border-crimson-red/50 transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Card Header */}
              <CardHeader className="p-3 pb-2 border-b border-border/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border-0 text-foreground px-1.5 py-0 rounded-full ${getStatusBgColor(
                          booking.bookingStatus
                        )}`}
                      >
                        {booking.bookingStatus}
                      </Badge>
                      {booking.bookingType !== "Individual" && (
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium border-0 text-foreground px-1.5 py-0 rounded-full ${getBookingTypeBgColor(
                            booking.bookingType
                          )}`}
                        >
                          {booking.bookingType}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-crimson-red transition-colors truncate font-mono">
                      {booking.bookingId}
                    </h3>
                    <CardDescription className="text-xs flex items-center gap-1 mt-0.5 truncate">
                      <MdEmail className="h-3 w-3 flex-shrink-0 text-foreground" />
                      <span className="truncate">{booking.emailAddress}</span>
                    </CardDescription>
                  </div>
                  {/* Payment Plan Code */}
                  {getPaymentPlanCode(booking) && (
                    <div className="text-2xl bg-crimson-red/10 font-bold text-crimson-red font-mono  px-2 py-1 rounded-full rounded-br-none">
                      {getPaymentPlanCode(booking)}
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* Card Content */}
              <CardContent className="p-3 pt-2 space-y-2">
                {/* Full Name */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <FaUser className="h-4 w-4 text-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Traveler
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {booking.fullName}
                    </p>
                  </div>
                </div>

                {/* Tour Package */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <FaMapMarkerAlt className="h-4 w-4 text-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Tour Package
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {booking.tourPackageName}
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <BsCalendarEvent className="h-4 w-4 text-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Reserved
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {new Date(booking.reservationDate).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <FaPlane className="h-4 w-4 text-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Tour
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {new Date(booking.tourDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <IoWallet className="h-4 w-4 text-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        Payment Status
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        booking.paymentProgress === 100
                          ? "text-spring-green"
                          : "text-crimson-red"
                      }`}
                    >
                      {booking.paymentProgress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-background/50 rounded-full h-2 mb-1.5 border border-border/30">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        booking.paymentProgress === 100
                          ? "bg-gradient-to-r from-spring-green to-spring-green/80"
                          : "bg-gradient-to-r from-crimson-red to-crimson-red/80"
                      }`}
                      style={{ width: `${booking.paymentProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-spring-green"></div>
                      <span className="text-muted-foreground">
                        Paid:{" "}
                        <span className="font-bold text-spring-green">
                          {formatCurrency(booking.paid)}
                        </span>
                      </span>
                    </div>
                    {booking.remainingBalance > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-crimson-red"></div>
                        <span className="text-muted-foreground">
                          Due:{" "}
                          <span className="font-bold text-crimson-red">
                            {formatCurrency(booking.remainingBalance)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // List View
        <Card className="border border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground text-xs">
                      Booking ID
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground text-xs">
                      Traveler
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground text-xs">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground text-xs">
                      Tour Package
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground text-xs">
                      Reserved
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground text-xs">
                      Tour Date
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground text-xs">
                      Payment
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground text-xs">
                      Plan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-border transition-colors duration-200 hover:bg-crimson-red/5 cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-semibold text-crimson-red">
                          {booking.bookingId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {booking.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MdEmail className="h-3 w-3" />
                            {booking.emailAddress}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium border-0 text-foreground px-1.5 py-0 rounded-full ${getStatusBgColor(
                            booking.bookingStatus
                          )}`}
                        >
                          {booking.bookingStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <FaMapMarkerAlt className="h-3 w-3 text-foreground" />
                          <span className="text-sm text-foreground">
                            {booking.tourPackageName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <BsCalendarEvent className="h-3 w-3 text-foreground" />
                          <span className="text-xs text-foreground">
                            {new Date(
                              booking.reservationDate
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <FaPlane className="h-3 w-3 text-foreground" />
                          <span className="text-xs text-foreground">
                            {booking.formattedDate}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-xs font-bold ${
                                booking.paymentProgress === 100
                                  ? "text-spring-green"
                                  : "text-crimson-red"
                              }`}
                            >
                              {booking.paymentProgress}%
                            </span>
                          </div>
                          <div className="w-24 bg-muted rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full ${
                                booking.paymentProgress === 100
                                  ? "bg-spring-green"
                                  : "bg-crimson-red"
                              }`}
                              style={{ width: `${booking.paymentProgress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getPaymentPlanCode(booking) && (
                          <div className="text-xs font-bold text-crimson-red font-mono bg-crimson-red/10 px-2 py-0.5 rounded-full rounded-br-none inline-block">
                            {getPaymentPlanCode(booking)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Booking Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FaPlus className="h-6 w-6 text-crimson-red" />
              Add New Booking
            </DialogTitle>
          </DialogHeader>
          <div className="py-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-6 bg-crimson-red/10 rounded-full rounded-br-none">
                <FaPlus className="h-12 w-12 text-crimson-red" />
              </div>
              <p className="text-muted-foreground text-lg">
                Booking form coming soon
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
