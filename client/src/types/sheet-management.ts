export type ColumnType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "function"
  | "email"
  | "currency";

export interface FunctionArgument {
  name: string;
  type: string;
  hasDefault: boolean;
  isOptional: boolean;
  isRest: boolean;
  complexity?: string;
  content?: string;
  value?: string; // User input value for the argument
  columnReference?: string; // Reference to another column (e.g., "A1", "B2", or column name)
}

export interface TypeScriptFunction {
  id: string;
  name: string;
  functionName: string;
  fileType: string;
  exportType: string;
  parameterCount: number;
  arguments: FunctionArgument[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastModified: Date;
}

export interface SheetColumn {
  id: string;
  columnName: string; // Human-readable column name
  dataType: ColumnType; // The data type of the column
  function?: string; // ID of the TypeScript function (only for function type)
  arguments?: FunctionArgument[]; // Arguments for the function (only for function type)
  includeInForms: boolean; // Whether to include this column in forms

  // Display and behavior properties
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
  availableFunctions?: TypeScriptFunction[]; // Available TS functions
}

export interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (column: Omit<SheetColumn, "id">) => void;
  existingColumns: SheetColumn[];
  availableFunctions?: TypeScriptFunction[]; // Available TS functions
}
