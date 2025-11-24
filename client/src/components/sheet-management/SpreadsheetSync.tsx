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
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning: This will replace all bookings</AlertTitle>
        <AlertDescription>
          This action will download data from the ImHereTravels spreadsheet and
          replace all existing bookings in your database. This cannot be undone.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="sheet-name">Sheet Name (Optional)</Label>
        <Input
          id="sheet-name"
          placeholder="Main Dashboard"
          value={sheetName}
          onChange={(e) => setSheetName(e.target.value)}
          disabled={isSyncing}
        />
        <p className="text-xs text-muted-foreground">
          Defaults to "Main Dashboard" if left empty
        </p>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertTitle>How it works</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
            <li>Connects to the ImHereTravels Google Spreadsheet</li>
            <li>Downloads CSV data from the specified sheet</li>
            <li>Validates the data format</li>
            <li>Replaces all bookings in the database</li>
            <li>Preserves function column values from the spreadsheet</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="bg-blue-50 border-blue-200">
        <ExternalLink className="h-4 w-4" />
        <AlertTitle>Spreadsheet Information</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-sm mt-2">
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
    <div className="space-y-4">
      <div className="text-center py-8">
        <RefreshCw className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
        <h3 className="text-lg font-semibold mb-2">Syncing from Spreadsheet</h3>
        <p className="text-sm text-muted-foreground mb-4">
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
    <div className="space-y-4">
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Sync Complete!</h3>
        {syncResult && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {syncResult.message}
            </p>
            {syncResult.validRows !== undefined && (
              <div className="text-sm text-muted-foreground">
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "input" && "Sync from Google Spreadsheet"}
            {step === "syncing" && "Syncing..."}
            {step === "complete" && "Sync Complete"}
          </DialogTitle>
          <DialogDescription>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSyncing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSync}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700"
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
