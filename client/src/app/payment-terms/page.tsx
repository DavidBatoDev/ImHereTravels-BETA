"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PaymentTermsService } from "@/services/payment-terms-service";
import { PaymentTermConfiguration } from "@/types/payment-terms";
import { PaymentTermDialog } from "@/components/settings/PaymentTermDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function PaymentTermsPage() {
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<PaymentTermConfiguration | null>(null);
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
      await PaymentTermsService.togglePaymentTermStatus(termId, !currentStatus, "current-user"); // Replace with actual user ID
      await loadPaymentTerms();
      toast({
        title: "Success",
        description: `Payment type ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
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
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      } else if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      } else if (timestamp && timestamp.seconds) {
        // Handle Firestore timestamp with seconds/nanoseconds
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
      }
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const onDialogSuccess = () => {
    setDialogOpen(false);
    loadPaymentTerms();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading payment types...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Terms</h1>
            <p className="text-muted-foreground">
              Manage payment types used throughout the booking system. These terms define payment conditions based on tour booking timeline.
            </p>
          </div>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Payment Type
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Terms</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentTerms.length}</div>
              <p className="text-xs text-muted-foreground">
                Available payment types
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Terms</CardTitle>
              <ToggleRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentTerms.filter(term => term.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active payment types
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Terms</CardTitle>
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentTerms.filter(term => !term.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Inactive payment types
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Terms List */}
        <div className="grid gap-4">
          {paymentTerms.map((term) => (
            <Card key={term.id} className={`${!term.isActive ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{term.name}</CardTitle>
                      <Badge 
                        variant="outline" 
                        style={{ backgroundColor: `${term.color}20`, color: term.color, borderColor: term.color }}
                      >
                        {getTermDisplayName(term)}
                      </Badge>
                      <Badge variant={term.isActive ? "default" : "secondary"}>
                        {term.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{term.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleStatus(term.id, term.isActive)}
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
                          <AlertDialogTitle>Delete Payment Type</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{term.name}"? This action cannot be undone and will affect any bookings using this payment type.
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
                  {term.paymentType === "full_payment" && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Days Before Tour</p>
                      <p className="text-lg font-semibold">
                        {term.name === 'Payment Plan P4' ? `${term.daysRequired || 0}+` : `< ${term.daysRequired || 0}`}
                      </p>
                    </div>
                  )}
                  {term.paymentType === "monthly_scheduled" && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payment Schedule</p>
                      <p className="text-lg font-semibold">{term.monthsRequired} months</p>
                    </div>
                  )}
                  {term.paymentType === "monthly_scheduled" && term.monthlyPercentages && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Monthly Breakdown</p>
                      <p className="text-sm">{term.monthlyPercentages.join("%, ")}%</p>
                    </div>
                  )}
                  {term.percentage && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Payment Percentage</p>
                      <p className="text-lg font-semibold">{term.percentage}%</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
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
              <h3 className="text-lg font-semibold mb-2">No Payment Types</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Get started by creating payment types that will be used throughout the booking system.
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Payment Type
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
    </DashboardLayout>
  );
}
