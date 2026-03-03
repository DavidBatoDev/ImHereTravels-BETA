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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  ExternalLink,
  CheckCircle,
  Clock,
  Grid3X3,
  List,
  Send,
  Trash2,
  Plus,
  RotateCcw,
  UserCheck,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GuestInvitation } from "@/types/pre-departure-pack";
import {
  updateGuestInvitationStatus,
  deleteGuestInvitation,
} from "@/services/guest-invitations-service";
import {
  onSnapshot,
  collection,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import AddGuestInvitationModal from "./AddGuestInvitationModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GuestInvitationsSection() {
  const { toast } = useToast();
  const [guestInvitations, setGuestInvitations] = useState<GuestInvitation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "created" | "sent">(
    "all",
  );
  const [unsentCount, setUnsentCount] = useState(0);

  // Automatic sends config
  const [automaticSends, setAutomaticSends] = useState(false);
  const [configDescription, setConfigDescription] = useState("");
  const [updatingConfig, setUpdatingConfig] = useState(false);

  // Mark as sent dialog
  const [markAsSentDialogOpen, setMarkAsSentDialogOpen] = useState(false);
  const [markingInvitation, setMarkingInvitation] =
    useState<GuestInvitation | null>(null);
  const [sentEmailLink, setSentEmailLink] = useState("");
  const [sentAtDate, setSentAtDate] = useState("");
  const [sentAtTime, setSentAtTime] = useState("");
  const [marking, setMarking] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInvitation, setDeletingInvitation] =
    useState<GuestInvitation | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add modal
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Unmarking state
  const [unmarking, setUnmarking] = useState(false);

  // Load automatic sends config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configDocRef = doc(db, "config", "guest-invitation");
        const configDoc = await getDoc(configDocRef);
        if (configDoc.exists()) {
          const data = configDoc.data();
          setAutomaticSends(data?.automaticSends || false);
          setConfigDescription(data?.description || "");
        }
      } catch (error) {
        console.error("Error loading guest invitation config:", error);
      }
    };
    loadConfig();
  }, []);

  // Real-time subscription to guest invitations
  useEffect(() => {
    const q = query(
      collection(db, "guestInvitations"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GuestInvitation[];

        setGuestInvitations(data);

        const unsent = data.filter((i) => i.status === "created").length;
        setUnsentCount(unsent);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to guest invitations:", error);
        toast({
          title: "Error",
          description: "Failed to load guest invitations",
          variant: "destructive",
        });
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [toast]);

  const handleAutomaticSendsToggle = async (checked: boolean) => {
    setUpdatingConfig(true);
    try {
      const configDocRef = doc(db, "config", "guest-invitation");
      await setDoc(
        configDocRef,
        {
          automaticSends: checked,
          description: configDescription,
          lastUpdated: Timestamp.now(),
        },
        { merge: true },
      );

      setAutomaticSends(checked);

      toast({
        title: "Success",
        description: `Automatic sends ${checked ? "enabled" : "disabled"}`,
      });
    } catch (error: any) {
      console.error("Error updating config:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update automatic sends",
        variant: "destructive",
      });
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleSendEmail = async (invitation: GuestInvitation) => {
    try {
      setSendingEmailId(invitation.id);

      const sendInvitation = httpsCallable(
        functions,
        "sendGuestInvitationEmails",
      );

      const result = await sendInvitation({
        guestInvitationId: invitation.id,
      });
      const data = result.data as {
        success: boolean;
        messageId?: string;
        sentEmailLink?: string;
      };

      if (data.success) {
        toast({
          title: "✅ Email Sent",
          description: "Guest invitation email has been sent successfully",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error sending guest invitation email:", error);
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

  const handleDeleteInvitation = (invitation: GuestInvitation) => {
    setDeletingInvitation(invitation);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingInvitation) return;

    setDeleting(true);
    try {
      await deleteGuestInvitation(deletingInvitation.id);

      toast({
        title: "✅ Deleted",
        description: "Guest invitation has been deleted successfully",
        variant: "default",
      });

      setDeleteDialogOpen(false);
      setDeletingInvitation(null);
    } catch (error: any) {
      console.error("Error deleting guest invitation:", error);
      toast({
        title: "❌ Failed to Delete",
        description:
          error.message || "An error occurred while deleting the invitation",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleUnmarkAsSent = async (invitation: GuestInvitation) => {
    setUnmarking(true);
    try {
      await updateGuestInvitationStatus(invitation.id, { status: "created" });
      toast({
        title: "✅ Unmarked",
        description: "Invitation has been unmarked as sent",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error unmarking:", error);
      toast({
        title: "❌ Failed",
        description: error.message || "An error occurred while unmarking",
        variant: "destructive",
      });
    } finally {
      setUnmarking(false);
    }
  };

  const handleMarkAsSent = (invitation: GuestInvitation) => {
    setMarkingInvitation(invitation);

    const now = new Date();
    const phTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
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
    if (!markingInvitation) return;

    setMarking(true);
    try {
      const sentAtDateTime = new Date(`${sentAtDate}T${sentAtTime}`);
      await updateGuestInvitationStatus(markingInvitation.id, {
        status: "sent",
        sentEmailLink: sentEmailLink || undefined,
        sentAt: sentAtDateTime,
      });

      toast({ title: "Success", description: "Invitation marked as sent" });
      setMarkAsSentDialogOpen(false);
      setMarkingInvitation(null);
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

  const filteredInvitations = guestInvitations.filter((invitation) => {
    if (statusFilter !== "all" && invitation.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        invitation.bookingId.toLowerCase().includes(searchLower) ||
        invitation.tourPackageName.toLowerCase().includes(searchLower) ||
        invitation.recipientEmail.toLowerCase().includes(searchLower) ||
        invitation.recipientName.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header with Automatic Sends Toggle */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Guest Invitations
          </h2>
          <p className="text-muted-foreground">
            Manage guest information form invitations for 50% payment bookings
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TooltipProvider>
            <div className="flex items-center gap-3 bg-muted/50 px-4 py-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="gi-automatic-sends"
                  className="text-sm font-medium cursor-pointer whitespace-nowrap"
                >
                  Automatic Sends
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      When enabled, guest invitation emails are sent
                      automatically when a booking reaches 50% payment progress.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {updatingConfig && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
              <Switch
                id="gi-automatic-sends"
                checked={automaticSends}
                onCheckedChange={handleAutomaticSendsToggle}
                disabled={updatingConfig}
              />
            </div>
          </TooltipProvider>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="bg-gradient-to-r from-crimson-red to-crimson-red/80 hover:from-crimson-red/90 hover:to-crimson-red/70"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Guest Invitation
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
            placeholder="Search by booking ID, tour package, or email..."
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
              All Invitations
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

      {/* Invitations Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-44 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-5 w-14 bg-muted animate-pulse rounded-full ml-2 shrink-0" />
              </div>
              <div className="space-y-1.5">
                <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-3 w-36 bg-muted animate-pulse rounded" />
              <div className="flex gap-2">
                <div className="h-8 flex-1 bg-muted animate-pulse rounded" />
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredInvitations.length === 0 ? (
        <Card className="p-12 text-center">
          <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Guest Invitations</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== "all"
              ? "No invitations match your filters"
              : "Guest invitations will appear here when you add them for 50% payment bookings"}
          </p>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvitations.map((invitation) => (
            <Card key={invitation.id} className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-sm truncate">
                    {invitation.recipientName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {invitation.recipientEmail}
                  </p>
                </div>
                <Badge
                  variant={
                    invitation.status === "sent" ? "default" : "secondary"
                  }
                  className="ml-2 flex-shrink-0"
                >
                  {invitation.status === "sent" ? (
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
                <p className="font-medium text-sm line-clamp-1">
                  {invitation.tourPackageName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tour: {formatDate(invitation.tourDate)}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {invitation.bookingId}
                </p>
              </div>

              {/* Dates */}
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Created: {formatDateTime(invitation.createdAt)}</div>
                {invitation.sentAt && (
                  <div>Sent: {formatDateTime(invitation.sentAt)}</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {invitation.sentEmailLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(invitation.sentEmailLink, "_blank")
                    }
                    title="View in Gmail"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                {invitation.status === "created" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSendEmail(invitation)}
                      disabled={sendingEmailId === invitation.id}
                      title="Send Email"
                    >
                      {sendingEmailId === invitation.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      ) : (
                        <Mail className="h-3 w-3 mr-1" />
                      )}
                      Send
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsSent(invitation)}
                      title="Mark as Sent"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {invitation.status === "sent" && !invitation.sentEmailLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnmarkAsSent(invitation)}
                    disabled={unmarking}
                    title="Unmark as Sent"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteInvitation(invitation)}
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
                    Recipient
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
                {filteredInvitations.map((invitation) => (
                  <tr
                    key={invitation.id}
                    className="border-t hover:bg-muted/30"
                  >
                    <td className="p-3">
                      <p className="text-sm font-medium">
                        {invitation.recipientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invitation.recipientEmail}
                      </p>
                    </td>
                    <td className="p-3 text-sm font-mono">
                      {invitation.bookingId}
                    </td>
                    <td className="p-3 text-sm">
                      {invitation.tourPackageName}
                    </td>
                    <td className="p-3 text-sm">
                      {formatDate(invitation.tourDate)}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          invitation.status === "sent" ? "default" : "secondary"
                        }
                      >
                        {invitation.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDateTime(invitation.createdAt)}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {invitation.sentEmailLink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(invitation.sentEmailLink, "_blank")
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {invitation.status === "created" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendEmail(invitation)}
                              disabled={sendingEmailId === invitation.id}
                              title="Send Email"
                            >
                              {sendingEmailId === invitation.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsSent(invitation)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {invitation.status === "sent" &&
                          !invitation.sentEmailLink && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnmarkAsSent(invitation)}
                              disabled={unmarking}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvitation(invitation)}
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

      {/* Mark as Sent Dialog */}
      <Dialog
        open={markAsSentDialogOpen}
        onOpenChange={setMarkAsSentDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Sent</DialogTitle>
            <DialogDescription>
              Mark this guest invitation as sent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gi-sent-email-link">
                Sent Email Link (Optional)
              </Label>
              <Input
                id="gi-sent-email-link"
                type="text"
                value={sentEmailLink}
                onChange={(e) => setSentEmailLink(e.target.value)}
                placeholder="https://mail.google.com/mail/u/0/#sent/..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gi-sent-at-date">Sent Date</Label>
              <Input
                id="gi-sent-at-date"
                type="date"
                value={sentAtDate}
                onChange={(e) => setSentAtDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gi-sent-at-time">Sent Time (PH)</Label>
              <Input
                id="gi-sent-at-time"
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
            <DialogTitle>Delete Guest Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this guest invitation?
            </DialogDescription>
          </DialogHeader>
          {deletingInvitation && (
            <div className="py-4">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold">Recipient:</span>{" "}
                  {deletingInvitation.recipientName}
                </p>
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  {deletingInvitation.recipientEmail}
                </p>
                <p>
                  <span className="font-semibold">Tour Package:</span>{" "}
                  {deletingInvitation.tourPackageName}
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

      {/* Add Guest Invitation Modal */}
      <AddGuestInvitationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
    </div>
  );
}
