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
import {
  SheetColumn,
  ColumnType,
  TypeScriptFunction,
} from "@/types/sheet-management";
import { Trash2, Settings } from "lucide-react";

interface ColumnSettingsModalProps {
  column: SheetColumn | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: SheetColumn) => void;
  onDelete?: (columnId: string) => void;
  availableFunctions?: TypeScriptFunction[];
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
  availableFunctions = [],
}: ColumnSettingsModalProps) {
  const [formData, setFormData] = useState<Partial<SheetColumn>>({});
  const [optionsText, setOptionsText] = useState("");

  useEffect(() => {
    if (column) {
      setFormData(column);
      setOptionsText(column.options?.join(", ") || "");
    } else {
      setFormData({});
      setOptionsText("");
    }
  }, [column]);

  const handleInputChange = (field: keyof SheetColumn, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.columnName || !formData.dataType) return;

    // For function columns, automatically set includeInForms to false
    if (formData.dataType === "function") {
      formData.includeInForms = false;
    }

    const updatedColumn: SheetColumn = {
      ...column!,
      ...formData,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {column ? `Edit Column: ${column.columnName}` : "Add New Column"}
          </DialogTitle>
          <DialogDescription>
            Configure the column properties and behavior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Column Name *</Label>
              <Input
                id="columnName"
                value={formData.columnName || ""}
                onChange={(e) =>
                  handleInputChange("columnName", e.target.value)
                }
                placeholder="Enter column name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataType">Data Type *</Label>
              <Select
                value={formData.dataType || ""}
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

          {/* Select Options */}
          {formData.dataType === "select" && (
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

          {/* Function Selection */}
          {formData.dataType === "function" && (
            <div className="space-y-2">
              <Label htmlFor="function">TypeScript Function *</Label>
              <Select
                value={formData.function || ""}
                onValueChange={(value) => handleInputChange("function", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a TypeScript function" />
                </SelectTrigger>
                <SelectContent>
                  {availableFunctions.map((func) => (
                    <SelectItem key={func.id} value={func.id}>
                      {func.functionName} ({func.parameterCount} params)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.function && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-500">
                    Function:{" "}
                    {
                      availableFunctions.find((f) => f.id === formData.function)
                        ?.functionName
                    }
                    <br />
                    Parameters:{" "}
                    {availableFunctions
                      .find((f) => f.id === formData.function)
                      ?.arguments?.map((arg) => `${arg.name}: ${arg.type}`)
                      .join(", ")}
                  </div>

                  {/* Function Arguments */}
                  <div className="space-y-3">
                    <Label>Function Arguments</Label>
                    {availableFunctions
                      .find((f) => f.id === formData.function)
                      ?.arguments?.map((arg, index) => (
                        <div key={index} className="space-y-2">
                          <Label htmlFor={`arg-${index}`} className="text-sm">
                            {arg.name} ({arg.type})
                            {arg.hasDefault && " - Has default"}
                            {arg.isOptional && " - Optional"}
                          </Label>

                          {/* Column Reference Selector */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`use-column-ref-${index}`}
                                checked={
                                  !!formData.arguments?.[index]?.columnReference
                                }
                                onCheckedChange={(checked) => {
                                  const newArgs = [
                                    ...(formData.arguments || []),
                                  ];
                                  newArgs[index] = {
                                    ...newArgs[index],
                                    name: arg.name,
                                    type: arg.type,
                                    value: checked
                                      ? ""
                                      : newArgs[index]?.value || "",
                                    columnReference: checked ? "" : undefined,
                                    hasDefault: arg.hasDefault,
                                    isOptional: arg.isOptional,
                                  };
                                  handleInputChange("arguments", newArgs);
                                }}
                              />
                              <Label
                                htmlFor={`use-column-ref-${index}`}
                                className="text-sm"
                              >
                                Use Column Reference
                              </Label>
                            </div>

                            {formData.arguments?.[index]?.columnReference !==
                            undefined ? (
                              // Column Reference Input
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`column-ref-${index}`}
                                  className="text-xs text-gray-600"
                                >
                                  Select Column to Reference
                                </Label>
                                <p className="text-xs text-blue-600">
                                  Column reference functionality will be
                                  available when editing existing columns
                                </p>
                              </div>
                            ) : (
                              // Regular Value Input
                              <Input
                                id={`arg-${index}`}
                                value={formData.arguments?.[index]?.value || ""}
                                onChange={(e) => {
                                  const newArgs = [
                                    ...(formData.arguments || []),
                                  ];
                                  newArgs[index] = {
                                    ...newArgs[index],
                                    name: arg.name,
                                    type: arg.type,
                                    value: e.target.value,
                                    columnReference: undefined,
                                    hasDefault: arg.hasDefault,
                                    isOptional: arg.isOptional,
                                  };
                                  handleInputChange("arguments", newArgs);
                                }}
                                placeholder={
                                  arg.hasDefault
                                    ? "Has default value"
                                    : "Enter value"
                                }
                                className={
                                  arg.isOptional
                                    ? "border-gray-300"
                                    : "border-red-300"
                                }
                              />
                            )}
                          </div>

                          {arg.isOptional && (
                            <p className="text-xs text-gray-500">
                              This parameter is optional
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Include In Forms Toggle */}
          {formData.dataType !== "function" && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="includeInForms">Include in Forms</Label>
                <p className="text-sm text-gray-500">
                  Show this column in booking forms
                </p>
              </div>
              <Switch
                id="includeInForms"
                checked={formData.includeInForms ?? true}
                onCheckedChange={(checked) =>
                  handleInputChange("includeInForms", checked)
                }
              />
            </div>
          )}

          {/* Default Value */}
          {formData.dataType !== "function" && (
            <div className="space-y-2">
              <Label htmlFor="defaultValue">Default Value</Label>
              {formData.dataType === "boolean" ? (
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
              ) : formData.dataType === "date" ? (
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

          {/* Validation */}
          {(formData.dataType === "number" ||
            formData.dataType === "string") && (
            <div className="space-y-4">
              <Label>Validation Rules</Label>
              <div className="grid grid-cols-2 gap-4">
                {formData.dataType === "number" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="min">Minimum Value</Label>
                      <Input
                        id="min"
                        type="number"
                        value={formData.validation?.min || ""}
                        onChange={(e) =>
                          handleInputChange("validation", {
                            ...formData.validation,
                            min: parseFloat(e.target.value) || undefined,
                          })
                        }
                        placeholder="No minimum"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max">Maximum Value</Label>
                      <Input
                        id="max"
                        type="number"
                        value={formData.validation?.max || ""}
                        onChange={(e) =>
                          handleInputChange("validation", {
                            ...formData.validation,
                            max: parseFloat(e.target.value) || undefined,
                          })
                        }
                        placeholder="No maximum"
                      />
                    </div>
                  </>
                )}
                {formData.dataType === "string" && (
                  <div className="space-y-2">
                    <Label htmlFor="pattern">Pattern (Regex)</Label>
                    <Input
                      id="pattern"
                      value={formData.validation?.pattern || ""}
                      onChange={(e) =>
                        handleInputChange("validation", {
                          ...formData.validation,
                          pattern: e.target.value || undefined,
                        })
                      }
                      placeholder="e.g., ^[A-Za-z]+$"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Behavior Settings */}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {column && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Column
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isFormValid}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
