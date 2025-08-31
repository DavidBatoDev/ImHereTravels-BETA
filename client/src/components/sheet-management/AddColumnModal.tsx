"use client";

import { useState } from "react";
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
import { Plus } from "lucide-react";

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (column: Omit<SheetColumn, "id" | "order">) => void;
  existingColumns: SheetColumn[];
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

export default function AddColumnModal({
  isOpen,
  onClose,
  onAdd,
  existingColumns,
  availableFunctions = [],
}: AddColumnModalProps) {
  const [formData, setFormData] = useState({
    columnName: "",
    dataType: "" as ColumnType,
    function: "",
    arguments: [],
    includeInForms: true,
    options: "",
    defaultValue: "",
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    console.log("🔍 Form validation check:", {
      columnName: !!formData.columnName,
      dataType: !!formData.dataType,
      functionValid:
        formData.dataType !== "function" ||
        (formData.function && formData.function.trim() !== ""),
      selectValid:
        formData.dataType !== "select" ||
        (formData.options && formData.options.trim() !== ""),
    });

    if (!formData.columnName || !formData.dataType) return;

    // For function columns, ensure function is selected
    if (
      formData.dataType === "function" &&
      (!formData.function || formData.function.trim() === "")
    ) {
      console.error("❌ Function column must have a function selected");
      return;
    }

    // For select columns, ensure options are provided
    if (
      formData.dataType === "select" &&
      (!formData.options || formData.options.trim() === "")
    ) {
      console.error("❌ Select column must have options");
      return;
    }

    // For function columns, automatically set includeInForms to false
    if (formData.dataType === "function") {
      formData.includeInForms = false;
    }

    // Clean arguments to remove undefined values
    const cleanArguments =
      formData.arguments && formData.arguments.length > 0
        ? formData.arguments
            .map((arg) => {
              const cleanArg = { ...arg };
              Object.keys(cleanArg).forEach((key) => {
                if (cleanArg[key] === undefined) {
                  delete cleanArg[key];
                }
              });
              return cleanArg;
            })
            .filter((arg) => Object.keys(arg).length > 0)
        : undefined;

    console.log("🔍 Function field value:", formData.function);
    console.log("🔍 Clean arguments:", cleanArguments);

    const newColumn: Omit<SheetColumn, "id" | "order"> = {
      columnName: formData.columnName,
      dataType: formData.dataType,
      includeInForms: formData.includeInForms,
      ...(formData.dataType === "function" &&
        formData.function &&
        formData.function.trim() !== "" && {
          function: formData.function,
          arguments: cleanArguments,
        }),
      ...(formData.dataType === "select" && {
        options: formData.options
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
      ...(formData.defaultValue && { defaultValue: formData.defaultValue }),
    };

    console.log("🔍 Form data:", formData);
    console.log("🔍 New column data:", newColumn);

    onAdd(newColumn);
    onClose();
    // Reset form
    setFormData({
      columnName: "",
      dataType: "" as ColumnType,
      function: "",
      arguments: [],
      includeInForms: true,

      options: "",
      defaultValue: "",
    });
  };

  const isFormValid =
    formData.columnName &&
    formData.dataType &&
    (formData.dataType !== "function" ||
      (formData.function && formData.function.trim() !== "")) &&
    (formData.dataType !== "select" ||
      (formData.options && formData.options.trim() !== ""));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Column
          </DialogTitle>
          <DialogDescription>
            Create a new column for your sheet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Settings */}
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

          {/* Function Selection */}
          {formData.dataType === "function" && (
            <div className="space-y-2">
              <Label htmlFor="function">TypeScript Function *</Label>
              <Select
                value={formData.function}
                onValueChange={(value) => {
                  console.log("🔍 Function selected:", value);
                  handleInputChange("function", value);
                }}
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
                                <Select
                                  value={
                                    formData.arguments?.[index]
                                      ?.columnReference || ""
                                  }
                                  onValueChange={(value) => {
                                    const newArgs = [
                                      ...(formData.arguments || []),
                                    ];
                                    newArgs[index] = {
                                      ...newArgs[index],
                                      name: arg.name,
                                      type: arg.type,
                                      value: "",
                                      columnReference: value,
                                      hasDefault: arg.hasDefault,
                                      isOptional: arg.isOptional,
                                    };
                                    handleInputChange("arguments", newArgs);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a column to reference" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {existingColumns.map((col) => (
                                      <SelectItem
                                        key={col.id}
                                        value={col.columnName}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>{col.columnName}</span>
                                          <span className="text-xs text-gray-500 ml-2">
                                            {col.dataType}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-blue-600">
                                  This argument will use the value from the
                                  selected column
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
                checked={formData.includeInForms}
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

          {/* Behavior Settings */}
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
