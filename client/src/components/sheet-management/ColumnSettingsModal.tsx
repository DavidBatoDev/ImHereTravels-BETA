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
  FunctionArgument,
} from "@/types/sheet-management";
import { Trash2, Settings, Lock } from "lucide-react";
import { LockColumnModal } from "./LockColumnModal";
import bookingSheetColumnService from "@/services/booking-sheet-columns-service";

interface ColumnSettingsModalProps {
  column: SheetColumn | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: SheetColumn) => void;
  onDelete?: (columnId: string) => void;
  availableFunctions?: TypeScriptFunction[];
  existingColumns?: SheetColumn[];
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
  existingColumns = [],
}: ColumnSettingsModalProps) {
  const [formData, setFormData] = useState<Partial<SheetColumn>>({});
  const [optionsText, setOptionsText] = useState("");
  const [lockColumnModal, setLockColumnModal] = useState<{
    isOpen: boolean;
    columnName: string;
  }>({ isOpen: false, columnName: "" });

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

    // Clean args
    const cleanArgs = Array.isArray(formData.arguments)
      ? (formData.arguments as any[]).map((arg) => {
          const copy: any = { ...arg };
          Object.keys(copy).forEach((k) => {
            if (copy[k] === undefined) delete copy[k];
          });
          if (copy.columnReference === "") delete copy.columnReference;
          if (Array.isArray(copy.columnReferences)) {
            copy.columnReferences = copy.columnReferences.filter(
              (x: string) => !!x
            );
            if (copy.columnReferences.length === 0)
              delete copy.columnReferences;
          }
          return copy;
        })
      : undefined;

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
      ...(cleanArgs ? { arguments: cleanArgs as any } : {}),
    };

    onSave(updatedColumn);
    onClose();
  };

  const handleDelete = () => {
    if (column) {
      // Check if it's a default column first
      if (bookingSheetColumnService.isDefaultColumn(column.id)) {
        setLockColumnModal({
          isOpen: true,
          columnName: column.columnName,
        });
        return;
      }

      // Not a default column, proceed with deletion
      if (onDelete) {
        onDelete(column.id);
        onClose();
      }
    }
  };

  const isFormValid = formData.columnName && formData.dataType;

  const selectedFunction = (
    formData.function
      ? availableFunctions.find((f) => f.id === formData.function)
      : undefined
  ) as TypeScriptFunction | undefined;

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

          {/* Parent Tab */}
          <div className="space-y-2">
            <Label htmlFor="parentTab">Parent Tab</Label>
            <Input
              id="parentTab"
              value={formData.parentTab || ""}
              onChange={(e) => handleInputChange("parentTab", e.target.value)}
              placeholder="Enter parent tab name (e.g., Core Booking, Payment Details)"
            />
            <p className="text-sm text-gray-500">
              Organize columns into logical groups or tabs
            </p>
          </div>

          {/* Column Color */}
          <div className="space-y-2">
            <Label htmlFor="color">Column Color</Label>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { value: "none", label: "None", bg: "bg-white", ring: "" },
                {
                  value: "purple",
                  label: "Purple",
                  bg: "bg-purple-600",
                  ring: "ring-purple-600",
                },
                {
                  value: "blue",
                  label: "Blue",
                  bg: "bg-blue-600",
                  ring: "ring-blue-600",
                },
                {
                  value: "green",
                  label: "Green",
                  bg: "bg-green-600",
                  ring: "ring-green-600",
                },
                {
                  value: "yellow",
                  label: "Yellow",
                  bg: "bg-yellow-500",
                  ring: "ring-yellow-500",
                },
                {
                  value: "orange",
                  label: "Orange",
                  bg: "bg-orange-500",
                  ring: "ring-orange-500",
                },
                {
                  value: "red",
                  label: "Red",
                  bg: "bg-red-600",
                  ring: "ring-red-600",
                },
                {
                  value: "pink",
                  label: "Pink",
                  bg: "bg-pink-600",
                  ring: "ring-pink-600",
                },
                {
                  value: "cyan",
                  label: "Cyan",
                  bg: "bg-cyan-500",
                  ring: "ring-cyan-500",
                },
                {
                  value: "gray",
                  label: "Gray",
                  bg: "bg-gray-500",
                  ring: "ring-gray-500",
                },
              ].map((c) => {
                const selected =
                  ((formData as any).color || "none") === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    className={`relative h-8 w-8 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      selected ? `ring-2 ${c.ring} ring-offset-2` : ""
                    }`}
                    onClick={() => handleInputChange("color" as any, c.value)}
                    title={c.label}
                    aria-pressed={selected}
                  >
                    {c.value === "none" ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-6 w-6 rounded-full border border-gray-300 bg-white" />
                        <span className="absolute left-1 right-1 h-[2px] rotate-45 bg-gray-400" />
                      </span>
                    ) : (
                      <span
                        className={`absolute inset-1 rounded-full ${c.bg}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              Applies a light background tint to this column.
            </p>
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
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 bg-muted text-foreground text-xs font-medium">
                          {func.name}
                        </span>
                        <span>-</span>
                        <span>
                          {`${func.functionName}(*${func.parameterCount})`}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedFunction && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 bg-muted text-foreground text-xs font-medium">
                        {selectedFunction.name}
                      </span>
                      <span>-</span>
                      <span>
                        {`${selectedFunction.functionName}(*${selectedFunction.parameterCount})`}
                      </span>
                    </span>
                    <br />
                    Parameters:{" "}
                    {selectedFunction.arguments
                      ?.map((a) => `${a.name}: ${a.type}`)
                      .join(", ")}
                  </div>

                  <div className="space-y-3">
                    <Label>Function Arguments</Label>
                    {selectedFunction.arguments?.map((arg, index) => {
                      const t = (arg.type || "").toLowerCase();
                      const isArrayArg =
                        t === "{}" || t.includes("[]") || t.includes("array");
                      const argState: any =
                        (formData.arguments || [])[index] || {};
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
                                  const newArgs = [
                                    ...(formData.arguments || []),
                                  ];
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
                              <Label
                                htmlFor={`use-column-ref-${index}`}
                                className="text-sm"
                              >
                                {isArrayArg
                                  ? "Use Column Reference(s)"
                                  : "Use Column Reference"}
                              </Label>
                            </div>

                            {usingRefs ? (
                              isArrayArg ? (
                                <div className="space-y-2">
                                  <Label className="text-xs text-gray-600">
                                    Add Columns to Reference
                                  </Label>
                                  <Select
                                    value=""
                                    onValueChange={(value) => {
                                      const newArgs = [
                                        ...(formData.arguments || []),
                                      ];
                                      const current = (newArgs[index] ||
                                        {}) as any;
                                      const list = Array.isArray(
                                        current.columnReferences
                                      )
                                        ? [...current.columnReferences]
                                        : ([] as string[]);
                                      if (!list.includes(value))
                                        list.push(value);
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
                                      {/* Add ID as a special reference option */}
                                      <SelectItem key="__id__" value="ID">
                                        <div className="flex items-center justify-between">
                                          <span>ID</span>
                                          <span className="text-xs text-gray-500 ml-2">
                                            string
                                          </span>
                                        </div>
                                      </SelectItem>
                                      {existingColumns
                                        .filter((c) => c.id !== column?.id)
                                        .map((col) => (
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
                                  <div className="flex flex-wrap gap-2">
                                    {(argState.columnReferences || []).map(
                                      (ref: string, i: number) => (
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
                                              const newArgs = [
                                                ...(formData.arguments || []),
                                              ];
                                              const current = (newArgs[index] ||
                                                {}) as any;
                                              const list: string[] = [
                                                ...(current.columnReferences ||
                                                  []),
                                              ];
                                              list.splice(i, 1);
                                              newArgs[index] = {
                                                ...current,
                                                columnReferences: list,
                                              } as any;
                                              handleInputChange(
                                                "arguments",
                                                newArgs
                                              );
                                            }}
                                          >
                                            <Trash2
                                              className="h-3.5 w-3.5"
                                              aria-hidden="true"
                                            />
                                            <span className="sr-only">
                                              Remove reference
                                            </span>
                                          </Button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  <p className="text-xs text-blue-600">
                                    This argument will use the values from
                                    selected columns
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label
                                    htmlFor={`column-ref-${index}`}
                                    className="text-xs text-gray-600"
                                  >
                                    Select Column to Reference
                                  </Label>
                                  <Select
                                    value={argState.columnReference || ""}
                                    onValueChange={(value) => {
                                      const newArgs = [
                                        ...(formData.arguments || []),
                                      ];
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
                                      {/* Add ID as a special reference option */}
                                      <SelectItem key="__id__" value="ID">
                                        <div className="flex items-center justify-between">
                                          <span>ID</span>
                                          <span className="text-xs text-gray-500 ml-2">
                                            string
                                          </span>
                                        </div>
                                      </SelectItem>
                                      {existingColumns
                                        .filter((c) => c.id !== column?.id)
                                        .map((col) => (
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
                              )
                            ) : isArrayArg ? (
                              <div className="space-y-1">
                                <Textarea
                                  id={`arg-${index}`}
                                  value={(argState.value as string) || ""}
                                  onChange={(e) => {
                                    const newArgs = [
                                      ...(formData.arguments || []),
                                    ];
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
                                <p className="text-xs text-gray-500">
                                  Separate multiple values with commas
                                </p>
                              </div>
                            ) : (
                              <Input
                                id={`arg-${index}`}
                                value={argState.value || ""}
                                onChange={(e) => {
                                  const newArgs = [
                                    ...(formData.arguments || []),
                                  ];
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
                  value={(formData.defaultValue as any) || ""}
                  onChange={(e) =>
                    handleInputChange("defaultValue", e.target.value)
                  }
                />
              ) : (
                <Input
                  id="defaultValue"
                  value={(formData.defaultValue as any) || ""}
                  onChange={(e) =>
                    handleInputChange("defaultValue", e.target.value)
                  }
                  placeholder="Enter default value"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {column && onDelete && (
              <>
                {bookingSheetColumnService.isDefaultColumn(column.id) ? (
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    className="flex items-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                  >
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Protected Column
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Column
                  </Button>
                )}
              </>
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

      {/* Lock Column Modal */}
      <LockColumnModal
        isOpen={lockColumnModal.isOpen}
        onClose={() =>
          setLockColumnModal({
            isOpen: false,
            columnName: "",
          })
        }
        columnName={lockColumnModal.columnName}
      />
    </Dialog>
  );
}
