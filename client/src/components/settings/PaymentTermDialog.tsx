"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { PaymentTermsService } from "@/services/payment-terms-service";
import { PaymentTermConfiguration, PaymentTermFormData } from "@/types/payment-terms";

const colorOptions = [
  { value: "#ef4444", label: "Red", color: "bg-red-500" },
  { value: "#f59e0b", label: "Amber", color: "bg-amber-500" },
  { value: "#3b82f6", label: "Blue", color: "bg-blue-500" },
  { value: "#8b5cf6", label: "Violet", color: "bg-violet-500" },
  { value: "#10b981", label: "Emerald", color: "bg-emerald-500" },
  { value: "#06b6d4", label: "Cyan", color: "bg-cyan-500" },
  { value: "#84cc16", label: "Lime", color: "bg-lime-500" },
  { value: "#f97316", label: "Orange", color: "bg-orange-500" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  paymentType: z.enum(["full_payment", "monthly_scheduled"], {
    message: "Please select a payment type",
  }),
  daysRequired: z.number().min(0, "Days required must be 0 or greater").optional(),
  monthsRequired: z.number().min(1, "Months required must be 1 or greater").optional(),
  monthlyPercentages: z.array(z.number().min(0).max(100)).optional(),
  color: z.string().optional(),
}).refine((data) => {
  if (data.paymentType === "full_payment" && (data.daysRequired === undefined || data.daysRequired < 0)) {
    return false;
  }
  if (data.paymentType === "monthly_scheduled") {
    if (data.monthsRequired === undefined || data.monthsRequired < 1) {
      return false;
    }
    // Validate that monthly percentages exist and add up to 100%
    if (data.monthlyPercentages && data.monthlyPercentages.length === data.monthsRequired) {
      const total = data.monthlyPercentages.reduce((sum, percentage) => sum + percentage, 0);
      if (Math.abs(total - 100) > 0.01) { // Allow for small floating point differences
        return false;
      }
    } else if (data.monthlyPercentages && data.monthlyPercentages.length > 0) {
      return false; // Must have exactly the right number of percentages
    }
  }
  return true;
}, {
  message: "Monthly percentages must add up to exactly 100%",
  path: ["monthlyPercentages"],
});

interface PaymentTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentTerm?: PaymentTermConfiguration | null;
  isCreating?: boolean;
  onSuccess: () => void;
}

export function PaymentTermDialog({
  open,
  onOpenChange,
  paymentTerm,
  isCreating = false,
  onSuccess,
}: PaymentTermDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PaymentTermFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      paymentType: "full_payment",
      daysRequired: 30,
      monthsRequired: 2,
      monthlyPercentages: [50, 50],
      color: "#3b82f6",
    },
  });

  const watchPaymentType = form.watch("paymentType");
  const watchMonthsRequired = form.watch("monthsRequired");

  useEffect(() => {
    if (paymentTerm && !isCreating) {
      form.reset({
        name: paymentTerm.name,
        description: paymentTerm.description,
        paymentType: paymentTerm.paymentType || "full_payment",
        daysRequired: paymentTerm.daysRequired || 30,
        monthsRequired: paymentTerm.monthsRequired || 2,
        monthlyPercentages: paymentTerm.monthlyPercentages || [50, 50],
        color: paymentTerm.color || "#3b82f6",
      });
    } else if (isCreating) {
      form.reset({
        name: "",
        description: "",
        paymentType: "full_payment",
        daysRequired: 30,
        monthsRequired: 2,
        monthlyPercentages: [50, 50],
        color: "#3b82f6",
      });
    }
  }, [paymentTerm, isCreating, form]);

  // Generate default monthly percentages when months required changes
  useEffect(() => {
    if (watchPaymentType === "monthly_scheduled" && watchMonthsRequired && watchMonthsRequired > 0) {
      const currentPercentages = form.getValues("monthlyPercentages") || [];
      
      // If we don't have the right number of percentages, generate them
      if (currentPercentages.length !== watchMonthsRequired) {
        const defaultPercentage = Math.floor(100 / watchMonthsRequired);
        const remainder = 100 - (defaultPercentage * watchMonthsRequired);
        
        const newPercentages = Array(watchMonthsRequired).fill(defaultPercentage);
        // Add remainder to the last month
        if (remainder > 0) {
          newPercentages[newPercentages.length - 1] += remainder;
        }
        
        form.setValue("monthlyPercentages", newPercentages);
      }
    }
  }, [watchPaymentType, watchMonthsRequired, form]);

  const onSubmit = async (data: PaymentTermFormData) => {
    try {
      setLoading(true);

      // Prepare clean data without undefined values
      const baseData = {
        name: data.name,
        description: data.description,
        paymentType: data.paymentType,
        color: data.color || "#3b82f6",
        isActive: paymentTerm?.isActive ?? true,
      };

      // Add conditional fields based on payment type
      const conditionalData: any = {};
      
      if (data.paymentType === "full_payment") {
        conditionalData.daysRequired = data.daysRequired || 30;
        // Don't include monthly fields for full payment
      } else if (data.paymentType === "monthly_scheduled") {
        conditionalData.monthsRequired = data.monthsRequired || 2;
        conditionalData.monthlyPercentages = data.monthlyPercentages || [50, 50];
        // Don't include daysRequired for monthly scheduled
      }

      // Add legacy percentage if it exists
      if (paymentTerm?.percentage !== undefined) {
        conditionalData.percentage = paymentTerm.percentage;
      }

      const termData = {
        ...baseData,
        ...conditionalData,
      };

      if (isCreating) {
        // Get the next sort order
        const existingTerms = await PaymentTermsService.getAllPaymentTerms();
        const nextSortOrder = Math.max(...existingTerms.map(t => t.sortOrder), 0) + 1;

        await PaymentTermsService.createPaymentTerm(
          {
            ...termData,
            sortOrder: nextSortOrder,
          },
          "current-user" // Replace with actual user ID
        );

        toast({
          title: "Success",
          description: "Payment type created successfully",
        });
      } else if (paymentTerm) {
        await PaymentTermsService.updatePaymentTerm(
          {
            id: paymentTerm.id,
            ...termData,
          },
          "current-user" // Replace with actual user ID
        );

        toast({
          title: "Success",
          description: "Payment type updated successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Payment term operation error:", error);
      toast({
        title: "Error",
        description: isCreating 
          ? "Failed to create payment type" 
          : "Failed to update payment type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl">
            {isCreating ? "Create Payment Type" : "Edit Payment Type"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isCreating
              ? "Configure a new payment type with specific terms and conditions."
              : "Update the payment type configuration and terms."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold">Basic Information</h3>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Payment term name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-1.5 flex-wrap">
                          {colorOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`w-6 h-6 rounded-full border-2 ${option.color} ${
                                field.value === option.value
                                  ? "border-gray-900 ring-2 ring-gray-900"
                                  : "border-gray-300"
                              }`}
                              onClick={() => field.onChange(option.value)}
                              title={option.label}
                            />
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain when this payment type applies"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Configuration Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold">Payment Configuration</h3>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>
              
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Payment Type</FormLabel>
                      <FormDescription className="text-xs">
                        {field.value === "full_payment" 
                          ? "Full payment required within specified days" 
                          : "Scheduled monthly payments on the 2nd of each month"}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${field.value === "full_payment" ? "font-medium" : "text-muted-foreground"}`}>
                          Full Payment
                        </span>
                        <Switch
                          checked={field.value === "monthly_scheduled"}
                          onCheckedChange={(checked) => {
                            field.onChange(checked ? "monthly_scheduled" : "full_payment");
                            // Reset the other field when switching
                            if (checked) {
                              form.setValue("daysRequired", 30); // Keep a default value
                              form.setValue("monthsRequired", 2);
                              form.setValue("monthlyPercentages", [50, 50]); // Default 50/50 split
                            } else {
                              form.setValue("monthsRequired", 2); // Keep a default value
                              form.setValue("monthlyPercentages", [50, 50]); // Keep a default value
                              form.setValue("daysRequired", 30);
                            }
                          }}
                        />
                        <span className={`text-xs ${field.value === "monthly_scheduled" ? "font-medium" : "text-muted-foreground"}`}>
                          2nd of Month
                        </span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Conditional Fields */}
              <div className="grid grid-cols-1 gap-4">
                {watchPaymentType === "full_payment" && (
                  <FormField
                    control={form.control}
                    name="daysRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Days Required for Full Payment</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="30"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Number of days before tour date when full payment is required
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchPaymentType === "monthly_scheduled" && (
                  <FormField
                    control={form.control}
                    name="monthsRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Months Required</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2"
                            min="1"
                            max="12"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Number of monthly payments on the 2nd of each month
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
            {/* Monthly Percentages Section */}
            {watchPaymentType === "monthly_scheduled" && watchMonthsRequired && watchMonthsRequired > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold">Monthly Payment Distribution</h3>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const evenPercentage = Math.floor(100 / watchMonthsRequired);
                        const remainder = 100 - (evenPercentage * watchMonthsRequired);
                        const newPercentages = Array(watchMonthsRequired).fill(evenPercentage);
                        if (remainder > 0) {
                          newPercentages[newPercentages.length - 1] += remainder;
                        }
                        form.setValue("monthlyPercentages", newPercentages);
                      }}
                    >
                      Auto-distribute
                    </Button>
                    <div className="text-sm">
                      Total: <span className={`font-semibold ${
                        Math.abs((form.watch("monthlyPercentages")?.reduce((sum, p) => sum + (p || 0), 0) || 0) - 100) < 0.01 
                          ? "text-green-600" 
                          : "text-red-600"
                      }`}>
                        {form.watch("monthlyPercentages")?.reduce((sum, p) => sum + (p || 0), 0) || 0}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Array.from({ length: watchMonthsRequired }, (_, index) => (
                      <FormField
                        key={index}
                        control={form.control}
                        name={`monthlyPercentages.${index}` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium">
                              {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Month
                            </FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-1">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="h-8"
                                  {...field}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    const currentPercentages = form.getValues("monthlyPercentages") || [];
                                    const newPercentages = [...currentPercentages];
                                    newPercentages[index] = value;
                                    form.setValue("monthlyPercentages", newPercentages);
                                  }}
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  
                  {form.formState.errors.monthlyPercentages && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.monthlyPercentages.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? isCreating
                    ? "Creating..."
                    : "Updating..."
                  : isCreating
                  ? "Create Payment Type"
                  : "Update Payment Type"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
