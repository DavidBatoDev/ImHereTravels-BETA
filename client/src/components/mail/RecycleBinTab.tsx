"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Mail, Eye, RotateCcw, Trash2, Clock } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

// Email Draft type
interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  htmlContent: string;
  bcc: string[];
  from: string;
  emailType: string;
  bookingId: string;
  status: string;
  createdAt: any;
  updatedAt: any;
  templateId?: string;
  templateVariables?: Record<string, any>;
  isCancellation?: boolean;
  fullName?: string;
  tourPackage?: string;
  deletedAt: any; // New field for soft delete
}

export default function RecycleBinTab() {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDraft, setPreviewDraft] = useState<EmailDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);

  // Subscribe to deleted email drafts
  useEffect(() => {
    const q = query(
      collection(db, "emailDrafts"),
      where("deletedAt", "!=", null),
      orderBy("deletedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const draftsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmailDraft[];
      setDrafts(draftsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredDrafts = drafts.filter((draft) => {
    const matchesSearch =
      draft.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      draft.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      draft.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      draft.tourPackage?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Group drafts by email type
  const groupedDrafts = filteredDrafts.reduce((groups, draft) => {
    const type = draft.emailType || "other";
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(draft);
    return groups;
  }, {} as Record<string, EmailDraft[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 border border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getEmailTypeColor = (emailType: string) => {
    switch (emailType) {
      case "reservation":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "cancellation":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getEmailTypeDisplay = (emailType: string) => {
    switch (emailType) {
      case "reservation":
        return {
          title: "Reservation Emails",
          description: "Booking confirmations and reservation details",
          color: "text-blue-600",
          bgColor: "bg-blue-50 border-blue-200",
        };
      case "cancellation":
        return {
          title: "Cancellation Emails",
          description: "Booking cancellations and refund information",
          color: "text-red-600",
          bgColor: "bg-red-50 border-red-200",
        };
      default:
        return {
          title: "Other Emails",
          description: "Miscellaneous email communications",
          color: "text-gray-600",
          bgColor: "bg-gray-50 border-gray-200",
        };
    }
  };

  const handleRestore = async (draft: EmailDraft) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "emailDrafts", draft.id), {
        deletedAt: null,
        updatedAt: new Date(),
      });

      toast({
        title: "Draft Restored",
        description: `"${draft.subject}" has been restored to Email Drafts.`,
      });
    } catch (error) {
      console.error("Error restoring draft:", error);
      toast({
        title: "Error",
        description: "Failed to restore draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setRestoreDialogOpen(false);
      setSelectedDraft(null);
    }
  };

  const handlePermanentDelete = async (draft: EmailDraft) => {
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, "emailDrafts", draft.id));

      toast({
        title: "Draft Deleted",
        description: `"${draft.subject}" has been permanently deleted.`,
      });
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast({
        title: "Error",
        description: "Failed to delete draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setSelectedDraft(null);
    }
  };

  if (isLoading && drafts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading deleted drafts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Recycle Bin</h2>
          <p className="text-muted-foreground mt-1">
            Restore or permanently delete email drafts
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-primary/60" />
          <Input
            placeholder="Search deleted drafts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 w-64 border-primary/20 focus:border-primary focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Grouped Drafts */}
      <div className="space-y-8">
        {Object.entries(groupedDrafts).map(([emailType, drafts]) => {
          const typeDisplay = getEmailTypeDisplay(emailType);

          return (
            <div key={emailType} className="space-y-4">
              {/* Section Header */}
              <div
                className={`w-full p-4 rounded-lg border ${typeDisplay.bgColor}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className={`text-xl font-semibold ${typeDisplay.color}`}
                    >
                      {typeDisplay.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {typeDisplay.description}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      typeDisplay.color
                    } ${typeDisplay.bgColor.replace("50", "100")}`}
                  >
                    {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Drafts Grid for this type */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {drafts.map((draft) => (
                  <Card
                    key={draft.id}
                    className="group hover:shadow-lg transition-all duration-200 border border-gray-200 shadow bg-white hover:border-gray-300"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <Mail className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base font-semibold text-foreground">
                              {draft.subject}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              To: {draft.to}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          className={`${getStatusColor(draft.status)} text-xs`}
                        >
                          {draft.status}
                        </Badge>
                        <Badge
                          className={`${getEmailTypeColor(
                            draft.emailType
                          )} text-xs`}
                        >
                          {draft.emailType}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Booking ID
                          </span>
                          <span className="font-medium text-foreground">
                            {draft.bookingId}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Customer
                          </span>
                          <span className="font-medium text-foreground">
                            {draft.fullName || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Tour</span>
                          <span className="font-medium text-foreground">
                            {draft.tourPackage || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Deleted</span>
                          <span className="font-medium text-foreground">
                            {draft.deletedAt
                              ?.toDate?.()
                              ?.toLocaleDateString?.() || "Recently"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDraft(draft)}
                          className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/10 hover:border-primary transition-all duration-200"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDraft(draft);
                            setRestoreDialogOpen(true);
                          }}
                          disabled={isLoading}
                          className="flex-1 h-8 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDraft(draft);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 border-red-200 transition-all duration-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDrafts.length === 0 && (
        <Card className="text-center py-8 border border-primary/20 shadow">
          <CardContent>
            <div className="p-3 bg-primary/20 rounded-xl inline-block mb-3">
              <Trash2 className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">
              No deleted drafts found
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm
                ? "Try adjusting your search terms."
                : "Deleted email drafts will appear here."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      {previewDraft && (
        <Dialog
          open={!!previewDraft}
          onOpenChange={() => setPreviewDraft(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {previewDraft.subject}
              </DialogTitle>
              <DialogDescription>
                Preview of deleted email draft for {previewDraft.to}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: previewDraft.htmlContent }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore "{selectedDraft?.subject}"? This
              will move it back to the Email Drafts tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedDraft && handleRestore(selectedDraft)}
              className="bg-green-600 hover:bg-green-700"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "
              {selectedDraft?.subject}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedDraft && handlePermanentDelete(selectedDraft)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
