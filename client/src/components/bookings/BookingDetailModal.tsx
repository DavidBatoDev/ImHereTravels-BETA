"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FaUser,
  FaMapMarkerAlt,
  FaPlane,
  FaPhone,
  FaCalendarAlt,
  FaWallet,
  FaEuroSign,
  FaClock,
  FaFileInvoice,
} from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { BsCalendarEvent, BsPersonCheck } from "react-icons/bs";
import { HiTrendingUp } from "react-icons/hi";
import type { Booking } from "@/types/bookings";

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
}: BookingDetailModalProps) {
  if (!booking) return null;

  // Safe date conversion for Firebase Timestamps
  const safeDate = (value: any): Date => {
    if (value instanceof Date) {
      return value;
    }

    if (
      value &&
      typeof value === "object" &&
      value.toDate &&
      typeof value.toDate === "function"
    ) {
      return value.toDate();
    }

    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }

    return new Date();
  };

  // Safe number conversion with fallback
  const safeNumber = (value: any, fallback: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  // Get total cost for a booking with validation
  const getTotalCost = (booking: Booking) => {
    const originalCost = Number(booking.originalTourCost) || 0;
    const discountedCost = Number(booking.discountedTourCost) || 0;

    if (booking.useDiscountedTourCost && discountedCost > 0) {
      return discountedCost;
    }
    return originalCost;
  };

  // Calculate payment progress dynamically
  const calculatePaymentProgress = (booking: Booking) => {
    const totalCost = getTotalCost(booking);
    const paid = safeNumber(booking.paid, 0);

    if (totalCost === 0) return 0;

    const progress = Math.round((paid / totalCost) * 100);
    return Math.min(progress, 100);
  };

  // Helper function to determine booking status category
  const getBookingStatusCategory = (
    status: string | null | undefined
  ): string => {
    if (!status) return "Pending";

    const statusLower = status.toLowerCase();
    if (statusLower.includes("confirmed")) return "Confirmed";
    if (statusLower.includes("cancelled")) return "Cancelled";
    if (statusLower.includes("installment")) return "Pending";
    if (statusLower.includes("completed")) return "Completed";

    return "Pending";
  };

  // Get payment plan code
  const getPaymentPlanCode = (booking: Booking) => {
    if (booking.paymentPlan) {
      return booking.paymentPlan.substring(0, 2).toUpperCase();
    }

    if (booking.availablePaymentTerms) {
      const terms = booking.availablePaymentTerms.trim();
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

  const getStatusBgColor = (booking: Booking) => {
    const category = getBookingStatusCategory(booking.bookingStatus);
    switch (category) {
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

  const totalCost = getTotalCost(booking);
  const paid = safeNumber(booking.paid, 0);
  const remaining = Math.max(0, totalCost - paid);
  const progress = calculatePaymentProgress(booking);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-crimson-red/10 rounded-full rounded-br-none">
              <FaUser className="h-6 w-6 text-crimson-red" />
            </div>
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Booking Info */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-foreground">
                    {booking.bookingId}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium border-0 text-foreground px-2 py-1 rounded-full ${getStatusBgColor(
                        booking
                      )}`}
                    >
                      {getBookingStatusCategory(booking.bookingStatus)}
                    </Badge>
                    {booking.bookingType !== "Individual" && (
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border-0 text-foreground px-2 py-1 rounded-full ${getBookingTypeBgColor(
                          booking.bookingType
                        )}`}
                      >
                        {booking.bookingType}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Document ID:{" "}
                  <span className="font-mono font-semibold text-crimson-red">
                    {booking.id}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Traveler Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaUser className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {booking.fullName}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MdEmail className="h-4 w-4" />
                      {booking.emailAddress}
                    </p>
                  </div>
                </div>

                {/* Tour Package */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaMapMarkerAlt className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {booking.tourPackageName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Duration: {booking.tourDuration} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FaWallet className="h-5 w-5 text-crimson-red" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalCost)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span
                      className={`font-semibold ${
                        progress === 100
                          ? "text-spring-green"
                          : "text-crimson-red"
                      }`}
                    >
                      {progress}%
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className={`h-2 ${
                      progress === 100
                        ? "[&>div]:bg-spring-green"
                        : "[&>div]:bg-crimson-red"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-2 rounded-lg bg-spring-green/10">
                    <p className="font-semibold text-spring-green">
                      {formatCurrency(paid)}
                    </p>
                    <p className="text-muted-foreground">Paid</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-crimson-red/10">
                    <p className="font-semibold text-crimson-red">
                      {formatCurrency(remaining)}
                    </p>
                    <p className="text-muted-foreground">Remaining</p>
                  </div>
                </div>

                {getPaymentPlanCode(booking) && (
                  <div className="text-center">
                    <Badge className="bg-crimson-red/10 text-crimson-red font-mono text-lg px-4 py-2 rounded-full rounded-br-none">
                      {getPaymentPlanCode(booking)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment Plan
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dates Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BsCalendarEvent className="h-5 w-5 text-crimson-red" />
                  Reservation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaCalendarAlt className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {safeDate(booking.reservationDate).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reservation Date
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaPlane className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {safeDate(booking.tourDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">Tour Date</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaClock className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.daysBetweenBookingAndTour} days
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Days between booking and tour
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BsPersonCheck className="h-5 w-5 text-crimson-red" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaFileInvoice className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.bookingCode}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Booking Code
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaMapMarkerAlt className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.tourCode}
                    </p>
                    <p className="text-sm text-muted-foreground">Tour Code</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaUser className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.travellerInitials}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Traveler Initials
                    </p>
                  </div>
                </div>

                {booking.groupId && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <FaUser className="h-5 w-5 text-crimson-red flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {booking.groupId}
                      </p>
                      <p className="text-sm text-muted-foreground">Group ID</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <HiTrendingUp className="h-5 w-5 text-crimson-red" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaEuroSign className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.useDiscountedTourCost ? "Yes" : "No"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Discounted Tour Cost
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <FaFileInvoice className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.availablePaymentTerms || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Payment Terms
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <BsPersonCheck className="h-5 w-5 text-crimson-red flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.isMainBooker ? "Yes" : "No"}
                    </p>
                    <p className="text-sm text-muted-foreground">Main Booker</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
