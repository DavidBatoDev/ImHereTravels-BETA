"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import {
  Download,
  Calendar,
  MapPin,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface BookingData {
  bookingId: string;
  bookingCode: string;
  tourCode: string;
  fullName: string;
  firstName: string;
  travellerInitials: string;
  tourPackageName: string;
  tourDate: any;
  returnDate?: any;
  tourDuration: string;
  formattedDate: string;
  reservationDate: any;
  originalTourCost: number;
  discountedTourCost?: number;
  reservationFee?: number;
  paid: number;
  remainingBalance: number;
  paymentProgress: number;
  paymentPlan?: string;
  bookingStatus: string;
  fullPaymentDueDate?: any;
  fullPaymentAmount?: number;
  fullPaymentDatePaid?: any;
  p1DueDate?: string;
  p1Amount?: number;
  p1DatePaid?: any;
  p2DueDate?: string;
  p2Amount?: number;
  p2DatePaid?: any;
  p3DueDate?: string;
  p3Amount?: number;
  p3DatePaid?: any;
  p4DueDate?: string;
  p4Amount?: number;
  p4DatePaid?: any;
  sentEmailLink?: string;
  eventName?: string;
  discountRate?: number;
  bookingType: string;
  isMainBooker: boolean;
  enablePaymentReminder: boolean;
  preDeparturePack?: {
    id: string;
    fileName: string;
    originalName: string;
    fileDownloadURL: string;
    contentType: string;
    size: number;
    uploadedAt: any;
  };
}

export default function BookingStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingDocumentId = params.bookingDocumentId as string;
  const email = searchParams.get("email");

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      try {
        setLoading(true);
        const url = email
          ? `/api/public/booking/${bookingDocumentId}?email=${encodeURIComponent(
              email
            )}`
          : `/api/public/booking/${bookingDocumentId}`;

        const response = await fetch(url);
        const result = await response.json();

        if (!result.success) {
          setError(result.error || "Failed to load booking");
          return;
        }

        setBooking(result.data);
      } catch (err) {
        setError("Failed to load booking details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingDocumentId, email]);



  const handleContactSupport = () => {
    const subject = `Booking Inquiry - ${booking?.bookingId}`;
    const body = `Hello ImHereTravels Team,\n\nI have a question regarding my booking:\n\nBooking ID: ${booking?.bookingId}\nName: ${booking?.fullName}\nTour: ${booking?.tourPackageName}\n\n[Your question here]\n\nThank you!`;
    window.location.href = `mailto:support@imheretravels.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crimson-red mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-light-grey">
        <header className="bg-gradient-to-r from-crimson-red to-crimson-red/90 text-white print:bg-crimson-red">
          <div className="container mx-auto px-4 py-6">
            <Image
              src="/logos/Logo_White.svg"
              alt="ImHereTravels"
              width={180}
              height={50}
              className="h-10 w-auto"
            />
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 text-crimson-red mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || "We couldn't find the booking you're looking for."}
          </p>
          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-crimson-red hover:bg-crimson-red/90"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  const totalCost = booking.discountedTourCost || booking.originalTourCost;

  const paymentTerms: any[] = [];
  if (booking.fullPaymentDueDate) {
    paymentTerms.push({
      term: "Full Payment",
      dueDate: booking.fullPaymentDueDate,
      amount: booking.fullPaymentAmount || totalCost,
      datePaid: booking.fullPaymentDatePaid,
    });
  }
  if (booking.p1DueDate) {
    paymentTerms.push({
      term: "P1",
      dueDate: booking.p1DueDate,
      amount: booking.p1Amount || 0,
      datePaid: booking.p1DatePaid,
    });
  }
  if (booking.p2DueDate) {
    paymentTerms.push({
      term: "P2",
      dueDate: booking.p2DueDate,
      amount: booking.p2Amount || 0,
      datePaid: booking.p2DatePaid,
    });
  }
  if (booking.p3DueDate) {
    paymentTerms.push({
      term: "P3",
      dueDate: booking.p3DueDate,
      amount: booking.p3Amount || 0,
      datePaid: booking.p3DatePaid,
    });
  }
  if (booking.p4DueDate) {
    paymentTerms.push({
      term: "P4",
      dueDate: booking.p4DueDate,
      amount: booking.p4Amount || 0,
      datePaid: booking.p4DatePaid,
    });
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-20 bg-white text-gray-900 shadow-md print:shadow-none">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logos/Digital_Horizontal_Red.svg"
                alt="ImHereTravels"
                width={200}
                height={50}
                className="h-10 w-auto"
              />
            </div>
            <Button
              onClick={() => (window.location.href = "mailto:bella@imheretravels.com")}
              variant="default"
              className="bg-crimson-red hover:bg-crimson-red/90 text-white shadow-sm rounded-full px-8 text-base font-medium"
            >
              Contact Assistance
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Important Notice */}
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg print:border print:border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900 mb-1">
                Important Notice
              </h3>
              <p className="text-sm text-amber-800">
                Due to high customer demand, this booking status page might not
                be updated in real-time. Our ImHereTravels admin team is
                continuously updating booking statuses. Please allow some time
                for recent changes to reflect here. For urgent inquiries,
                contact our support team directly.
              </p>
            </div>
          </div>
        </div>

        {/* Main Layout Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left Column - Booking Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Booking Information */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-crimson-red">
                <div>
                  <h2 className="text-xl font-hk-grotesk font-bold text-gray-900 mb-1">
                    Booking Confirmation
                  </h2>
                  <p className="text-sm text-gray-600">
                    ID:{" "}
                    <span className="font-semibold text-gray-900">
                      {booking.bookingId}
                    </span>
                  </p>
                </div>
                <Badge className="bg-spring-green text-white px-4 py-1.5">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {booking.bookingStatus}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Traveler Name</p>
                  <p className="text-base font-semibold text-gray-900">
                    {booking.fullName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Tour Dates
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {booking.formattedDate}
                  </p>
                  <p className="text-xs text-gray-600">{booking.tourDuration}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Tour Package
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {booking.tourPackageName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Booking Type</p>
                  <p className="text-base font-semibold text-gray-900">
                    {booking.bookingType}
                    {booking.isMainBooker && " (Main Booker)"}
                  </p>
                </div>

                {booking.eventName && (
                  <div className="md:col-span-2">
                    <Badge className="bg-vivid-orange text-white px-3 py-1">
                      {booking.eventName} - {booking.discountRate}% OFF
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Payment Schedule */}
            {paymentTerms.length > 0 && (
              <div>
                <h2 className="text-xl font-hk-grotesk font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-crimson-red" />
                  Payment Schedule
                </h2>

                
                {/* Progress Bar Container */}
                <div className="mb-6">
                  {/* Label & Percentage Row */}
                  <div className="flex justify-end mb-1.5">
                    <span className="text-sm font-bold text-gray-900">
                      {booking.paymentProgress}%
                    </span>
                  </div>
                  
                  {/* Bar Track & Fill */}
                  <div className="relative h-4 w-full rounded-full border border-gray-200 bg-transparent overflow-hidden">
                    <div
                      className="h-full bg-crimson-red transition-all duration-500 rounded-full"
                      style={{ width: `${booking.paymentProgress}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Payment
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Due Date
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                          Amount
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Paid On
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentTerms.map((term, index) => {
                        const isPaid = !!term.datePaid;
                        const dueDate = new Date(term.dueDate);
                        const isOverdue = !isPaid && dueDate < new Date();

                        return (
                          <tr
                            key={index}
                            className="border-t border-gray-200 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4 font-semibold text-gray-900">
                              {term.term}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {format(dueDate, "MMM dd, yyyy")}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-gray-900">
                              €{term.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isPaid ? (
                                <Badge className="bg-spring-green text-white text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Paid
                                </Badge>
                              ) : isOverdue ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Overdue
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-gray-300 text-gray-700 text-xs"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {isPaid
                                ? format(
                                    new Date(term.datePaid.seconds * 1000),
                                    "MMM dd, yyyy"
                                  )
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pre-Departure Pack */}
            {booking.preDeparturePack && (
              <>
                <Separator />
                <div>
                  <h2 className="text-xl font-hk-grotesk font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <Download className="h-5 w-5 text-crimson-red" />
                    Pre-Departure Pack
                  </h2>

                  <div className="bg-royal-purple/5 border-2 border-royal-purple/20 rounded-lg p-5">
                    <div className="flex items-start gap-4">
                      <div className="bg-royal-purple/10 rounded-lg p-3">
                        <Download className="h-7 w-7 text-royal-purple" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {booking.preDeparturePack.originalName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {formatFileSize(booking.preDeparturePack.size)} •{" "}
                          {booking.preDeparturePack.contentType}
                        </p>
                        <Button
                          onClick={() =>
                            window.open(
                              booking.preDeparturePack!.fileDownloadURL,
                              "_blank"
                            )
                          }
                          className="bg-royal-purple hover:bg-royal-purple/90 text-white"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Pack
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Payment Summary & Support */}
          <div className="space-y-8">
            {/* Payment Overview */}
            <div>
              <h2 className="text-xl font-hk-grotesk font-bold text-gray-900 mb-5 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-crimson-red" />
                Payment Summary
              </h2>

              <div className="space-y-4 mb-5">
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                  <p className="text-xs text-gray-500 mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">
                    €{totalCost.toFixed(2)}
                  </p>
                  {booking.discountedTourCost && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Was: €{booking.originalTourCost.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-spring-green">
                  <p className="text-xs text-gray-600 mb-1">Amount Paid</p>
                  <p className="text-2xl font-bold text-spring-green">
                    €{booking.paid.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {booking.paymentProgress}% Complete
                  </p>
                </div>

                <div className="bg-red-50 rounded-lg p-4 border-l-4 border-crimson-red">
                  <p className="text-xs text-gray-600 mb-1">Balance Due</p>
                  <p className="text-2xl font-bold text-crimson-red">
                    €{booking.remainingBalance.toFixed(2)}
                  </p>
                  {booking.paymentPlan && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {booking.paymentPlan}
                    </p>
                  )}
                </div>
              </div>


            </div>

            <Separator />

            {/* Need Assistance */}
            <div>
              <h2 className="text-xl font-hk-grotesk font-bold text-gray-900 mb-5">
                Need Assistance?
              </h2>

              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4 flex items-start gap-4">
                  <div className="bg-crimson-red/10 rounded-lg p-2.5">
                    <Mail className="h-5 w-5 text-crimson-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Email</p>
                    <a
                      href="mailto:support@imheretravels.com"
                      className="text-sm font-semibold text-crimson-red hover:underline"
                    >
                      bella@imheretravels.com
                    </a>
                  </div>
                </div>

                <div className="bg-white border rounded-lg p-4 flex items-start gap-4">
                  <div className="bg-crimson-red/10 rounded-lg p-2.5">
                    <Phone className="h-5 w-5 text-crimson-red" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                    <p className="text-sm font-semibold text-gray-900">
                      +1 (555) 123-4567
                    </p>
                  </div>
                </div>

                {booking.sentEmailLink && (
                  <div className="bg-white border rounded-lg p-4 flex items-start gap-4">
                    <div className="bg-crimson-red/10 rounded-lg p-2.5">
                      <ExternalLink className="h-5 w-5 text-crimson-red" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">
                        Confirmation Email
                      </p>
                      <a
                        href={booking.sentEmailLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-crimson-red hover:underline flex items-center gap-1"
                      >
                        View Email
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleContactSupport}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 border-2 hover:border-crimson-red hover:bg-crimson-red/5"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">Contact Support</p>
                    <p className="text-xs text-gray-500">Send us a message</p>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-creative-midnight text-white mt-12">
        <div className="container mx-auto px-6 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <Image
                src="/logos/Logo_White.svg"
                alt="ImHereTravels"
                width={140}
                height={40}
                className="h-8 w-auto mb-3"
              />
              <p className="text-sm text-white/70">
                Creating unforgettable travel experiences since 2020.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-1.5 text-sm text-white/70">
                <li>
                  <a href="/" className="hover:text-white transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a
                    href="/tours"
                    className="hover:text-white transition-colors"
                  >
                    Our Tours
                  </a>
                </li>
                <li>
                  <a
                    href="/about"
                    className="hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Follow Us</h4>
              <p className="text-sm text-white/70">
                Stay connected for updates and special offers
              </p>
            </div>
          </div>
          <Separator className="my-6 bg-white/20" />
          <div className="text-center text-white/50 text-xs">
            <p>
              © {new Date().getFullYear()} ImHereTravels. All rights reserved.
            </p>
          </div>
        </div>
      </footer>


    </div>
  );
}
