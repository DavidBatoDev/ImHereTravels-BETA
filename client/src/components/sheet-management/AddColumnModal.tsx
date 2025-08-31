"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SheetColumn, ColumnType, JSFunction } from "@/types/sheet-management";
import { jsFunctionsService } from "@/services/js-functions-service";
import { Plus, Code, Settings } from "lucide-react";

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (column: Omit<SheetColumn, "id">) => void;
  existingColumns: SheetColumn[];
}

const columnTypes: { value: ColumnType; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Dropdown" },
  { value: "function", label: "Function" },
  { value: "email", label: "Email" },
  { value: "currency", label: "Currency" },
];

export default function AddColumnModal({
  isOpen,
  onClose,
  onAdd,
  existingColumns,
}: AddColumnModalProps) {
  const [formData, setFormData] = useState({
    columnName: "",
    dataType: "" as ColumnType,
    function: null as JSFunction | null,
    parameters: [] as any[],
    includeInForms: true,
    options: "",
    defaultValue: "",
    width: 150,
  });

  const [jsFunctions, setJsFunctions] = useState<JSFunction[]>([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);

  // Load JS functions when modal opens
  useEffect(() => {
    if (isOpen && formData.dataType === "function") {
      loadJSFunctions();
    }
  }, [isOpen, formData.dataType]);

  const loadJSFunctions = async () => {
    setIsLoadingFunctions(true);
    try {
      const functions = await jsFunctionsService.getAllFunctions();
      setJsFunctions(functions);
    } catch (error) {
      console.error("Failed to load JS functions:", error);
    } finally {
      setIsLoadingFunctions(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-set includeInForms to false when dataType is function
    if (field === "dataType" && value === "function") {
      setFormData((prev) => ({ ...prev, includeInForms: false }));
    }
  };

  const handleFunctionChange = (functionId: string) => {
    const selectedFunction = jsFunctions.find((f) => f.id === functionId);
    setFormData((prev) => ({
      ...prev,
      function: selectedFunction || null,
      parameters: selectedFunction
        ? new Array(selectedFunction.parameters.length).fill("")
        : [],
    }));
  };

  const handleParameterChange = (index: number, value: any) => {
    const newParameters = [...formData.parameters];
    newParameters[index] = value;
    setFormData((prev) => ({ ...prev, parameters: newParameters }));
  };

  const handleAdd = () => {
    if (!formData.columnName || !formData.dataType) return;

    const newColumn: Omit<SheetColumn, "id"> = {
      // New interface fields
      columnName: formData.columnName,
      dataType: formData.dataType,
      function: formData.function || undefined,
      parameters:
        formData.parameters.length > 0 ? formData.parameters : undefined,
      includeInForms: formData.includeInForms,

      // Legacy fields for backward compatibility
      name: formData.columnName,
      type: formData.dataType,

      // Column behavior and styling
      width: formData.width,
      options:
        formData.dataType === "select"
          ? formData.options
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      defaultValue: formData.defaultValue || undefined,
      order: 0, // Will be auto-calculated by service
    };

    onAdd(newColumn);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      columnName: "",
      dataType: "" as ColumnType,
      function: null,
      parameters: [],
      includeInForms: true,
      options: "",
      defaultValue: "",
      width: 150,
    });
  };

  const isFormValid = formData.columnName && formData.dataType;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Column
          </DialogTitle>
          <DialogDescription>
            Create a new column with advanced configuration options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Column Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Column Name *</Label>
              <Input
                id="columnName"
                value={formData.columnName}
                onChange={(e) =>
                  handleInputChange("columnName", e.target.value)
                }
                placeholder="Enter column name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataType">Data Type *</Label>
              <Select
                value={formData.dataType}
                onValueChange={(value: ColumnType) =>
                  handleInputChange("dataType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  {columnTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Function Selection (only when dataType is function) */}
          {formData.dataType === "function" && (
            <div className="space-y-4 p-4 border border-royal-purple/20 rounded-lg bg-royal-purple/5">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-royal-purple" />
                <Label className="text-lg font-semibold">
                  Function Configuration
                </Label>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="function">Select JS Function *</Label>
                  <Select
                    value={formData.function?.id || ""}
                    onValueChange={handleFunctionChange}
                    disabled={isLoadingFunctions}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingFunctions
                            ? "Loading functions..."
                            : "Select a function"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {jsFunctions.map((func) => (
                        <SelectItem key={func.id} value={func.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{func.name}</span>
                            <span className="text-sm text-gray-500">
                              {func.parameters.length} parameter(s) •{" "}
                              {func.filePath}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.function && (
                    <p className="text-sm text-gray-600">
                      Function: {formData.function.name} from{" "}
                      {formData.function.filePath}
                    </p>
                  )}
                </div>

                {/* Parameters */}
                {formData.function &&
                  formData.function.parameters.length > 0 && (
                    <div className="space-y-2">
                      <Label>Function Parameters</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {formData.function.parameters.map((param, index) => (
                          <div key={index} className="space-y-1">
                            <Label className="text-sm">{param}</Label>
                            <Input
                              value={formData.parameters[index] || ""}
                              onChange={(e) =>
                                handleParameterChange(index, e.target.value)
                              }
                              placeholder={`Value for ${param}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Select Options */}
          {formData.dataType === "select" && (
            <div className="space-y-2">
              <Label htmlFor="options">Dropdown Options</Label>
              <Textarea
                id="options"
                value={formData.options}
                onChange={(e) => handleInputChange("options", e.target.value)}
                placeholder="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)"
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Separate multiple options with commas
              </p>
            </div>
          )}

          {/* Default Value */}
          {formData.dataType !== "function" && (
            <div className="space-y-2">
              <Label htmlFor="defaultValue">Default Value</Label>
              {formData.dataType === "boolean" ? (
                <Select
                  value={formData.defaultValue}
                  onValueChange={(value) =>
                    handleInputChange("defaultValue", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : formData.dataType === "date" ? (
                <Input
                  id="defaultValue"
                  type="date"
                  value={formData.defaultValue}
                  onChange={(e) =>
                    handleInputChange("defaultValue", e.target.value)
                  }
                />
              ) : (
                <Input
                  id="defaultValue"
                  value={formData.defaultValue}
                  onChange={(e) =>
                    handleInputChange("defaultValue", e.target.value)
                  }
                  placeholder="Enter default value"
                />
              )}
            </div>
          )}

          {/* Column Settings */}
          <div className="space-y-4 p-4 border border-royal-purple/20 rounded-lg bg-royal-purple/5">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-royal-purple" />
              <Label className="text-lg font-semibold">Column Settings</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Column Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  min="50"
                  max="500"
                  value={formData.width}
                  onChange={(e) =>
                    handleInputChange("width", parseInt(e.target.value) || 150)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="includeInForms">Include in Forms</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeInForms"
                    checked={formData.includeInForms}
                    onCheckedChange={(checked) =>
                      handleInputChange("includeInForms", checked)
                    }
                    disabled={formData.dataType === "function"}
                  />
                  <Label htmlFor="includeInForms">
                    {formData.dataType === "function"
                      ? "Always false for functions"
                      : "Show in form inputs"}
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!isFormValid}>
            Add Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
