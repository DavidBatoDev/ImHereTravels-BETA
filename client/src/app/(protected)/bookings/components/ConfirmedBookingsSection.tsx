"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  ExternalLink,
  Eye,
  CheckCircle,
  Clock,
  Copy,
  Grid3X3,
  List,
  Filter,
  Send,
  Trash2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { ConfirmedBooking } from "@/types/pre-departure-pack";
import {
  getAllConfirmedBookings,
  updateConfirmedBookingStatus,
  getUnsentConfirmedBookingsCount,
  deleteConfirmedBooking,
} from "@/services/confirmed-bookings-service";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import ConfirmedBookingModal from "./ConfirmedBookingModal";
import AddConfirmedBookingModal from "./AddConfirmedBookingModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ConfirmedBookingsSection() {
  const { toast } = useToast();
  const [confirmedBookings, setConfirmedBookings] = useState<
    ConfirmedBooking[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "created" | "sent">(
    "all"
  );
  const [unsentCount, setUnsentCount] = useState(0);

  // Modal states
  const [selectedBooking, setSelectedBooking] =
    useState<ConfirmedBooking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Mark as sent dialog
  const [markAsSentDialogOpen, setMarkAsSentDialogOpen] = useState(false);
  const [markingBooking, setMarkingBooking] = useState<ConfirmedBooking | null>(
    null
  );
  const [sentEmailLink, setSentEmailLink] = useState("");
  const [sentAtDate, setSentAtDate] = useState("");
  const [sentAtTime, setSentAtTime] = useState("");
  const [marking, setMarking] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] =
    useState<ConfirmedBooking | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add confirmed booking modal
  const [addBookingModalOpen, setAddBookingModalOpen] = useState(false);

  // Unmarking state
  const [unmarking, setUnmarking] = useState(false);

  // Real-time subscription to confirmed bookings
  useEffect(() => {
    const q = query(
      collection(db, "confirmedBookings"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bookingsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ConfirmedBooking[];

        setConfirmedBookings(bookingsData);

        // Update unsent count
        const unsent = bookingsData.filter(
          (b) => b.status === "created"
        ).length;
        setUnsentCount(unsent);

        setLoading(false);
      },
      (error) => {
        console.error("Error listening to confirmed bookings:", error);
        toast({
          title: "Error",
          description: "Failed to load confirmed bookings",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const handleViewBooking = (booking: ConfirmedBooking) => {
    setSelectedBooking(booking);
    setModalOpen(true);
  };

  const handleViewInEmail = (booking: ConfirmedBooking) => {
    if (booking.sentEmailLink) {
      window.open(booking.sentEmailLink, "_blank");
    } else {
      toast({
        title: "No Email Link",
        description: "This booking has not been sent yet",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async (booking: ConfirmedBooking) => {
    try {
      setSendingEmailId(booking.id);

      const sendEmail = httpsCallable(
        functions,
        "sendBookingConfirmationEmail"
      );

      const result = await sendEmail({ confirmedBookingId: booking.id });
      const data = result.data as {
        success: boolean;
        messageId?: string;
        sentEmailLink?: string;
      };

      if (data.success) {
        toast({
          title: "✅ Email Sent",
          description: "Booking confirmation email has been sent successfully",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "❌ Failed to Send Email",
        description:
          error.message || "An error occurred while sending the email",
        variant: "destructive",
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleDeleteBooking = (booking: ConfirmedBooking) => {
    setDeletingBooking(booking);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBooking) return;

    setDeleting(true);
    try {
      await deleteConfirmedBooking(deletingBooking.id);

      toast({
        title: "✅ Deleted",
        description: "Confirmed booking has been deleted successfully",
        variant: "default",
      });

      setDeleteDialogOpen(false);
      setDeletingBooking(null);
    } catch (error: any) {
      console.error("Error deleting booking:", error);
      toast({
        title: "❌ Failed to Delete",
        description:
          error.message || "An error occurred while deleting the booking",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleUnmarkAsSent = async (booking: ConfirmedBooking) => {
    setUnmarking(true);
    try {
      await updateConfirmedBookingStatus(booking.id, {
        status: "created",
      });

      toast({
        title: "✅ Unmarked",
        description: "Booking has been unmarked as sent",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error unmarking as sent:", error);
      toast({
        title: "❌ Failed",
        description: error.message || "An error occurred while unmarking",
        variant: "destructive",
      });
    } finally {
      setUnmarking(false);
    }
  };

  const handleMarkAsSent = (booking: ConfirmedBooking) => {
    setMarkingBooking(booking);

    // Set default date/time to now in PH timezone
    const now = new Date();
    const phTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );

    const year = phTime.getFullYear();
    const month = String(phTime.getMonth() + 1).padStart(2, "0");
    const day = String(phTime.getDate()).padStart(2, "0");
    setSentAtDate(`${year}-${month}-${day}`);

    const hours = String(phTime.getHours()).padStart(2, "0");
    const minutes = String(phTime.getMinutes()).padStart(2, "0");
    setSentAtTime(`${hours}:${minutes}`);

    setSentEmailLink("");
    setMarkAsSentDialogOpen(true);
  };

  const handleConfirmMarkAsSent = async () => {
    if (!markingBooking) return;

    setMarking(true);
    try {
      // Combine date and time
      const sentAtDateTime = new Date(`${sentAtDate}T${sentAtTime}`);

      await updateConfirmedBookingStatus(markingBooking.id, {
        status: "sent",
        sentEmailLink: sentEmailLink || undefined,
        sentAt: sentAtDateTime,
      });

      toast({
        title: "Success",
        description: "Booking marked as sent",
      });

      setMarkAsSentDialogOpen(false);
      setMarkingBooking(null);
      setSentEmailLink("");
    } catch (error: any) {
      console.error("Error marking as sent:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark as sent",
        variant: "destructive",
      });
    } finally {
      setMarking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Booking reference copied to clipboard",
    });
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

  const filteredBookings = confirmedBookings.filter((booking) => {
    // Status filter
    if (statusFilter !== "all" && booking.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        booking.bookingReference.toLowerCase().includes(searchLower) ||
        booking.bookingId.toLowerCase().includes(searchLower) ||
        booking.tourPackageName.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Confirmed Bookings
          </h2>
          <p className="text-muted-foreground">
            Manage bookings with 100% payment progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setAddBookingModalOpen(true)}
            className="bg-gradient-to-r from-crimson-red to-crimson-red/80 hover:from-crimson-red/90 hover:to-crimson-red/70"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Confirmed Booking
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by reference, booking ID, or tour package..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: any) => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All Bookings
              {unsentCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unsentCount} unsent
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="created">
              Created
              {unsentCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unsentCount}
                </Badge>
              )}
            </SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Display */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Confirmed Bookings</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all"
              ? "No bookings match your filters"
              : "Confirmed bookings will appear here when bookings reach 100% payment"}
          </p>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => copyToClipboard(booking.bookingReference)}
                      className="font-mono font-semibold text-sm hover:text-primary flex items-center gap-1"
                    >
                      {booking.bookingReference}
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.bookingId}
                  </p>
                </div>
                <Badge
                  variant={booking.status === "sent" ? "default" : "secondary"}
                >
                  {booking.status === "sent" ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sent
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Created
                    </>
                  )}
                </Badge>
              </div>

              {/* Tour Info */}
              <div>
                <p className="font-medium line-clamp-1">
                  {booking.tourPackageName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tour Date: {formatDate(booking.tourDate)}
                </p>
              </div>

              {/* Pre-departure Pack */}
              {booking.preDeparturePackName && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Pack: </span>
                  <span>{booking.preDeparturePackName}</span>
                </div>
              )}

              {/* Dates */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Created: {formatDateTime(booking.createdAt)}</div>
                {booking.sentAt && (
                  <div>Sent: {formatDateTime(booking.sentAt)}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleViewBooking(booking)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View
                </Button>
                {booking.sentEmailLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewInEmail(booking)}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                {booking.status === "created" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSendEmail(booking)}
                      disabled={sendingEmailId === booking.id}
                      title="Send Email"
                    >
                      {sendingEmailId === booking.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <Mail className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsSent(booking)}
                      title="Mark as Sent"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {booking.status === "sent" && !booking.sentEmailLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnmarkAsSent(booking)}
                    disabled={unmarking}
                    title="Unmark as Sent"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteBooking(booking)}
                  title="Delete"
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">
                    Reference
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    Booking ID
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    Tour Package
                  </th>
                  <th className="text-left p-3 text-sm font-medium">
                    Tour Date
                  </th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Created</th>
                  <th className="text-right p-3 text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <button
                        onClick={() =>
                          copyToClipboard(booking.bookingReference)
                        }
                        className="font-mono text-sm hover:text-primary flex items-center gap-1"
                      >
                        {booking.bookingReference}
                        <Copy className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="p-3 text-sm">{booking.bookingId}</td>
                    <td className="p-3 text-sm">{booking.tourPackageName}</td>
                    <td className="p-3 text-sm">
                      {formatDate(booking.tourDate)}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          booking.status === "sent" ? "default" : "secondary"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDateTime(booking.createdAt)}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewBooking(booking)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {booking.sentEmailLink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInEmail(booking)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {booking.status === "created" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendEmail(booking)}
                              disabled={sendingEmailId === booking.id}
                              title="Send Email"
                            >
                              {sendingEmailId === booking.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsSent(booking)}
                              title="Mark as Sent"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {booking.status === "sent" &&
                          !booking.sentEmailLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnmarkAsSent(booking)}
                              disabled={unmarking}
                              title="Unmark as Sent"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBooking(booking)}
                          title="Delete"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Confirmed Booking Modal */}
      <ConfirmedBookingModal
        booking={selectedBooking}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedBooking(null);
        }}
      />

      {/* Mark as Sent Dialog */}
      <Dialog
        open={markAsSentDialogOpen}
        onOpenChange={setMarkAsSentDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Sent</DialogTitle>
            <DialogDescription>
              Mark this confirmed booking as sent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sent-email-link">
                Sent Email Link (Optional)
              </Label>
              <Input
                id="sent-email-link"
                type="text"
                value={sentEmailLink}
                onChange={(e) => setSentEmailLink(e.target.value)}
                placeholder="https://mail.google.com/mail/u/0/#sent/..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sent-at-date">Sent Date</Label>
              <Input
                id="sent-at-date"
                type="date"
                value={sentAtDate}
                onChange={(e) => setSentAtDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sent-at-time">Sent Time (PH)</Label>
              <Input
                id="sent-at-time"
                type="time"
                value={sentAtTime}
                onChange={(e) => setSentAtTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkAsSentDialogOpen(false)}
              disabled={marking}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmMarkAsSent} disabled={marking}>
              {marking ? "Marking..." : "Mark as Sent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Confirmed Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this confirmed booking?
            </DialogDescription>
          </DialogHeader>
          {deletingBooking && (
            <div className="py-4">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Reference:</span>{" "}
                  {deletingBooking.bookingReference}
                </p>
                <p>
                  <span className="font-semibold">Booking ID:</span>{" "}
                  {deletingBooking.bookingId}
                </p>
                <p>
                  <span className="font-semibold">Tour Package:</span>{" "}
                  {deletingBooking.tourPackageName}
                </p>
              </div>
              <p className="mt-4 text-sm text-destructive font-medium">
                This action cannot be undone.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Confirmed Booking Modal */}
      <AddConfirmedBookingModal
        open={addBookingModalOpen}
        onClose={() => setAddBookingModalOpen(false)}
      />
    </div>
  );
}
