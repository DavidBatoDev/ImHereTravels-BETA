"use client";

import { useState, useEffect } from "react";
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
import {
  PaymentTermConfiguration,
  PaymentPlanType,
  PAYMENT_PLAN_TYPE_LABELS,
} from "@/types/payment-terms";
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

export default function PaymentTermsPage() {
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

  const loadPaymentTerms = async () => {
    try {
      setLoading(true);
      const terms = await PaymentTermsService.getAllPaymentTerms();
      setPaymentTerms(terms);
    } catch (error) {
      console.error("Failed to load payment terms:", error);
      toast({
        title: "Error",
        description: "Failed to load payment terms",
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
  };

  const handleEdit = (term: PaymentTermConfiguration) => {
    setSelectedTerm(term);
    setIsCreating(false);
    setDialogOpen(true);
  };

  const handleDelete = async (termId: string) => {
    try {
      await PaymentTermsService.deletePaymentTerm(termId);
      await loadPaymentTerms();
      toast({
        title: "Success",
        description: "Payment plan deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete payment plan:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment plan",
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
      ); // TODO: Replace with actual user ID
      await loadPaymentTerms();
      toast({
        title: "Success",
        description: `Payment plan ${
          !currentStatus ? "activated" : "deactivated"
        } successfully`,
      });
    } catch (error) {
      console.error("Failed to update payment plan status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment plan status",
        variant: "destructive",
      });
    }
  };

  const getTermDisplayName = (term: PaymentTermConfiguration): string => {
    // Extract a simple display name from the full name
    if (
      term.name.includes("P1 -") ||
      term.name.includes("P2 -") ||
      term.name.includes("P3 -") ||
      term.name.includes("P4 -") ||
      term.name.includes("P5 -")
    ) {
      return term.name.split(" - ")[0]; // Extract P1, P2, P3, P4, P5
    }
    if (term.name === "Invalid Booking") {
      return "Invalid";
    }
    if (term.name === "Full Payment Required Within 2 Days") {
      return "2 Days";
    }
    return term.name;
  };

  const getTermBadgeVariant = (
    term: PaymentTermConfiguration
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (term.paymentPlanType) {
      case "invalid_booking":
        return "destructive";
      case "full_payment_48hrs":
        return "secondary";
      case "custom":
        return "outline";
      default:
        return "default";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getPaymentPlanDescription = (
    term: PaymentTermConfiguration
  ): string => {
    if (term.paymentPlanType === "invalid_booking") {
      return `Tour date must be at least ${term.daysRequired} days after booking`;
    }

    if (term.paymentPlanType === "full_payment_48hrs") {
      return `Full payment due within ${term.daysRequired} days (no deposit required)`;
    }

    if (
      [
        "p1_single_installment",
        "p2_two_installments",
        "p3_three_installments",
        "p4_four_installments",
        "custom",
      ].includes(term.paymentPlanType)
    ) {
      const deposit = term.depositPercentage || 0;
      const months = term.monthsRequired || 0;
      return `${deposit}% deposit + ${months} monthly payments`;
    }

    if (term.paymentPlanType === "custom") {
      return "Custom payment configuration";
    }

    return term.description;
  };

  const onDialogSuccess = () => {
    setDialogOpen(false);
    loadPaymentTerms();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payment Plans</h1>
            <p className="text-muted-foreground">
              Manage payment terms and installment plans for tour bookings
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j}>
                      <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-5 bg-gray-200 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Plans</h1>
          <p className="text-muted-foreground">
            Manage payment terms and installment plans for tour bookings
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Payment Plan
        </Button>
      </div>

      <div className="grid gap-4">
        {paymentTerms.map((term) => (
          <Card key={term.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: term.color }}
                  />
                  <div>
                    <CardTitle className="text-lg">{term.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {getPaymentPlanDescription(term)}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getTermBadgeVariant(term)}>
                    {getTermDisplayName(term)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(term.id, term.isActive)}
                  >
                    {term.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(term)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payment Plan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{term.name}"? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(term.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                {/* Deposit Percentage */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Deposit
                  </p>
                  <p className="text-lg font-semibold">
                    {term.paymentPlanType === "invalid_booking" ||
                    term.paymentPlanType === "full_payment_48hrs"
                      ? "No Deposit"
                      : `${term.depositPercentage || 0}%`}
                  </p>
                </div>

                {/* Payment Type Specific Fields */}
                {term.paymentPlanType === "invalid_booking" && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Invalid Threshold
                    </p>
                    <p className="text-lg font-semibold">
                      &lt; {term.daysRequired || 0} days
                    </p>
                  </div>
                )}

                {term.paymentPlanType === "full_payment_48hrs" && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Payment Due
                    </p>
                    <p className="text-lg font-semibold">
                      Within {term.daysRequired || 0} days
                    </p>
                  </div>
                )}

                {[
                  "p1_single_installment",
                  "p2_two_installments",
                  "p3_three_installments",
                  "p4_four_installments",
                  "custom",
                ].includes(term.paymentPlanType) && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Payment Schedule
                      </p>
                      <p className="text-lg font-semibold">
                        {term.monthsRequired || 0} months
                      </p>
                    </div>
                    {term.monthlyPercentages &&
                      term.monthlyPercentages.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Monthly Breakdown
                          </p>
                          <p className="text-sm">
                            {term.monthlyPercentages.join("%, ")}%
                          </p>
                        </div>
                      )}
                  </>
                )}

                {/* Legacy Percentage (if exists) */}
                {term.percentage !== undefined &&
                  term.percentage !== term.depositPercentage && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Legacy Percentage
                      </p>
                      <p className="text-lg font-semibold">
                        {term.percentage}%
                      </p>
                    </div>
                  )}

                {/* Last Updated */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </p>
                  <p className="text-sm">
                    {formatDate(term.metadata.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {paymentTerms.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Payment Plans</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Get started by creating your first payment plan configuration.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Payment Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Term Dialog */}
      <PaymentTermDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        paymentTerm={selectedTerm}
        isCreating={isCreating}
        onSuccess={onDialogSuccess}
      />
    </div>
  );
}
