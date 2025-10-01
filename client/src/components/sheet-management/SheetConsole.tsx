"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  RotateCcw,
  Terminal,
  AlertCircle,
  CheckCircle,
  Clock,
  Code,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import {
  SheetColumn,
  SheetData,
  TypeScriptFunction,
} from "@/types/sheet-management";
import { functionExecutionService } from "@/services/function-execution-service";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  timestamp: Date;
  consoleLogs?: string[];
  functionName?: string;
  columnName?: string;
  rowId?: string;
}

interface SheetConsoleProps {
  columns: SheetColumn[];
  data: SheetData[];
  availableFunctions: TypeScriptFunction[];
  onClose?: () => void;
  debugCell?: {
    rowId: string;
    columnId: string;
  } | null;
}

export default function SheetConsole({
  columns,
  data,
  availableFunctions,
  onClose,
  debugCell,
}: SheetConsoleProps) {
  const { toast } = useToast();
  const [selectedFunctionColumn, setSelectedFunctionColumn] =
    useState<SheetColumn | null>(null);
  const [selectedRow, setSelectedRow] = useState<SheetData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [showCustomCode, setShowCustomCode] = useState(false);
  const [showResults, setShowResults] = useState(true);

  // Get function columns
  const functionColumns = columns.filter((col) => col.dataType === "function");

  // Track if we should auto-execute
  const shouldAutoExecuteRef = useRef(false);

  // Auto-select when debugCell is provided
  useEffect(() => {
    if (debugCell) {
      // Clear everything first
      setSelectedFunctionColumn(null);
      setSelectedRow(null);
      setTestResults([]);
      setCustomCode("");

      // Then set the new values
      const col = columns.find((c) => c.id === debugCell.columnId);
      const row = data.find((r) => r.id === debugCell.rowId);

      if (col && row) {
        setSelectedFunctionColumn(col);
        setSelectedRow(row);
        shouldAutoExecuteRef.current = true;
      }
    }
  }, [debugCell?.rowId, debugCell?.columnId, columns, data]);

  const executeFunction = async () => {
    if (!selectedFunctionColumn || !selectedRow) return;

    setIsExecuting(true);
    const startTime = performance.now();

    // Capture console.logs (filter out framework logs)
    const consoleLogs: string[] = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Framework log patterns to filter out
    const frameworkPatterns = [
      /^\[CACHE HIT\]/,
      /^\[FUNCTION EXECUTED\]/,
      /^\[FUNCTION ERROR\]/,
      /^🚀/,
      /^✅/,
      /^❌/,
      /^\[SHEET MANAGEMENT\]/,
      /^📊/,
      /^📋/,
      /^🔍/,
      /^🧹/,
    ];

    const isFrameworkLog = (message: string): boolean => {
      return frameworkPatterns.some((pattern) => pattern.test(message));
    };

    console.log = (...args) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      // Only capture non-framework logs
      if (!isFrameworkLog(message)) {
        consoleLogs.push(`[LOG] ${message}`);
      }
      originalConsoleLog(...args);
    };
    console.error = (...args) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      if (!isFrameworkLog(message)) {
        consoleLogs.push(`[ERROR] ${message}`);
      }
      originalConsoleError(...args);
    };
    console.warn = (...args) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      if (!isFrameworkLog(message)) {
        consoleLogs.push(`[WARN] ${message}`);
      }
      originalConsoleWarn(...args);
    };

    try {
      if (!selectedFunctionColumn.function) {
        throw new Error("No function assigned to this column");
      }

      // Build arguments from row data
      const args = functionExecutionService.buildArgs(
        selectedFunctionColumn,
        selectedRow,
        columns
      );

      // Execute function (console capture starts here)
      const executionResult = await functionExecutionService.executeFunction(
        selectedFunctionColumn.function,
        args,
        10000
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const testResult: TestResult = {
        success: executionResult.success,
        result: executionResult.result,
        error: executionResult.error,
        executionTime,
        timestamp: new Date(),
        consoleLogs: [...consoleLogs],
        functionName: availableFunctions.find(
          (f) => f.id === selectedFunctionColumn.function
        )?.functionName,
        columnName: selectedFunctionColumn.columnName,
        rowId: selectedRow.id,
      };

      setTestResults((prev) => [testResult, ...prev]);

      if (executionResult.success) {
        toast({
          title: "Function executed successfully",
          description: `${
            selectedFunctionColumn.columnName
          } executed in ${executionTime.toFixed(2)}ms`,
        });
      } else {
        toast({
          title: "Function execution failed",
          description: executionResult.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const testResult: TestResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        timestamp: new Date(),
        consoleLogs: [...consoleLogs],
        functionName: availableFunctions.find(
          (f) => f.id === selectedFunctionColumn.function
        )?.functionName,
        columnName: selectedFunctionColumn.columnName,
        rowId: selectedRow.id,
      };

      setTestResults((prev) => [testResult, ...prev]);

      toast({
        title: "Function execution failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      setIsExecuting(false);
    }
  };

  const executeCustomCode = async () => {
    if (!customCode.trim()) return;

    setIsExecuting(true);
    const startTime = performance.now();

    const consoleLogs: string[] = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Framework log patterns to filter out
    const frameworkPatterns = [
      /^\[CACHE HIT\]/,
      /^\[FUNCTION EXECUTED\]/,
      /^\[FUNCTION ERROR\]/,
      /^🚀/,
      /^✅/,
      /^❌/,
      /^\[SHEET MANAGEMENT\]/,
      /^📊/,
      /^📋/,
      /^🔍/,
      /^🧹/,
    ];

    const isFrameworkLog = (message: string): boolean => {
      return frameworkPatterns.some((pattern) => pattern.test(message));
    };

    console.log = (...args) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      if (!isFrameworkLog(message)) {
        consoleLogs.push(`[LOG] ${message}`);
      }
      originalConsoleLog(...args);
    };
    console.error = (...args) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      if (!isFrameworkLog(message)) {
        consoleLogs.push(`[ERROR] ${message}`);
      }
      originalConsoleError(...args);
    };
    console.warn = (...args) => {
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");

      if (!isFrameworkLog(message)) {
        consoleLogs.push(`[WARN] ${message}`);
      }
      originalConsoleWarn(...args);
    };

    try {
      const {
        auth,
        db,
        storage,
        firebaseUtils,
        functionsUtils,
        collection,
        doc,
        getDocs,
        addDoc,
        updateDoc,
        deleteDoc,
        query,
        where,
        orderBy,
        serverTimestamp,
      } = await import("@/app/functions/firebase-utils");

      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("@/lib/firebase");

      // Create sandbox with sheet data access
      const sandbox = new Function(
        "exports",
        "moduleRef",
        "require",
        "auth",
        "db",
        "storage",
        "firebaseUtils",
        "functionsUtils",
        "collection",
        "doc",
        "getDocs",
        "addDoc",
        "updateDoc",
        "deleteDoc",
        "query",
        "where",
        "orderBy",
        "serverTimestamp",
        "httpsCallable",
        "functions",
        "columns",
        "data",
        customCode
      );

      const moduleObj = { exports: {} as any };
      const result = sandbox(
        moduleObj.exports,
        moduleObj,
        () => {},
        auth,
        db,
        storage,
        firebaseUtils,
        functionsUtils,
        collection,
        doc,
        getDocs,
        addDoc,
        updateDoc,
        deleteDoc,
        query,
        where,
        orderBy,
        serverTimestamp,
        httpsCallable,
        functions,
        columns,
        data
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const testResult: TestResult = {
        success: true,
        result: result || moduleObj.exports,
        executionTime,
        timestamp: new Date(),
        consoleLogs: [...consoleLogs],
      };

      setTestResults((prev) => [testResult, ...prev]);

      toast({
        title: "Custom code executed successfully",
        description: `Execution completed in ${executionTime.toFixed(2)}ms`,
      });
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const testResult: TestResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        timestamp: new Date(),
        consoleLogs: [...consoleLogs],
      };

      setTestResults((prev) => [testResult, ...prev]);

      toast({
        title: "Custom code execution failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      setIsExecuting(false);
    }
  };

  // Auto-execute when selections are ready (after executeFunction is defined)
  useEffect(() => {
    if (
      shouldAutoExecuteRef.current &&
      selectedFunctionColumn &&
      selectedRow &&
      !isExecuting
    ) {
      shouldAutoExecuteRef.current = false;
      executeFunction();
    }
  }, [selectedFunctionColumn, selectedRow]);

  const clearResults = () => {
    setTestResults([]);
  };

  const downloadResult = (result: any, index: number) => {
    const resultString =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);
    const blob = new Blob([resultString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sheet-test-result-${index + 1}-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatResult = (result: any): string => {
    if (result === null) return "null";
    if (result === undefined) return "undefined";
    if (typeof result === "function") return "[Function]";
    if (typeof result === "object") {
      try {
        return JSON.stringify(result, null, 2);
      } catch {
        return String(result);
      }
    }
    return String(result);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border relative">
      {/* Close Button - Left Edge */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-background border border-r-0 border-border rounded-l-lg p-2 hover:bg-muted transition-colors shadow-lg z-50"
          title="Close console"
        >
          <ChevronRight className="h-4 w-4 text-royal-purple" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-royal-purple" />
          <h3 className="text-sm font-semibold text-foreground">
            Sheet Console
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearResults}
            disabled={testResults.length === 0}
            className="h-7 px-2 text-xs"
            title="Clear results"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Function Column Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Function Column</Label>
              <select
                value={selectedFunctionColumn?.id || ""}
                onChange={(e) => {
                  const col = functionColumns.find(
                    (c) => c.id === e.target.value
                  );
                  setSelectedFunctionColumn(col || null);
                }}
                className="w-full h-8 px-2 text-xs border border-royal-purple/20 rounded focus:border-royal-purple focus:ring-1 focus:ring-royal-purple/20 focus:outline-none"
              >
                <option value="">Select function column...</option>
                {functionColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.columnName}
                  </option>
                ))}
              </select>
            </div>

            {/* Row Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Test Row</Label>
              <select
                value={selectedRow?.id || ""}
                onChange={(e) => {
                  const row = data.find((r) => r.id === e.target.value);
                  setSelectedRow(row || null);
                }}
                className="w-full h-8 px-2 text-xs border border-royal-purple/20 rounded focus:border-royal-purple focus:ring-1 focus:ring-royal-purple/20 focus:outline-none"
              >
                <option value="">Select row...</option>
                {data.slice(0, 100).map((row) => (
                  <option key={row.id} value={row.id}>
                    Row {row.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Function Arguments Preview */}
            {selectedFunctionColumn && selectedRow && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Arguments Preview</Label>
                <div className="bg-muted rounded p-2 text-xs font-mono space-y-1">
                  {selectedFunctionColumn.arguments?.map((arg, index) => {
                    const value = arg.columnReference
                      ? (() => {
                          const refCol = columns.find(
                            (c) => c.columnName === arg.columnReference
                          );
                          return refCol ? selectedRow[refCol.id] : undefined;
                        })()
                      : arg.value;

                    return (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">
                          {arg.name}:
                        </span>
                        <span className="flex-1 break-words">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value || "undefined")}
                        </span>
                      </div>
                    );
                  })}
                  {(!selectedFunctionColumn.arguments ||
                    selectedFunctionColumn.arguments.length === 0) && (
                    <span className="text-muted-foreground">No arguments</span>
                  )}
                </div>
              </div>
            )}

            {/* Run Button */}
            <Button
              onClick={executeFunction}
              disabled={isExecuting || !selectedFunctionColumn || !selectedRow}
              className="w-full h-8 text-xs bg-royal-purple hover:bg-royal-purple/90"
            >
              {isExecuting ? (
                <Clock className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              {isExecuting ? "Executing..." : "Run Function"}
            </Button>

            {/* Custom Code Section */}
            <div className="space-y-2 border-t border-border pt-4">
              <button
                onClick={() => setShowCustomCode(!showCustomCode)}
                className="flex items-center justify-between w-full text-left hover:bg-muted p-2 rounded"
              >
                <h4 className="text-xs font-medium text-foreground flex items-center space-x-2">
                  <Code className="h-3 w-3" />
                  <span>Custom Code</span>
                </h4>
                {showCustomCode ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              {showCustomCode && (
                <div className="space-y-2">
                  <Textarea
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="// Access columns and data arrays
// const functionCols = columns.filter(c => c.dataType === 'function');
// console.log('Function columns:', functionCols.length);
// return data.length;"
                    className="min-h-[80px] text-xs font-mono"
                  />
                  <Button
                    onClick={executeCustomCode}
                    disabled={isExecuting || !customCode.trim()}
                    variant="outline"
                    className="w-full h-7 text-xs"
                  >
                    {isExecuting ? (
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 mr-1" />
                    )}
                    {isExecuting ? "Executing..." : "Run Code"}
                  </Button>
                </div>
              )}
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <button
                  onClick={() => setShowResults(!showResults)}
                  className="flex items-center justify-between w-full text-left hover:bg-muted p-2 rounded"
                >
                  <h4 className="text-xs font-medium text-foreground flex items-center space-x-2">
                    <Terminal className="h-3 w-3" />
                    <span>Results</span>
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {testResults.length}
                    </Badge>
                  </h4>
                  {showResults ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
                {showResults && (
                  <div className="space-y-2">
                    {testResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded border text-xs ${
                          result.success
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {result.success ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-600" />
                            )}
                            <span className="font-medium text-xs">
                              {result.success ? "Success" : "Error"}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0"
                            >
                              {result.executionTime.toFixed(0)}ms
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {result.timestamp
                              .toLocaleTimeString()
                              .substring(0, 8)}
                          </span>
                        </div>

                        {/* Function Info */}
                        {result.columnName && (
                          <div className="text-xs text-muted-foreground mb-2">
                            <span className="font-medium">
                              {result.columnName}
                            </span>
                            {result.rowId && (
                              <span className="ml-2">(Row {result.rowId})</span>
                            )}
                          </div>
                        )}

                        {/* Result */}
                        <div className="space-y-2">
                          <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-48 overflow-auto bg-white/50 p-2 rounded border border-gray-200">
                            {result.success
                              ? formatResult(result.result)
                              : result.error || ""}
                          </pre>

                          {/* Console Logs */}
                          {result.consoleLogs &&
                            result.consoleLogs.length > 0 && (
                              <div className="pt-2 border-t border-gray-200">
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  Console:
                                </div>
                                <div className="space-y-1">
                                  {result.consoleLogs.map((log, logIndex) => (
                                    <div
                                      key={logIndex}
                                      className={`text-xs font-mono p-1 rounded ${
                                        log.startsWith("[ERROR]")
                                          ? "bg-red-100 text-red-700"
                                          : log.startsWith("[WARN]")
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {log}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          <div className="flex justify-end mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                downloadResult(
                                  result.success ? result.result : result.error,
                                  index
                                )
                              }
                              className="h-6 px-2 text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {functionColumns.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                <p className="text-xs">No function columns found</p>
                <p className="text-xs mt-1">
                  Add a function column to start testing
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
