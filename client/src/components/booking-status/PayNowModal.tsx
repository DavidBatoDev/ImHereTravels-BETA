"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  FileImage,
  Copy,
  CheckCircle2,
  AlertCircle,
  Building2,
  CreditCard,
  Loader2,
  Info,
} from "lucide-react";
import revolutPaymentService from "@/services/revolut-payment-service";
import {
  REVOLUT_BANK_DETAILS,
} from "@/types/revolut-payment";

interface PayNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingDocumentId: string;
  installmentTerm: "full_payment" | "p1" | "p2" | "p3" | "p4";
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  tourPackageName: string;
  /** Existing Stripe checkout handler — creates checkout session and returns URL */
  onStripeCheckout: () => void;
  stripeProcessing: boolean;
  /** Called after successful Revolut submission */
  onRevolutSubmitted: () => void;
}

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function PayNowModal({
  open,
  onOpenChange,
  bookingId,
  bookingDocumentId,
  installmentTerm,
  amount,
  currency,
  customerEmail,
  customerName,
  tourPackageName,
  onStripeCheckout,
  stripeProcessing,
  onRevolutSubmitted,
}: PayNowModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencySymbol =
    currency?.toLowerCase() === "gbp"
      ? "£"
      : currency?.toLowerCase() === "eur"
        ? "€"
        : currency?.toLowerCase() === "usd"
          ? "$"
          : currency?.toUpperCase() + " ";

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be under 5MB.");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setFilePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmitRevolutPayment = async () => {
    if (!selectedFile) {
      setError("Please upload a screenshot of your Revolut payment.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Step 1: Upload screenshot
      setUploadProgress(20);
      const screenshotData = await revolutPaymentService.uploadScreenshot(
        selectedFile,
        bookingId
      );

      setUploadProgress(50);

      // Step 2: Create revolut payment document
      const revolutPaymentDocId = await revolutPaymentService.createPayment({
        payment: {
          amount,
          currency: currency || "GBP",
          status: "pending",
          installmentTerm,
        },
        paymentScreenshot: {
          ...screenshotData,
          uploadedAt: new Date(),
        },
        customer: {
          email: customerEmail,
          firstName: customerName.split(" ")[0] || "",
          lastName: customerName.split(" ").slice(1).join(" ") || "",
        },
        tour: {
          packageName: tourPackageName,
        },
        booking: {
          id: bookingId,
          documentId: bookingDocumentId,
        },
      });

      setUploadProgress(80);

      // Step 3: Update booking document
      await revolutPaymentService.updateBookingForRevolutPayment(
        bookingDocumentId,
        revolutPaymentDocId,
        installmentTerm
      );

      setUploadProgress(100);
      setSuccess(true);

      // Notify parent and close after short delay
      setTimeout(() => {
        onRevolutSubmitted();
        resetState();
        onOpenChange(false);
      }, 2000);
    } catch (err: any) {
      console.error("Revolut payment submission error:", err);
      setError(
        err.message || "Failed to submit payment. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    setError(null);
    setSuccess(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const paymentReference = `${bookingId}-${installmentTerm.toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-hk-grotesk">
            <CreditCard className="h-5 w-5 text-crimson-red" />
            Pay {currencySymbol}{amount.toFixed(2)} — {installmentTerm === "full_payment" ? "Full Payment" : installmentTerm.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="revolut" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revolut" className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              Revolut
            </TabsTrigger>
            <TabsTrigger value="stripe" className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" />
              Stripe
            </TabsTrigger>
          </TabsList>

          {/* ─── REVOLUT TAB ─── */}
          <TabsContent value="revolut" className="space-y-5 mt-4">
            {success ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Payment Submitted!
                </h3>
                <p className="text-sm text-gray-600">
                  Your payment is now pending verification by our admin team.
                  You&apos;ll be notified once it&apos;s approved.
                </p>
              </div>
            ) : (
              <>
                {/* Step 1: Bank Account Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-crimson-red text-white text-xs font-bold">
                      1
                    </span>
                    Bank Transfer Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2.5 border border-gray-200">
                    {[
                      { label: "Account Holder", value: REVOLUT_BANK_DETAILS.accountHolder, key: "holder" },
                      { label: "IBAN", value: REVOLUT_BANK_DETAILS.iban, key: "iban" },
                      { label: "BIC / SWIFT", value: REVOLUT_BANK_DETAILS.bic, key: "bic" },
                      { label: "Sort Code", value: REVOLUT_BANK_DETAILS.sortCode, key: "sort" },
                      { label: "Account Number", value: REVOLUT_BANK_DETAILS.accountNumber, key: "account" },
                      { label: "Bank", value: REVOLUT_BANK_DETAILS.bankName, key: "bank" },
                      { label: "Reference", value: paymentReference, key: "ref" },
                      { label: "Amount", value: `${currencySymbol}${amount.toFixed(2)}`, key: "amount" },
                    ].map(({ label, value, key }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-xs text-gray-500 font-medium">
                          {label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 font-mono">
                            {value}
                          </span>
                          <button
                            onClick={() => handleCopy(value, key)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={`Copy ${label}`}
                          >
                            {copiedField === key ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Please use the exact reference above when making your
                      transfer so we can match your payment to your booking.
                    </span>
                  </div>
                </div>

                {/* Step 2: Upload Screenshot */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-crimson-red text-white text-xs font-bold">
                      2
                    </span>
                    Upload Screenshot of Revolut Payment
                  </h4>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {!selectedFile ? (
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-crimson-red/50 transition-colors cursor-pointer bg-gray-50/50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload screenshot
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, or WEBP — max 5MB
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start gap-3">
                        {filePreview && (
                          <img
                            src={filePreview}
                            alt="Payment screenshot"
                            className="w-20 h-20 object-cover rounded-md border border-gray-200"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-1.5 text-emerald-700 border-emerald-300 bg-emerald-50"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ready to upload
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="text-gray-400 hover:text-crimson-red"
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Submitting payment...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitRevolutPayment}
                  disabled={!selectedFile || uploading}
                  className="w-full bg-crimson-red hover:bg-crimson-red/90 text-white"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting Payment...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Payment
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          {/* ─── STRIPE TAB ─── */}
          <TabsContent value="stripe" className="mt-4">
            <div className="space-y-4">
              <div className="text-center py-4 space-y-3">
                <CreditCard className="h-10 w-10 text-indigo-500 mx-auto" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Pay with Card via Stripe
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    You&apos;ll be redirected to a secure Stripe checkout page to
                    complete your payment of {currencySymbol}
                    {amount.toFixed(2)}.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-gray-900">
                    {currencySymbol}{amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span className="text-gray-900">
                    {installmentTerm === "full_payment"
                      ? "Full Payment"
                      : installmentTerm.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Booking</span>
                  <span className="font-mono text-xs text-gray-900">
                    {bookingId}
                  </span>
                </div>
              </div>

              <Button
                onClick={onStripeCheckout}
                disabled={stripeProcessing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {stripeProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with Stripe
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-gray-400">
                Secured by Stripe. Supports Visa, Mastercard, Apple Pay, Google Pay.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
