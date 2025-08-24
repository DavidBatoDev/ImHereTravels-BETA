"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { PaymentTermsService } from "@/services/payment-terms-service";
import {
  PaymentTermConfiguration,
  PaymentTermFormData,
  PaymentPlanType,
  PAYMENT_PLAN_TYPE_LABELS,
  PAYMENT_PLAN_TYPE_DESCRIPTIONS,
  getDefaultConfigForPlanType,
} from "@/types/payment-terms";

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

const formSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    paymentPlanType: z.enum(
      [
        "invalid_booking",
        "full_payment_48hrs",
        "p1_single_installment",
        "p2_two_installments",
        "p3_three_installments",
        "p4_four_installments",
        "custom",
      ],
      {
        message: "Please select a payment plan type",
      }
    ),
    paymentType: z.enum(
      ["full_payment", "monthly_scheduled", "invalid_booking"],
      {
        message: "Please select a payment type",
      }
    ),
    daysRequired: z
      .number()
      .min(0, "Days required must be 0 or greater")
      .optional(),
    monthsRequired: z
      .number()
      .min(1, "Months required must be 1 or greater")
      .optional(),
    monthlyPercentages: z.array(z.number().min(0).max(100)).optional(),
    depositPercentage: z
      .number()
      .min(0)
      .max(100, "Deposit percentage must be between 0 and 100"),
    color: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validation for invalid booking
      if (data.paymentPlanType === "invalid_booking") {
        return (
          data.paymentType === "invalid_booking" &&
          (data.depositPercentage === 0 || data.depositPercentage === undefined)
        );
      }

      // Validation for full payment plans
      if (data.paymentPlanType === "full_payment_48hrs") {
        return (
          data.paymentType === "full_payment" &&
          data.daysRequired !== undefined &&
          data.daysRequired > 0 &&
          data.depositPercentage === 0 // Full payment must have 0% deposit
        );
      }

      // Validation for installment plans
      if (
        [
          "p1_single_installment",
          "p2_two_installments",
          "p3_three_installments",
          "p4_four_installments",
          "custom",
        ].includes(data.paymentPlanType)
      ) {
        if (data.paymentType !== "monthly_scheduled") return false;
        if (data.monthsRequired === undefined || data.monthsRequired < 1)
          return false;
        if (data.depositPercentage === undefined || data.depositPercentage < 0)
          return false;

        // Validate monthly percentages for installment plans
        if (
          data.monthlyPercentages &&
          data.monthlyPercentages.length === data.monthsRequired
        ) {
          const total = data.monthlyPercentages.reduce(
            (sum, percentage) => sum + percentage,
            0
          );
          const expectedTotal = 100 - data.depositPercentage;
          if (Math.abs(total - expectedTotal) > 0.01) {
            return false;
          }
        } else if (
          data.monthlyPercentages &&
          data.monthlyPercentages.length > 0
        ) {
          return false; // Must have exactly the right number of percentages
        }
      }

      return true;
    },
    {
      message:
        "Payment plan configuration is invalid. Please check your settings.",
      path: ["paymentPlanType"],
    }
  );

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
      paymentPlanType: "p1_single_installment",
      paymentType: "monthly_scheduled",
      daysRequired: undefined,
      monthsRequired: 1,
      monthlyPercentages: [100], // Changed from [85] to [100] to match 0% deposit
      depositPercentage: 0, // Changed from 15 to 0 - no deposit required
      color: "#3b82f6",
    },
  });

  const watchPaymentPlanType = form.watch("paymentPlanType");
  const watchPaymentType = form.watch("paymentType");
  const watchMonthsRequired = form.watch("monthsRequired");
  const watchDepositPercentage = form.watch("depositPercentage");

  // Update form when payment plan type changes
  useEffect(() => {
    if (watchPaymentPlanType) {
      const defaultConfig = getDefaultConfigForPlanType(watchPaymentPlanType);

      // Update form with default values for the selected plan type
      form.setValue("paymentType", defaultConfig.paymentType!);
      form.setValue("daysRequired", defaultConfig.daysRequired);
      form.setValue("monthsRequired", defaultConfig.monthsRequired);
      form.setValue("monthlyPercentages", defaultConfig.monthlyPercentages);
      form.setValue("depositPercentage", defaultConfig.depositPercentage!);

      // Update description if it's empty or matches a default description
      if (
        !form.getValues("description") ||
        (isCreating &&
          form.getValues("description") === paymentTerm?.description)
      ) {
        form.setValue(
          "description",
          PAYMENT_PLAN_TYPE_DESCRIPTIONS[watchPaymentPlanType]
        );
      }
    }
  }, [watchPaymentPlanType, form, paymentTerm, isCreating]);

  // Generate default monthly percentages when months required or deposit percentage changes
  useEffect(() => {
    if (
      watchPaymentType === "monthly_scheduled" &&
      watchMonthsRequired &&
      watchMonthsRequired > 0 &&
      watchDepositPercentage !== undefined
    ) {
      const currentPercentages = form.getValues("monthlyPercentages") || [];
      const remainingPercentage = 100 - watchDepositPercentage;

      // If we don't have the right number of percentages, generate them
      if (currentPercentages.length !== watchMonthsRequired) {
        const defaultPercentage = Math.floor(
          remainingPercentage / watchMonthsRequired
        );
        const remainder =
          remainingPercentage - defaultPercentage * watchMonthsRequired;

        const newPercentages =
          Array(watchMonthsRequired).fill(defaultPercentage);
        // Add remainder to the last month
        if (remainder > 0) {
          newPercentages[newPercentages.length - 1] += remainder;
        }

        form.setValue("monthlyPercentages", newPercentages);
      }
    }
  }, [watchPaymentType, watchMonthsRequired, watchDepositPercentage, form]);

  useEffect(() => {
    if (paymentTerm && !isCreating) {
      form.reset({
        name: paymentTerm.name,
        description: paymentTerm.description,
        paymentPlanType: paymentTerm.paymentPlanType || "p1_single_installment",
        paymentType: paymentTerm.paymentType || "monthly_scheduled",
        daysRequired: paymentTerm.daysRequired,
        monthsRequired: paymentTerm.monthsRequired || 1,
        monthlyPercentages: paymentTerm.monthlyPercentages || [100], // Changed from [85] to [100] to match 0% deposit
        depositPercentage: paymentTerm.depositPercentage || 0, // Changed from 15 to 0 - no deposit required
        color: paymentTerm.color || "#3b82f6",
      });
    } else if (isCreating) {
      form.reset({
        name: "",
        description: "",
        paymentPlanType: "p1_single_installment",
        paymentType: "monthly_scheduled",
        daysRequired: undefined,
        monthsRequired: 1,
        monthlyPercentages: [100], // Changed from [85] to [100] to match 0% deposit
        depositPercentage: 0, // Changed from 15 to 0 - no deposit required
        color: "#3b82f6",
      });
    }
  }, [paymentTerm, isCreating, form]);

  const onSubmit = async (data: PaymentTermFormData) => {
    try {
      setLoading(true);

      // Prepare clean data without undefined values
      const baseData = {
        name: data.name,
        description: data.description,
        paymentPlanType: data.paymentPlanType,
        paymentType: data.paymentType,
        depositPercentage: data.depositPercentage,
        color: data.color || "#3b82f6",
        isActive: paymentTerm?.isActive ?? true,
      };

      // Add conditional fields based on payment type
      const conditionalData: any = {};

      if (data.paymentType === "full_payment") {
        conditionalData.daysRequired = data.daysRequired;
      } else if (data.paymentType === "monthly_scheduled") {
        conditionalData.monthsRequired = data.monthsRequired;
        conditionalData.monthlyPercentages = data.monthlyPercentages;
      } else if (data.paymentType === "invalid_booking") {
        conditionalData.daysRequired = data.daysRequired;
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
        const nextSortOrder =
          Math.max(...existingTerms.map((t) => t.sortOrder), 0) + 1;

        await PaymentTermsService.createPaymentTerm(
          {
            ...termData,
            sortOrder: nextSortOrder,
          },
          "current-user" // Replace with actual user ID
        );

        toast({
          title: "Success",
          description: "Payment plan created successfully",
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
          description: "Payment plan updated successfully",
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Payment term operation error:", error);
      toast({
        title: "Error",
        description: isCreating
          ? "Failed to create payment plan"
          : "Failed to update payment plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isCustomPlan = watchPaymentPlanType === "custom";
  const isInstallmentPlan = [
    "p1_single_installment",
    "p2_two_installments",
    "p3_three_installments",
    "p4_four_installments",
    "custom",
  ].includes(watchPaymentPlanType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl">
            {isCreating ? "Create Payment Plan" : "Edit Payment Plan"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isCreating
              ? "Configure a new payment plan with specific terms and conditions."
              : "Update the payment plan configuration and terms."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-primary">Basic Information</h3>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Payment plan name" {...field} />
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
                      <FormLabel className="text-sm font-medium">
                        Color
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-1.5 flex-wrap">
                          {colorOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`w-6 h-6 rounded-full border-2 ${
                                option.color
                              } ${
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
                    <FormLabel className="text-sm font-medium">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain when this payment plan applies"
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

            {/* Payment Plan Type Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-primary">Payment Plan Type</h3>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              <FormField
                control={form.control}
                name="paymentPlanType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Select Payment Plan Type
                    </FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payment plan type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="invalid_booking">
                            <div className="flex items-center space-x-2">
                              <Badge variant="destructive">
                                Invalid Booking
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Tour date within 2 days
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="full_payment_48hrs">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">
                                Full Payment (2 Days)
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                2-30 days away
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="p1_single_installment">
                            <div className="flex items-center space-x-2">
                              <Badge variant="default">
                                P1 - Single Instalment
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                30-60 days away
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="p2_two_installments">
                            <div className="flex items-center space-x-2">
                              <Badge variant="default">
                                P2 - Two Instalments
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                60-90 days away
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="p3_three_installments">
                            <div className="flex items-center space-x-2">
                              <Badge variant="default">
                                P3 - Three Instalments
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                90-120 days away
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="p4_four_installments">
                            <div className="flex items-center space-x-2">
                              <Badge variant="default">
                                P4 - Four Instalments
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                120+ days away
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="custom">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">Custom Plan</Badge>
                              <span className="text-sm text-muted-foreground">
                                Custom configuration
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription className="text-xs">
                      {
                        PAYMENT_PLAN_TYPE_DESCRIPTIONS[
                          field.value as PaymentPlanType
                        ]
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Configuration Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-primary">
                  Payment Configuration
                </h3>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {/* Deposit Percentage - Only visible for installment and custom plans */}
              {!["invalid_booking", "full_payment_48hrs"].includes(
                watchPaymentPlanType
              ) && (
                <FormField
                  control={form.control}
                  name="depositPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Deposit Percentage
                      </FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            placeholder="15"
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-32"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        Deposit percentage required upfront (only for
                        installment plans)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Conditional Fields based on Payment Plan Type */}
              {watchPaymentPlanType === "invalid_booking" && (
                <FormField
                  control={form.control}
                  name="daysRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Invalid Booking Threshold (Days)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2"
                          min="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Number of days before tour date when booking becomes
                        invalid
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchPaymentPlanType === "full_payment_48hrs" && (
                <FormField
                  control={form.control}
                  name="daysRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Payment Due Within (Days)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2"
                          min="1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Number of days after booking when full payment is
                        required
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isInstallmentPlan && (
                <>
                  <FormField
                    control={form.control}
                    name="monthsRequired"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Number of Monthly Payments
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2"
                            min="1"
                            max="12"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 1)
                            }
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Number of monthly payments on the 2nd of each month
                          (excluding deposit)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Monthly Percentages Section */}
                  {watchMonthsRequired && watchMonthsRequired > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium">
                          Monthly Payment Distribution
                        </h4>
                        <div className="flex-1 border-t border-gray-200"></div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const remainingPercentage =
                                100 - watchDepositPercentage;
                              const evenPercentage = Math.floor(
                                remainingPercentage / watchMonthsRequired
                              );
                              const remainder =
                                remainingPercentage -
                                evenPercentage * watchMonthsRequired;
                              const newPercentages =
                                Array(watchMonthsRequired).fill(evenPercentage);
                              if (remainder > 0) {
                                newPercentages[newPercentages.length - 1] +=
                                  remainder;
                              }
                              form.setValue(
                                "monthlyPercentages",
                                newPercentages
                              );
                            }}
                          >
                            Auto-distribute
                          </Button>
                          <div className="text-sm">
                            Total:{" "}
                            <span
                              className={`font-semibold ${
                                Math.abs(
                                  (form
                                    .watch("monthlyPercentages")
                                    ?.reduce((sum, p) => sum + (p || 0), 0) ||
                                    0) -
                                    (100 - watchDepositPercentage)
                                ) < 0.01
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {form
                                .watch("monthlyPercentages")
                                ?.reduce((sum, p) => sum + (p || 0), 0) || 0}
                              %
                              <span className="text-muted-foreground">
                                {" "}
                                (Target: {100 - watchDepositPercentage}%)
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Array.from(
                            { length: watchMonthsRequired },
                            (_, index) => (
                              <FormField
                                key={index}
                                control={form.control}
                                name={`monthlyPercentages.${index}` as any}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium">
                                      {index + 1}
                                      {index === 0
                                        ? "st"
                                        : index === 1
                                        ? "nd"
                                        : index === 2
                                        ? "rd"
                                        : "th"}{" "}
                                      Month
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
                                            const value =
                                              parseFloat(e.target.value) || 0;
                                            const currentPercentages =
                                              form.getValues(
                                                "monthlyPercentages"
                                              ) || [];
                                            const newPercentages = [
                                              ...currentPercentages,
                                            ];
                                            newPercentages[index] = value;
                                            form.setValue(
                                              "monthlyPercentages",
                                              newPercentages
                                            );
                                          }}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                          %
                                        </span>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )
                          )}
                        </div>

                        {form.formState.errors.monthlyPercentages && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.monthlyPercentages.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

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
                  ? "Create Payment Plan"
                  : "Update Payment Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
