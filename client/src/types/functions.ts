// TypeScript Function Management Types
// Updated to reflect AST-based parsing and TypeScript focus

export interface TSFile {
  id: string;
  name: string;
  lastModified: Date;
  content: string;
  isActive: boolean;
  folderId: string;
  createdAt: Date;
  updatedAt: Date;
  hasExportDefault: boolean;
  arguments: TSArgument[]; // Fixed typo from "arguements"
  fileType: "typescript" | "javascript";
  hasTypeAnnotations: boolean;
  complexity: "simple" | "moderate" | "complex";
  exportType: "function" | "class" | "object" | "value" | "none";
  functionName?: string;
  parameterCount: number;
  hasGenerics: boolean;
  hasUnionTypes: boolean;
  hasIntersectionTypes: boolean;
  hasDestructuring: boolean;
  hasRestParameters: boolean;
}

export interface TSArgument {
  name: string;
  type: string;
  isOptional?: boolean;
  hasDefault?: boolean;
  isRest?: boolean;
  description?: string; // For future JSDoc extraction
}

export interface TSFolder {
  id: string;
  name: string;
  isCollapsed: boolean;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  fileCount?: number;
}

export interface CreateFileData {
  name: string;
  content: string;
  isActive?: boolean;
  folderId: string;
  fileType?: "typescript" | "javascript";
}

export interface CreateFolderData {
  name: string;
  isCollapsed?: boolean;
  description?: string;
}

export interface FileAnalysisResult {
  hasExportDefault: boolean;
  arguments: TSArgument[];
  fileType: "typescript" | "javascript";
  hasTypeAnnotations: boolean;
  complexity: "simple" | "moderate" | "complex";
  exportType: "function" | "class" | "object" | "value" | "none";
  functionName?: string;
  parameterCount: number;
  hasGenerics: boolean;
  hasUnionTypes: boolean;
  hasIntersectionTypes: boolean;
  hasDestructuring: boolean;
  hasRestParameters: boolean;
}

// Legacy aliases for backward compatibility
export interface JSFile extends TSFile {}
export interface JSArgument extends TSArgument {}
export interface JSFolder extends TSFolder {}
