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
  FunctionArgument,
} from "@/types/sheet-management";
import { Plus, Trash2 } from "lucide-react";

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
    arguments: [] as Partial<FunctionArgument>[],
    includeInForms: true,
    options: "",
    defaultValue: "",
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    if (!formData.columnName || !formData.dataType) return;

    if (
      formData.dataType === "function" &&
      (!formData.function || formData.function.trim() === "")
    ) {
      return;
    }

    if (
      formData.dataType === "select" &&
      (!formData.options || formData.options.trim() === "")
    ) {
      return;
    }

    if (formData.dataType === "function") {
      formData.includeInForms = false;
    }

    // Clean arguments to remove undefined/empty markers
    const cleanArguments =
      formData.arguments && formData.arguments.length > 0
        ? formData.arguments
            .map((arg) => {
              const copy: any = { ...arg };
              Object.keys(copy).forEach((k) => {
                if (copy[k] === undefined) delete copy[k];
              });
              // Remove empty string reference markers
              if (copy.columnReference === "") delete copy.columnReference;
              if (Array.isArray(copy.columnReferences)) {
                copy.columnReferences = copy.columnReferences.filter((x: string) => !!x);
                if (copy.columnReferences.length === 0) delete copy.columnReferences;
              }
              return copy;
            })
            .filter((arg) => Object.keys(arg).length > 2) // keep only args with meaningful fields besides name/type
        : undefined;

    const newColumn: Omit<SheetColumn, "id" | "order"> = {
      columnName: formData.columnName,
      dataType: formData.dataType,
      includeInForms: formData.includeInForms,
      ...(formData.dataType === "function" &&
        formData.function && {
          function: formData.function,
          arguments: cleanArguments as any,
        }),
      ...(formData.dataType === "select" && {
        options: formData.options
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
      ...(formData.defaultValue && { defaultValue: formData.defaultValue }),
    };

    onAdd(newColumn);
    onClose();
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
    !!formData.columnName &&
    !!formData.dataType &&
    (formData.dataType !== "function" ||
      (formData.function && formData.function.trim() !== "")) &&
    (formData.dataType !== "select" ||
      (formData.options && formData.options.trim() !== ""));

  const selectedFunction = availableFunctions.find(
    (f) => f.id === formData.function
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Column
          </DialogTitle>
          <DialogDescription>Create a new column for your sheet</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Column Name *</Label>
              <Input
                id="columnName"
                value={formData.columnName}
                onChange={(e) => handleInputChange("columnName", e.target.value)}
                placeholder="Enter column name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataType">Data Type *</Label>
              <Select
                value={formData.dataType}
                onValueChange={(value: ColumnType) => handleInputChange("dataType", value)}
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
              <p className="text-sm text-gray-500">Separate multiple options with commas</p>
            </div>
          )}

          {/* Function Selection */}
          {formData.dataType === "function" && (
            <div className="space-y-2">
              <Label htmlFor="function">TypeScript Function *</Label>
              <Select
                value={formData.function}
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

              {selectedFunction && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-500">
                    Function: {selectedFunction.functionName}
                    <br />
                    Parameters: {selectedFunction.arguments?.map((a) => `${a.name}: ${a.type}`).join(", ")}
                  </div>

                  <div className="space-y-3">
                    <Label>Function Arguments</Label>
                    {selectedFunction.arguments?.map((arg, index) => {
                      const t = (arg.type || "").toLowerCase();
                      const isArrayArg = t === "{}" || t.includes("[]") || t.includes("array");
                      const argState: any = (formData.arguments || [])[index] || {};
                      const usingRefs = isArrayArg
                        ? argState.columnReferences !== undefined
                        : argState.columnReference !== undefined;
                      return (
                        <div key={index} className="space-y-2">
                          <Label htmlFor={`arg-${index}`} className="text-sm">
                            {arg.name} ({arg.type})
                            {arg.hasDefault && " - Has default"}
                            {arg.isOptional && " - Optional"}
                          </Label>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`use-column-ref-${index}`}
                                checked={!!usingRefs}
                                onCheckedChange={(checked) => {
                                  const newArgs = [...(formData.arguments || [])];
                                  const current = (newArgs[index] || {}) as any;
                                  const base: any = {
                                    ...current,
                                    name: arg.name,
                                    type: arg.type,
                                    hasDefault: arg.hasDefault,
                                    isOptional: arg.isOptional,
                                  };
                                  if (checked) {
                                    if (isArrayArg) {
                                      base.columnReferences = [] as string[];
                                      delete base.columnReference;
                                      base.value = "";
                                    } else {
                                      base.columnReference = "" as string;
                                      delete base.columnReferences;
                                      base.value = "";
                                    }
                                  } else {
                                    delete base.columnReference;
                                    delete base.columnReferences;
                                    base.value = "";
                                  }
                                  newArgs[index] = base;
                                  handleInputChange("arguments", newArgs);
                                }}
                              />
                              <Label htmlFor={`use-column-ref-${index}`} className="text-sm">
                                {isArrayArg ? "Use Column Reference(s)" : "Use Column Reference"}
                              </Label>
                            </div>

                            {usingRefs ? (
                              isArrayArg ? (
                                <div className="space-y-2">
                                  <Label className="text-xs text-gray-600">Add Columns to Reference</Label>
                                  <Select
                                    value=""
                                    onValueChange={(value) => {
                                      const newArgs = [...(formData.arguments || [])];
                                      const current = (newArgs[index] || {}) as any;
                                      const list = Array.isArray(current.columnReferences)
                                        ? [...current.columnReferences]
                                        : ([] as string[]);
                                      if (!list.includes(value)) list.push(value);
                                      newArgs[index] = {
                                        ...current,
                                        name: arg.name,
                                        type: arg.type,
                                        columnReferences: list,
                                        value: "",
                                        hasDefault: arg.hasDefault,
                                        isOptional: arg.isOptional,
                                      } as any;
                                      handleInputChange("arguments", newArgs);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a column to add" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {existingColumns.map((col) => (
                                        <SelectItem key={col.id} value={col.columnName}>
                                          <div className="flex items-center justify-between">
                                            <span>{col.columnName}</span>
                                            <span className="text-xs text-gray-500 ml-2">{col.dataType}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex flex-wrap gap-2">
                                    {(argState.columnReferences || []).map((ref: string, i: number) => (
                                      <div
                                        key={`${ref}-${i}`}
                                        className="flex items-center gap-1 rounded border px-2 py-1 text-xs"
                                      >
                                        <span>{ref}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 px-1 text-red-600"
                                          onClick={() => {
                                            const newArgs = [...(formData.arguments || [])];
                                            const current = (newArgs[index] || {}) as any;
                                            const list: string[] = [...(current.columnReferences || [])];
                                            list.splice(i, 1);
                                            newArgs[index] = {
                                              ...current,
                                              columnReferences: list,
                                            } as any;
                                            handleInputChange("arguments", newArgs);
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                          <span className="sr-only">Remove reference</span>
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-xs text-blue-600">This argument will use the values from selected columns</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label htmlFor={`column-ref-${index}`} className="text-xs text-gray-600">
                                    Select Column to Reference
                                  </Label>
                                  <Select
                                    value={argState.columnReference || ""}
                                    onValueChange={(value) => {
                                      const newArgs = [...(formData.arguments || [])];
                                      newArgs[index] = {
                                        ...argState,
                                        name: arg.name,
                                        type: arg.type,
                                        value: "",
                                        columnReference: value,
                                        hasDefault: arg.hasDefault,
                                        isOptional: arg.isOptional,
                                      } as any;
                                      handleInputChange("arguments", newArgs);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a column to reference" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {existingColumns.map((col) => (
                                        <SelectItem key={col.id} value={col.columnName}>
                                          <div className="flex items-center justify-between">
                                            <span>{col.columnName}</span>
                                            <span className="text-xs text-gray-500 ml-2">{col.dataType}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-blue-600">This argument will use the value from the selected column</p>
                                </div>
                              )
                            ) : isArrayArg ? (
                              <div className="space-y-1">
                                <Textarea
                                  id={`arg-${index}`}
                                  value={(argState.value as string) || ""}
                                  onChange={(e) => {
                                    const newArgs = [...(formData.arguments || [])];
                                    newArgs[index] = {
                                      ...argState,
                                      name: arg.name,
                                      type: arg.type,
                                      value: e.target.value,
                                      columnReferences: undefined,
                                      columnReference: undefined,
                                      hasDefault: arg.hasDefault,
                                      isOptional: arg.isOptional,
                                    } as any;
                                    handleInputChange("arguments", newArgs);
                                  }}
                                  placeholder="Enter comma-separated values"
                                  rows={3}
                                />
                                <p className="text-xs text-gray-500">Separate multiple values with commas</p>
                              </div>
                            ) : (
                              <Input
                                id={`arg-${index}`}
                                value={argState.value || ""}
                                onChange={(e) => {
                                  const newArgs = [...(formData.arguments || [])];
                                  newArgs[index] = {
                                    ...argState,
                                    name: arg.name,
                                    type: arg.type,
                                    value: e.target.value,
                                    columnReference: undefined,
                                    columnReferences: undefined,
                                    hasDefault: arg.hasDefault,
                                    isOptional: arg.isOptional,
                                  } as any;
                                  handleInputChange("arguments", newArgs);
                                }}
                                placeholder={arg.hasDefault ? "Has default value" : "Enter value"}
                                className={arg.isOptional ? "border-gray-300" : "border-red-300"}
                              />
                            )}
                          </div>

                          {arg.isOptional && (
                            <p className="text-xs text-gray-500">This parameter is optional</p>
                          )}
                        </div>
                      );
                    })}
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
                <p className="text-sm text-gray-500">Show this column in booking forms</p>
              </div>
              <Switch
                id="includeInForms"
                checked={formData.includeInForms}
                onCheckedChange={(checked) => handleInputChange("includeInForms", checked)}
              />
            </div>
          )}

          {/* Default Value */}
          {formData.dataType !== "function" && (
            <div className="space-y-2">
              <Label htmlFor="defaultValue">Default Value</Label>
              {formData.dataType === "boolean" ? (
                <Select value={formData.defaultValue} onValueChange={(value) => handleInputChange("defaultValue", value)}>
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
                  onChange={(e) => handleInputChange("defaultValue", e.target.value)}
                />
              ) : (
                <Input
                  id="defaultValue"
                  value={formData.defaultValue}
                  onChange={(e) => handleInputChange("defaultValue", e.target.value)}
                  placeholder="Enter default value"
                />
              )}
            </div>
          )}
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
