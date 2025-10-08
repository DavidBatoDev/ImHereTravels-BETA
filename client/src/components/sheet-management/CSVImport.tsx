"use client";

import React, { useState, useRef } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react";
import {
  csvImportService,
  CSVImportResult,
} from "@/services/csv-import-service";

interface CSVImportProps {
  onImportComplete?: (info: { expectedRows: number }) => void;
  trigger?: React.ReactNode;
}

export default function CSVImport({
  onImportComplete,
  trigger,
}: CSVImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [step, setStep] = useState<
    "upload" | "preview" | "importing" | "complete"
  >("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setParseResult(null);
    setIsProcessing(false);
    setImportProgress(0);
    setStep("upload");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleFileUpload(selectedFile);
    }
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setIsProcessing(true);
    setStep("preview");

    try {
      const result = await csvImportService.parseFile(uploadedFile);
      setParseResult(result);

      if (!result.success) {
        toast({
          title: "Parse Error",
          description: result.message,
          variant: "destructive",
        });
        setStep("upload");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process file",
        variant: "destructive",
      });
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !parseResult?.success) return;

    setStep("importing");
    setImportProgress(0);

    try {
      // Use the complete import process
      setImportProgress(20);
      const importResult = await csvImportService.importCSV(file);

      setImportProgress(100);

      if (importResult.success) {
        setStep("complete");
        toast({
          title: "Import Successful",
          description: importResult.message,
        });

        // Trigger recomputation and refresh
        if (onImportComplete) {
          const expectedRows = importResult.data?.validRows ?? 0;
          onImportComplete({ expectedRows });
        }

        // Auto-close the modal after successful import
        setIsOpen(false);
        resetState();
      } else {
        throw new Error(importResult.message);
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setStep("preview");
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
          <Upload className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Upload CSV or Excel File</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select a CSV file or Excel file with a "Main Dashboard" sheet
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="mb-2"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Choose File
        </Button>
        <p className="text-xs text-muted-foreground">
          Supports CSV, XLSX, and XLS files
        </p>
      </div>

      {file && (
        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertTitle>File Selected</AlertTitle>
          <AlertDescription>
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderPreviewStep = () => {
    if (!parseResult) return null;

    if (!parseResult.success) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Parse Error</AlertTitle>
          <AlertDescription>{parseResult.message}</AlertDescription>
        </Alert>
      );
    }

    const { data } = parseResult;
    if (!data) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Preview Import Data</h3>
          <div className="text-sm text-muted-foreground">
            {data.validRows} valid rows of {data.totalRows} total rows
          </div>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Ready to Import</AlertTitle>
          <AlertDescription>
            Found {data.validRows} valid booking rows. This will replace all
            existing bookings.
          </AlertDescription>
        </Alert>

        <div className="border rounded-lg overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {data.headers.map((header, index) => (
                    <TableHead
                      key={index}
                      className="whitespace-nowrap min-w-[120px]"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.preview.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {data.headers.map((_, colIndex) => (
                      <TableCell
                        key={colIndex}
                        className="whitespace-nowrap min-w-[120px]"
                      >
                        {row[colIndex] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This action will permanently delete all existing bookings and
            replace them with the imported data. This cannot be undone.
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <Upload className="w-6 h-6 text-blue-600 animate-pulse" />
      </div>
      <h3 className="text-lg font-semibold">Importing Data...</h3>
      <Progress value={importProgress} className="w-full" />
      <p className="text-sm text-muted-foreground">
        Please wait while we import your data. This may take a few moments.
      </p>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
        <CheckCircle className="w-6 h-6 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold">Import Complete!</h3>
      <p className="text-sm text-muted-foreground">
        Your bookings have been successfully imported. Function columns will be
        recomputed automatically.
      </p>
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case "upload":
        return renderUploadStep();
      case "preview":
        return renderPreviewStep();
      case "importing":
        return renderImportingStep();
      case "complete":
        return renderCompleteStep();
      default:
        return renderUploadStep();
    }
  };

  const getDialogTitle = () => {
    switch (step) {
      case "upload":
        return "Import CSV Data";
      case "preview":
        return "Confirm Import";
      case "importing":
        return "Importing Data";
      case "complete":
        return "Import Complete";
      default:
        return "Import CSV Data";
    }
  };

  const showFooter = step === "preview" || step === "complete";
  const canConfirm = step === "preview" && parseResult?.success;
  const canClose = step !== "importing";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (canClose) {
          setIsOpen(open);
          if (!open) {
            resetState();
          }
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-6xl h-[80vh] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload a CSV or Excel file to replace all bookings data"}
            {step === "preview" && "Review the data before importing"}
            {step === "importing" && "Importing your data to Firestore"}
            {step === "complete" && "Data import completed successfully"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">{getStepContent()}</div>

        {showFooter && (
          <DialogFooter>
            {step === "preview" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setStep("upload")}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={!canConfirm || isProcessing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isProcessing ? "Processing..." : "Confirm Import"}
                </Button>
              </>
            )}
            {step === "complete" && (
              <Button
                onClick={() => {
                  setIsOpen(false);
                  resetState();
                }}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        )}

        {canClose && (
          <button
            onClick={() => {
              setIsOpen(false);
              resetState();
            }}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
