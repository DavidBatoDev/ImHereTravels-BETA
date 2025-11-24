"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConfirmedBooking } from "@/types/pre-departure-pack";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Download,
  ExternalLink,
  Calendar,
  Package,
  FileText,
  Mail,
} from "lucide-react";

interface ConfirmedBookingModalProps {
  booking: ConfirmedBooking | null;
  open: boolean;
  onClose: () => void;
}

export default function ConfirmedBookingModal({
  booking,
  open,
  onClose,
}: ConfirmedBookingModalProps) {
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking && open) {
      loadBookingData();
    }
  }, [booking, open]);

  const loadBookingData = async () => {
    if (!booking) return;

    setLoading(true);
    try {
      const bookingDoc = await getDoc(
        doc(db, "bookings", booking.bookingDocumentId)
      );
      if (bookingDoc.exists()) {
        setBookingData({ id: bookingDoc.id, ...bookingDoc.data() });
      }
    } catch (error) {
      console.error("Error loading booking data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: any) => {
    const num = Number(amount) || 0;
    return `€${num.toFixed(2)}`;
  };

  if (!booking) return null;

  // Determine payment plan
  const paymentPlan = bookingData?.paymentPlan || "";
  const selectedTerms: string[] = [];

  if (paymentPlan.includes("Full Payment")) {
    selectedTerms.push("Full Payment");
  } else if (paymentPlan.includes("P1")) {
    selectedTerms.push("P1");
  } else if (paymentPlan.includes("P2")) {
    selectedTerms.push("P1", "P2");
  } else if (paymentPlan.includes("P3")) {
    selectedTerms.push("P1", "P2", "P3");
  } else if (paymentPlan.includes("P4")) {
    selectedTerms.push("P1", "P2", "P3", "P4");
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Confirmed Booking Details</DialogTitle>
            <Badge
              variant={booking.status === "sent" ? "default" : "secondary"}
            >
              {booking.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Reference */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Booking Reference
                </p>
                <p className="text-2xl font-bold font-mono">
                  {booking.bookingReference}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="font-semibold">{booking.bookingId}</p>
              </div>
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading booking details...
            </div>
          ) : bookingData ? (
            <>
              {/* Customer Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Customer Information
                </h3>
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">
                        {bookingData.fullName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">
                        {bookingData.emailAddress || "N/A"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Tour Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Tour Information
                </h3>
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Tour Package
                      </p>
                      <p className="font-medium">{booking.tourPackageName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tour Date</p>
                      <p className="font-medium">
                        {formatDate(booking.tourDate)}
                      </p>
                    </div>
                    {bookingData.returnDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Return Date
                        </p>
                        <p className="font-medium">
                          {formatDate(bookingData.returnDate)}
                        </p>
                      </div>
                    )}
                    {bookingData.tourDuration && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Duration
                        </p>
                        <p className="font-medium">
                          {bookingData.tourDuration}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Pre-departure Pack */}
              {booking.preDeparturePackName && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pre-departure Pack
                  </h3>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {booking.preDeparturePackName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Attached to confirmation email
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Payment Summary */}
              <div>
                <h3 className="font-semibold mb-3">Payment Summary</h3>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">
                            Payment Term
                          </th>
                          <th className="text-left p-3 text-sm font-medium">
                            Amount
                          </th>
                          <th className="text-left p-3 text-sm font-medium">
                            Due Date
                          </th>
                          <th className="text-left p-3 text-sm font-medium">
                            Date Paid
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentPlan.includes("Full Payment") && (
                          <tr className="border-t">
                            <td className="p-3 text-sm font-medium">
                              Full Payment
                            </td>
                            <td className="p-3 text-sm">
                              {formatCurrency(bookingData.fullPaymentAmount)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.fullPaymentDueDate)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.fullPaymentDatePaid)}
                            </td>
                          </tr>
                        )}

                        {selectedTerms.includes("P1") && (
                          <tr className="border-t">
                            <td className="p-3 text-sm font-medium">P1</td>
                            <td className="p-3 text-sm">
                              {formatCurrency(bookingData.p1Amount)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.p1DueDate)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.p1DatePaid)}
                            </td>
                          </tr>
                        )}

                        {selectedTerms.includes("P2") && (
                          <tr className="border-t">
                            <td className="p-3 text-sm font-medium">P2</td>
                            <td className="p-3 text-sm">
                              {formatCurrency(bookingData.p2Amount)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.p2DueDate)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.p2DatePaid)}
                            </td>
                          </tr>
                        )}

                        {selectedTerms.includes("P3") && (
                          <tr className="border-t">
                            <td className="p-3 text-sm font-medium">P3</td>
                            <td className="p-3 text-sm">
                              {formatCurrency(bookingData.p3Amount)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.p3DueDate)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.p3DatePaid)}
                            </td>
                          </tr>
                        )}

                        {selectedTerms.includes("P4") && (
                          <tr className="border-t">
                            <td className="p-3 text-sm font-medium">P4</td>
                            <td className="p-3 text-sm">
                              {formatCurrency(bookingData.p4Amount)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.p4DueDate)}
                            </td>
                            <td className="p-3 text-sm">
                              {formatDate(bookingData.p4DatePaid)}
                            </td>
                          </tr>
                        )}

                        <tr className="border-t bg-muted/30">
                          <td colSpan={3} className="p-3 text-sm font-semibold">
                            Total Paid
                          </td>
                          <td className="p-3 text-sm font-semibold">
                            {formatCurrency(bookingData.paid)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Confirmation Email Status */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Confirmation Email Status
                </h3>
                <Card className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {formatDateTime(booking.createdAt)}
                      </p>
                    </div>
                    {booking.sentAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Sent</p>
                        <p className="font-medium">
                          {formatDateTime(booking.sentAt)}
                        </p>
                      </div>
                    )}
                  </div>
                  {booking.sentEmailLink && (
                    <div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          window.open(booking.sentEmailLink, "_blank")
                        }
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View in Gmail
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Booking data not found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
