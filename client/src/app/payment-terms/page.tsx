"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PaymentTermsService } from "@/services/payment-terms-service";
import { PaymentTermConfiguration } from "@/types/payment-terms";
import { PaymentTermDialog } from "@/components/settings/PaymentTermDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PermissionGuard from "@/components/auth/PermissionGuard";

export default function PaymentTermsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermConfiguration[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] =
    useState<PaymentTermConfiguration | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadPaymentTerms();
  }, []);

  // Handle query parameters for opening dialogs
  useEffect(() => {
    const termId = searchParams.get("termId");
    const action = searchParams.get("action");
    const mode = searchParams.get("mode");

    if (termId && paymentTerms.length > 0) {
      const term = paymentTerms.find((t) => t.id === termId);
      if (term) {
        setSelectedTerm(term);
        if (mode === "edit") {
          setIsCreating(false);
          setDialogOpen(true);
        }
      }
    } else if (action === "new") {
      setSelectedTerm(null);
      setIsCreating(true);
      setDialogOpen(true);
    }
  }, [searchParams, paymentTerms]);

  const loadPaymentTerms = async () => {
    try {
      setLoading(true);
      const terms = await PaymentTermsService.getAllPaymentTerms();
      setPaymentTerms(terms);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load payment types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedTerm(null);
    setIsCreating(true);
    setDialogOpen(true);

    // Add action to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("action", "new");
    router.push(`/payment-terms?${params.toString()}`, { scroll: false });
  };

  const handleEdit = (term: PaymentTermConfiguration) => {
    setSelectedTerm(term);
    setIsCreating(false);
    setDialogOpen(true);

    // Add termId and mode to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("termId", term.id);
    params.set("mode", "edit");
    router.push(`/payment-terms?${params.toString()}`, { scroll: false });
  };

  const handleDelete = async (termId: string) => {
    try {
      await PaymentTermsService.deletePaymentTerm(termId);
      await loadPaymentTerms();
      toast({
        title: "Success",
        description: "Payment type deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment type",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (termId: string, currentStatus: boolean) => {
    try {
      await PaymentTermsService.togglePaymentTermStatus(
        termId,
        !currentStatus,
        "current-user"
      ); // Replace with actual user ID
      await loadPaymentTerms();
      toast({
        title: "Success",
        description: `Payment type ${
          !currentStatus ? "activated" : "deactivated"
        } successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment type status",
        variant: "destructive",
      });
    }
  };

  const getTermDisplayName = (term: PaymentTermConfiguration): string => {
    // Extract a simple display name from the full name
    if (term.name.includes("Payment Plan")) {
      return term.name.replace("Payment Plan ", "");
    }
    if (term.name === "Invalid Booking") {
      return "Invalid";
    }
    if (term.name === "Full Payment Required") {
      return "Full Payment";
    }
    return term.name;
  };

  const formatDate = (timestamp: any): string => {
    try {
      if (timestamp && typeof timestamp.toDate === "function") {
        return timestamp.toDate().toLocaleDateString();
      } else if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      } else if (timestamp && timestamp.seconds) {
        // Handle Firestore timestamp with seconds/nanoseconds
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      return "N/A";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const onDialogSuccess = () => {
    setDialogOpen(false);
    setSelectedTerm(null);

    // Remove URL parameters
    const params = new URLSearchParams(searchParams.toString());
    params.delete("termId");
    params.delete("action");
    params.delete("mode");
    router.push(`/payment-terms?${params.toString()}`, { scroll: false });

    loadPaymentTerms();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTerm(null);

    // Remove URL parameters
    const params = new URLSearchParams(searchParams.toString());
    params.delete("termId");
    params.delete("action");
    params.delete("mode");
    router.push(`/payment-terms?${params.toString()}`, { scroll: false });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading payment types...
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PermissionGuard permission="canManagePaymentTypes">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-hk-grotesk">
                Payment Terms
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage payment types used throughout the booking system. These
                terms define payment conditions based on tour booking timeline.
              </p>
            </div>
            <Button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Add Payment Type
            </Button>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">
                  Total Terms
                </CardTitle>
                <div className="p-2 bg-royal-purple/20 rounded-lg">
                  <Settings className="h-4 w-4 text-royal-purple" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {paymentTerms.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available payment types
                </p>
              </CardContent>
            </Card>

            <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">
                  Active Terms
                </CardTitle>
                <div className="p-2 bg-spring-green/20 rounded-lg">
                  <ToggleRight className="h-4 w-4 text-spring-green" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {paymentTerms.filter((term) => term.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active payment types
                </p>
              </CardContent>
            </Card>

            <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">
                  Inactive Terms
                </CardTitle>
                <div className="p-2 bg-grey/20 rounded-lg">
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {paymentTerms.filter((term) => !term.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Inactive payment types
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Terms List */}
          <div className="grid gap-6">
            {paymentTerms.map((term) => (
              <Card
                key={term.id}
                className={`border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200 ${
                  !term.isActive ? "opacity-60" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg text-foreground">
                          {term.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: `${term.color}20`,
                            color: term.color,
                            borderColor: term.color,
                          }}
                          className="border-2"
                        >
                          {getTermDisplayName(term)}
                        </Badge>
                        <Badge
                          variant={term.isActive ? "default" : "secondary"}
                          className={
                            term.isActive
                              ? "bg-spring-green/20 text-spring-green border border-spring-green/30"
                              : "bg-grey/20 text-muted-foreground border border-grey/30"
                          }
                        >
                          {term.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription className="text-muted-foreground">
                        {term.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleToggleStatus(term.id, term.isActive)
                        }
                        className="text-royal-purple hover:bg-royal-purple/10 hover:text-royal-purple transition-all duration-200"
                      >
                        {term.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(term)}
                        className="text-royal-purple hover:bg-royal-purple/10 hover:text-royal-purple transition-all duration-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-crimson-red hover:bg-crimson-red/10 hover:text-crimson-red transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border border-royal-purple/20 dark:border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-foreground">
                              Delete Payment Type
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Are you sure you want to delete "{term.name}"?
                              This action cannot be undone and will affect any
                              bookings using this payment type.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(term.id)}
                              className="bg-crimson-red hover:bg-crimson-red/90 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {term.paymentType === "full_payment" && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Days Before Full Payment
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {term.name === "Payment Plan P4"
                            ? `${term.daysRequired || 0}+`
                            : `< ${term.daysRequired || 0}`}
                        </p>
                      </div>
                    )}
                    {term.paymentType === "monthly_scheduled" && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Payment Schedule
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {term.monthsRequired} months
                        </p>
                      </div>
                    )}
                    {term.paymentType === "monthly_scheduled" &&
                      term.monthlyPercentages && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Monthly Breakdown
                          </p>
                          <p className="text-sm text-foreground">
                            {term.monthlyPercentages.join("%, ")}%
                          </p>
                        </div>
                      )}
                    {term.percentage && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Payment Percentage
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {term.percentage}%
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Last Updated
                      </p>
                      <p className="text-sm text-foreground">
                        {formatDate(term.metadata.updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {paymentTerms.length === 0 && (
            <Card className="border border-royal-purple/20 dark:border-border shadow">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-3 bg-royal-purple/20 rounded-xl mb-4">
                  <Settings className="h-12 w-12 text-royal-purple" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  No Payment Types
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Get started by creating payment types that will be used
                  throughout the booking system.
                </p>
                <Button
                  onClick={handleCreate}
                  className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Payment Type
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment Term Dialog */}
          <PaymentTermDialog
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            paymentTerm={selectedTerm}
            isCreating={isCreating}
            onSuccess={onDialogSuccess}
          />
        </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
