"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  RotateCcw,
  Terminal,
  AlertCircle,
  CheckCircle,
  Clock,
  Code,
  Type,
  ChevronDown,
  ChevronRight,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { functionExecutionService } from "@/services/function-execution-service";
import { TSFile, TSArgument } from "@/types/functions";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  timestamp: Date;
}

interface TestConsoleProps {
  activeFile: TSFile | null;
}

export default function TestConsole({ activeFile }: TestConsoleProps) {
  const { toast } = useToast();
  const [parameterValues, setParameterValues] = useState<
    Record<string, string>
  >({});
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [showParameters, setShowParameters] = useState(true);
  const [showCustomCode, setShowCustomCode] = useState(false);
  const [showResults, setShowResults] = useState(true);

  // Reset parameter values when active file changes
  useEffect(() => {
    if (activeFile) {
      const initialValues: Record<string, string> = {};
      activeFile.arguments.forEach((arg) => {
        initialValues[arg.name] = getDefaultValue(arg);
      });
      setParameterValues(initialValues);
      setTestResults([]);
    }
  }, [activeFile]);

  const getDefaultValue = (arg: TSArgument): string => {
    if (arg.hasDefault) return "";

    const type = arg.type.toLowerCase();
    if (type.includes("string")) return '""';
    if (type.includes("number")) return "0";
    if (type.includes("boolean")) return "false";
    if (type.includes("[]") || type.includes("array")) return "[]";
    if (type.includes("{}") || type.includes("object")) return "{}";
    return "";
  };

  const parseParameterValue = (value: string, arg: TSArgument): any => {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return arg.isOptional ? undefined : null;
    }

    const type = arg.type.toLowerCase();

    // Handle arrays
    if (type.includes("[]") || type.includes("array")) {
      try {
        return JSON.parse(trimmedValue);
      } catch {
        // If JSON parsing fails, try comma-separated values
        return trimmedValue
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    }

    // Handle objects
    if (type.includes("{}") || type.includes("object")) {
      try {
        return JSON.parse(trimmedValue);
      } catch {
        return {};
      }
    }

    // Handle booleans
    if (type.includes("boolean")) {
      return trimmedValue.toLowerCase() === "true";
    }

    // Handle numbers
    if (type.includes("number")) {
      const num = Number(trimmedValue);
      return isNaN(num) ? 0 : num;
    }

    // Handle strings (remove quotes if present)
    if (type.includes("string")) {
      return trimmedValue.replace(/^["']|["']$/g, "");
    }

    // Default to string
    return trimmedValue;
  };

  const executeFunction = async () => {
    if (!activeFile) return;

    setIsExecuting(true);
    const startTime = performance.now();

    try {
      // Parse parameters
      const args = activeFile.arguments.map((arg) =>
        parseParameterValue(parameterValues[arg.name] || "", arg)
      );

      // Get compiled function
      const compiledFunction =
        await functionExecutionService.getCompiledFunction(activeFile.id);

      // Execute function
      const result = await compiledFunction(...args);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const testResult: TestResult = {
        success: true,
        result,
        executionTime,
        timestamp: new Date(),
      };

      setTestResults((prev) => [testResult, ...prev]);

      toast({
        title: "Function executed successfully",
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
      };

      setTestResults((prev) => [testResult, ...prev]);

      toast({
        title: "Function execution failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const executeCustomCode = async () => {
    if (!activeFile || !customCode.trim()) return;

    setIsExecuting(true);
    const startTime = performance.now();

    try {
      // Create a sandbox to execute custom code
      const sandbox = new Function("exports", "module", "require", customCode);

      const module = { exports: {} as any };
      const result = sandbox(module.exports, module, () => {});

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const testResult: TestResult = {
        success: true,
        result: result || module.exports,
        executionTime,
        timestamp: new Date(),
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
      };

      setTestResults((prev) => [testResult, ...prev]);

      toast({
        title: "Custom code execution failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
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

  if (!activeFile) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2">
            <Terminal className="h-4 w-4" />
            <span className="text-sm">Test Console</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <Code className="mx-auto h-6 w-6 mb-1" />
            <p className="text-xs">Select a function to test</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if there's no export default function
  if (!activeFile.hasExportDefault || activeFile.exportType !== "function") {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2">
            <Terminal className="h-4 w-4" />
            <span className="text-sm">Test Console</span>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {activeFile.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-8 w-8 mb-2 text-amber-500" />
            <p className="text-sm font-medium text-foreground mb-1">
              No Export Default Function
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              This file doesn't have an export default function to test.
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>To test a function, add:</p>
              <div className="bg-muted/50 p-2 rounded text-left font-mono">
                <div>export default function myFunction() {`{`}</div>
                <div className="ml-2">// Your code here</div>
                <div className="ml-2">return "Hello World";</div>
                <div>{`}`}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1 px-3 py-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Terminal className="h-3 w-3" />
            <span className="text-xs font-medium">Test</span>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {activeFile.name.length > 8
                ? activeFile.name.substring(0, 8) + "..."
                : activeFile.name}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={clearResults}
              disabled={testResults.length === 0}
              className="h-5 px-1 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-1 px-3 pb-3">
        {/* Function Parameters */}
        {activeFile.arguments.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowParameters(!showParameters)}
              className="flex items-center justify-between w-full text-left hover:bg-muted p-1 rounded"
            >
              <h4 className="text-xs font-medium text-foreground flex items-center space-x-1">
                <Type className="h-3 w-3" />
                <span>Params</span>
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {activeFile.arguments.length}
                </Badge>
              </h4>
              {showParameters ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
            {showParameters && (
              <div className="space-y-1 pl-3">
                <div className="grid gap-1">
                  {activeFile.arguments.map((arg) => (
                    <div key={arg.name} className="space-y-1">
                      <Label htmlFor={arg.name} className="text-xs">
                        {arg.name}
                        {arg.isOptional && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-xs px-1 py-0"
                          >
                            opt
                          </Badge>
                        )}
                        <span className="text-muted-foreground ml-1 text-xs">
                          (
                          {arg.type.length > 10
                            ? arg.type.substring(0, 10) + "..."
                            : arg.type}
                          )
                        </span>
                      </Label>
                      <Input
                        id={arg.name}
                        value={parameterValues[arg.name] || ""}
                        onChange={(e) =>
                          setParameterValues((prev) => ({
                            ...prev,
                            [arg.name]: e.target.value,
                          }))
                        }
                        placeholder={getDefaultValue(arg)}
                        className="text-xs h-6"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={executeFunction}
                  disabled={isExecuting}
                  className="w-full h-6 text-xs"
                >
                  {isExecuting ? (
                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  {isExecuting ? "..." : "Run"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Custom Code Execution */}
        <div className="space-y-1">
          <button
            onClick={() => setShowCustomCode(!showCustomCode)}
            className="flex items-center justify-between w-full text-left hover:bg-muted p-1 rounded"
          >
            <h4 className="text-xs font-medium text-foreground flex items-center space-x-1">
              <Code className="h-3 w-3" />
              <span>Code</span>
            </h4>
            {showCustomCode ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          {showCustomCode && (
            <div className="space-y-1 pl-3">
              <Textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="// Code here..."
                className="min-h-[40px] text-xs font-mono h-12"
              />
              <Button
                onClick={executeCustomCode}
                disabled={isExecuting || !customCode.trim()}
                variant="outline"
                className="w-full h-6 text-xs"
              >
                {isExecuting ? (
                  <Clock className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                {isExecuting ? "..." : "Run"}
              </Button>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-1">
            <button
              onClick={() => setShowResults(!showResults)}
              className="flex items-center justify-between w-full text-left hover:bg-muted p-1 rounded"
            >
              <h4 className="text-xs font-medium text-foreground flex items-center space-x-1">
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
              <div className="pl-3">
                <ScrollArea className="h-24 border rounded p-1 bg-muted">
                  <div className="space-y-1">
                    {testResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-1 rounded border text-xs ${
                          result.success
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-1">
                            {result.success ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-600" />
                            )}
                            <span className="font-medium text-xs">
                              {result.success ? "✓" : "✗"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {result.executionTime.toFixed(0)}ms
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {result.timestamp
                              .toLocaleTimeString()
                              .substring(0, 5)}
                          </span>
                        </div>
                        <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-16 overflow-hidden">
                          {result.success
                            ? formatResult(result.result).substring(0, 100) +
                              (formatResult(result.result).length > 100
                                ? "..."
                                : "")
                            : result.error?.substring(0, 100) +
                              (result.error && result.error.length > 100
                                ? "..."
                                : "")}
                        </pre>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
