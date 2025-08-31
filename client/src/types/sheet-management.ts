export type ColumnType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "function"
  | "email"
  | "currency";

export interface JSFunction {
  id: string;
  name: string;
  parameters: string[];
  description?: string;
  filePath: string;
}

export interface SheetColumn {
  id: string;
  columnName: string; // Human-readable column name
  dataType: ColumnType;
  function?: JSFunction; // Only when dataType is "function"
  parameters?: any[]; // Parameters for the function
  includeInForms: boolean; // Whether to include in forms

  // Legacy fields for backward compatibility
  name: string; // Keep for existing code
  type: ColumnType; // Keep for existing code

  // Column behavior and styling
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  options?: string[]; // For select type columns
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => boolean | string;
  };
  order: number;
}

export interface SheetConfig {
  id: string;
  name: string;
  columns: SheetColumn[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface SheetData {
  id: string;
  [key: string]: any; // Dynamic column values
}

export interface ColumnSettingsModalProps {
  column: SheetColumn | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: SheetColumn) => void;
  onDelete?: (columnId: string) => void;
}

export interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (column: Omit<SheetColumn, "id">) => void;
  existingColumns: SheetColumn[];
}
