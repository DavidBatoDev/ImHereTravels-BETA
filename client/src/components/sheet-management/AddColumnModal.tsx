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
import { SheetColumn, ColumnType } from "@/types/sheet-management";
import { Plus } from "lucide-react";

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (column: Omit<SheetColumn, "id" | "order">) => void;
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
    name: "",
    type: "" as ColumnType,
    required: false,
    options: "",
    defaultValue: "",
    visible: true,
    editable: true,
    sortable: true,
    filterable: true,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdd = () => {
    if (!formData.name || !formData.type) return;

    const newColumn: Omit<SheetColumn, "id" | "order"> = {
      name: formData.name,
      type: formData.type,
      required: formData.required,
      options:
        formData.type === "select"
          ? formData.options
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      defaultValue: formData.defaultValue || undefined,
      visible: formData.visible,
      editable: formData.editable,
      sortable: formData.sortable,
      filterable: formData.filterable,
    };

    onAdd(newColumn);
    onClose();
    // Reset form
    setFormData({
      name: "",
      type: "" as ColumnType,
      required: false,
      options: "",
      defaultValue: "",
      visible: true,
      editable: true,
      sortable: true,
      filterable: true,
    });
  };

  const isFormValid = formData.name && formData.type;

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
              <Label htmlFor="name">Column Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter column name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Data Type *</Label>
              <Select
                value={formData.type}
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
          {formData.type !== "function" && (
            <div className="space-y-2">
              <Label htmlFor="defaultValue">Default Value</Label>
              {formData.type === "boolean" ? (
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
              ) : formData.type === "date" ? (
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
          <div className="space-y-4">
            <Label>Column Behavior</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={formData.required}
                  onCheckedChange={(checked) =>
                    handleInputChange("required", checked)
                  }
                />
                <Label htmlFor="required">Required Field</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="visible"
                  checked={formData.visible}
                  onCheckedChange={(checked) =>
                    handleInputChange("visible", checked)
                  }
                />
                <Label htmlFor="visible">Visible</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editable"
                  checked={formData.editable}
                  onCheckedChange={(checked) =>
                    handleInputChange("editable", checked)
                  }
                />
                <Label htmlFor="editable">Editable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="sortable"
                  checked={formData.sortable}
                  onCheckedChange={(checked) =>
                    handleInputChange("sortable", checked)
                  }
                />
                <Label htmlFor="sortable">Sortable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="filterable"
                  checked={formData.filterable}
                  onCheckedChange={(checked) =>
                    handleInputChange("filterable", checked)
                  }
                />
                <Label htmlFor="filterable">Filterable</Label>
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
