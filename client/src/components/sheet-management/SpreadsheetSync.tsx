"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Database,
} from "lucide-react";
import { googleSheetsSyncService } from "@/services/google-sheets-sync-service";
import { csvImportService } from "@/services/csv-import-service";

interface SpreadsheetSyncProps {
  onSyncComplete?: (info: { expectedRows: number }) => void;
  trigger?: React.ReactNode;
}

export default function SpreadsheetSync({
  onSyncComplete,
  trigger,
}: SpreadsheetSyncProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sheetName, setSheetName] = useState("Main Dashboard");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [step, setStep] = useState<"input" | "syncing" | "complete">("input");
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    validRows?: number;
  } | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setSheetName("Main Dashboard");
    setIsSyncing(false);
    setSyncProgress(0);
    setStep("input");
    setSyncResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const handleConfirmSync = async () => {
    setStep("syncing");
    setIsSyncing(true);
    setSyncProgress(0);

    try {
      // Step 1: Download CSV from Google Sheets
      setSyncProgress(20);
      const csvFile = await googleSheetsSyncService.downloadCSVAsFile(
        sheetName || "Main Dashboard"
      );

      // Step 2: Pass CSV to existing import service
      setSyncProgress(40);
      const result = await csvImportService.importCSV(csvFile);

      setSyncProgress(100);
      setSyncResult({
        success: result.success,
        message: result.message,
        validRows: result.data?.validRows,
      });

      if (result.success) {
        setStep("complete");
        toast({
          title: "Sync Successful",
          description: result.message,
        });

        // Trigger recomputation and refresh
        if (onSyncComplete && result.data) {
          onSyncComplete({ expectedRows: result.data.validRows });
        }

        // Auto-close after success
        setTimeout(() => {
          setIsOpen(false);
          resetState();
        }, 2000);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
      toast({
        title: "Sync Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setStep("input");
    } finally {
      setIsSyncing(false);
    }
  };

  const renderInputStep = () => (
    <div className="space-y-3 sm:space-y-4">
      <Alert className="py-3 sm:py-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-sm sm:text-base">
          Warning: This will replace all bookings
        </AlertTitle>
        <AlertDescription className="text-xs sm:text-sm">
          This action will download data from the ImHereTravels spreadsheet and
          replace all existing bookings in your database. This cannot be undone.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="sheet-name" className="text-sm sm:text-base">
          Sheet Name (Optional)
        </Label>
        <Input
          id="sheet-name"
          placeholder="Main Dashboard"
          value={sheetName}
          onChange={(e) => setSheetName(e.target.value)}
          disabled={isSyncing}
          className="text-sm sm:text-base"
        />
        <p className="text-xs text-muted-foreground">
          Defaults to "Main Dashboard" if left empty
        </p>
      </div>

      <Alert className="py-3 sm:py-4">
        <Database className="h-4 w-4" />
        <AlertTitle className="text-sm sm:text-base">How it works</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm mt-2">
            <li>Connects to the ImHereTravels Google Spreadsheet</li>
            <li>Downloads CSV data from the specified sheet</li>
            <li>Validates the data format</li>
            <li>Replaces all bookings in the database</li>
            <li>Preserves function column values from the spreadsheet</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Alert
        variant="default"
        className="bg-blue-50 border-blue-200 py-3 sm:py-4"
      >
        <ExternalLink className="h-4 w-4" />
        <AlertTitle className="text-sm sm:text-base">
          Spreadsheet Information
        </AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm mt-2">
            <li>Connected to the official ImHereTravels booking spreadsheet</li>
            <li>
              Accessed using Bella's account (
              <strong>imheretravels@gmail.com</strong>)
            </li>
            <li>
              Make sure the sheet name matches the one in your spreadsheet
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderSyncingStep = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center py-6 sm:py-8">
        <RefreshCw className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-blue-600 animate-spin mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-semibold mb-2">
          Syncing from Spreadsheet
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          Downloading and importing data...
        </p>
        <Progress value={syncProgress} className="w-full" />
        <p className="text-xs text-muted-foreground mt-2">
          {syncProgress}% complete
        </p>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center py-6 sm:py-8">
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold mb-2">
          Sync Complete!
        </h3>
        {syncResult && (
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {syncResult.message}
            </p>
            {syncResult.validRows !== undefined && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                <p>Valid bookings imported: {syncResult.validRows}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync from Spreadsheet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="text-lg sm:text-xl">
            {step === "input" && "Sync from Google Spreadsheet"}
            {step === "syncing" && "Syncing..."}
            {step === "complete" && "Sync Complete"}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {step === "input" &&
              "Download and import bookings from your Google Spreadsheet"}
            {step === "syncing" && "Please wait while we sync your data"}
            {step === "complete" &&
              "Your bookings have been synced successfully"}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && renderInputStep()}
        {step === "syncing" && renderSyncingStep()}
        {step === "complete" && renderCompleteStep()}

        {step === "input" && (
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSyncing}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSync}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Confirm Sync
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
