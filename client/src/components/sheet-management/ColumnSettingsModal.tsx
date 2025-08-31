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
import { Trash2, Settings, Code, AlertTriangle } from "lucide-react";

interface ColumnSettingsModalProps {
  column: SheetColumn | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: SheetColumn) => void;
  onDelete?: (columnId: string) => void;
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

export default function ColumnSettingsModal({
  column,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ColumnSettingsModalProps) {
  const [formData, setFormData] = useState<Partial<SheetColumn>>({});
  const [optionsText, setOptionsText] = useState("");
  const [jsFunctions, setJsFunctions] = useState<JSFunction[]>([]);
  const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);

  useEffect(() => {
    if (column) {
      setFormData(column);
      setOptionsText(column.options?.join(", ") || "");
    } else {
      setFormData({});
      setOptionsText("");
    }
  }, [column]);

  // Load JS functions when editing a function column
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

  const handleInputChange = (field: keyof SheetColumn, value: any) => {
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
      function: selectedFunction || undefined,
      parameters: selectedFunction
        ? new Array(selectedFunction.parameters.length).fill("")
        : [],
    }));
  };

  const handleParameterChange = (index: number, value: any) => {
    const newParameters = [...(formData.parameters || [])];
    newParameters[index] = value;
    setFormData((prev) => ({ ...prev, parameters: newParameters }));
  };

  const handleSave = () => {
    if (!formData.columnName || !formData.dataType) return;

    const updatedColumn: SheetColumn = {
      ...column!,
      ...formData,
      // Ensure legacy fields are updated
      name: formData.columnName || column!.name,
      type: formData.dataType || column!.type,
      options:
        formData.dataType === "select"
          ? optionsText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
    };

    onSave(updatedColumn);
    onClose();
  };

  const handleDelete = () => {
    if (column && onDelete) {
      onDelete(column.id);
      onClose();
    }
  };

  const isFormValid = formData.columnName && formData.dataType;

  if (!column) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Column: {column.columnName || column.name}
          </DialogTitle>
          <DialogDescription>
            Modify column settings and configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Column Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Column Name *</Label>
              <Input
                id="columnName"
                value={formData.columnName || column.columnName || column.name}
                onChange={(e) =>
                  handleInputChange("columnName", e.target.value)
                }
                placeholder="Enter column name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataType">Data Type *</Label>
              <Select
                value={formData.dataType || column.dataType || column.type}
                onValueChange={(value: ColumnType) =>
                  handleInputChange("dataType", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
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

          {/* Function Configuration (only when dataType is function) */}
          {(formData.dataType === "function" ||
            column.dataType === "function" ||
            column.type === "function") && (
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
                    value={formData.function?.id || column.function?.id || ""}
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
                  {(formData.function || column.function) && (
                    <p className="text-sm text-gray-600">
                      Function: {(formData.function || column.function)?.name}{" "}
                      from {(formData.function || column.function)?.filePath}
                    </p>
                  )}
                </div>

                {/* Parameters */}
                {(formData.function || column.function) &&
                  (formData.function || column.function)?.parameters.length >
                    0 && (
                    <div className="space-y-2">
                      <Label>Function Parameters</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(formData.function || column.function)?.parameters.map(
                          (param, index) => (
                            <div key={index} className="space-y-1">
                              <Label className="text-sm">{param}</Label>
                              <Input
                                value={formData.parameters?.[index] || ""}
                                onChange={(e) =>
                                  handleParameterChange(index, e.target.value)
                                }
                                placeholder={`Value for ${param}`}
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Select Options */}
          {(formData.dataType === "select" ||
            column.dataType === "select" ||
            column.type === "select") && (
            <div className="space-y-2">
              <Label htmlFor="options">Dropdown Options</Label>
              <Textarea
                id="options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Enter options separated by commas (e.g., Option 1, Option 2, Option 3)"
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Separate multiple options with commas
              </p>
            </div>
          )}

          {/* Default Value */}
          {formData.dataType !== "function" &&
            column.dataType !== "function" &&
            column.type !== "function" && (
              <div className="space-y-2">
                <Label htmlFor="defaultValue">Default Value</Label>
                {formData.dataType === "boolean" ||
                column.dataType === "boolean" ||
                column.type === "boolean" ? (
                  <Select
                    value={formData.defaultValue?.toString() || ""}
                    onValueChange={(value) =>
                      handleInputChange("defaultValue", value === "true")
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
                ) : formData.dataType === "date" ||
                  column.dataType === "date" ||
                  column.type === "date" ? (
                  <Input
                    id="defaultValue"
                    type="date"
                    value={formData.defaultValue || ""}
                    onChange={(e) =>
                      handleInputChange("defaultValue", e.target.value)
                    }
                  />
                ) : (
                  <Input
                    id="defaultValue"
                    value={formData.defaultValue || ""}
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
                  value={formData.width || column.width || 150}
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
                    checked={
                      formData.includeInForms ?? column.includeInForms ?? true
                    }
                    onCheckedChange={(checked) =>
                      handleInputChange("includeInForms", checked)
                    }
                    disabled={
                      column.dataType === "function" ||
                      column.type === "function"
                    }
                  />
                  <Label htmlFor="includeInForms">
                    {column.dataType === "function" ||
                    column.type === "function"
                      ? "Always false for functions"
                      : "Show in form inputs"}
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for function columns */}
          {(column.dataType === "function" || column.type === "function") && (
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <Label className="text-amber-800 font-medium">
                  Function Column Notice
                </Label>
              </div>
              <p className="text-sm text-amber-700 mt-2">
                This column contains a JavaScript function. Function columns
                automatically have "Include in Forms" set to false and cannot be
                edited in regular forms.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Column
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
