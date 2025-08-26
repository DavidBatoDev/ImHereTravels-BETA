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
import { SheetColumn, ColumnType } from "@/types/sheet-management";
import { Trash2, Settings } from "lucide-react";

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
    if (!formData.name || !formData.type) return;

    const updatedColumn: SheetColumn = {
      ...column!,
      ...formData,
      options:
        formData.type === "select"
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

  const isFormValid = formData.name && formData.type;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {column ? `Edit Column: ${column.name}` : "Add New Column"}
          </DialogTitle>
          <DialogDescription>
            Configure the column properties and behavior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Column Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter column name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Data Type *</Label>
              <Select
                value={formData.type || ""}
                onValueChange={(value: ColumnType) =>
                  handleInputChange("type", value)
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
          {formData.type === "select" && (
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
          {formData.type !== "function" && (
            <div className="space-y-2">
              <Label htmlFor="defaultValue">Default Value</Label>
              {formData.type === "boolean" ? (
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
              ) : formData.type === "date" ? (
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
          {(formData.type === "number" || formData.type === "string") && (
            <div className="space-y-4">
              <Label>Validation Rules</Label>
              <div className="grid grid-cols-2 gap-4">
                {formData.type === "number" && (
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
                {formData.type === "string" && (
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
          <div className="space-y-4">
            <Label>Column Behavior</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={formData.required || false}
                  onCheckedChange={(checked) =>
                    handleInputChange("required", checked)
                  }
                />
                <Label htmlFor="required">Required Field</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="visible"
                  checked={formData.visible !== false}
                  onCheckedChange={(checked) =>
                    handleInputChange("visible", checked)
                  }
                />
                <Label htmlFor="visible">Visible</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editable"
                  checked={formData.editable !== false}
                  onCheckedChange={(checked) =>
                    handleInputChange("editable", checked)
                  }
                />
                <Label htmlFor="editable">Editable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="sortable"
                  checked={formData.sortable !== false}
                  onCheckedChange={(checked) =>
                    handleInputChange("sortable", checked)
                  }
                />
                <Label htmlFor="sortable">Sortable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="filterable"
                  checked={formData.filterable !== false}
                  onCheckedChange={(checked) =>
                    handleInputChange("filterable", checked)
                  }
                />
                <Label htmlFor="filterable">Filterable</Label>
              </div>
            </div>
          </div>
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
