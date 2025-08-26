export type ColumnType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "function"
  | "email"
  | "currency";

export interface SheetColumn {
  id: string;
  name: string;
  type: ColumnType;
  required: boolean;
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
  visible: boolean;
  editable: boolean;
  sortable: boolean;
  filterable: boolean;
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
  onAdd: (column: Omit<SheetColumn, "id" | "order">) => void;
  existingColumns: SheetColumn[];
}
