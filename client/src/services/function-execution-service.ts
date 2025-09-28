import ts from "typescript";
import { typescriptFunctionService } from "./firebase-function-service";
import { SheetColumn, SheetData } from "@/types/sheet-management";
import {
  auth,
  db,
  storage,
  firebaseUtils,
  functionsUtils,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "@/app/functions/firebase-utils";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

type CompiledFn = (...args: any[]) => any;

class FunctionExecutionService {
  private cache: Map<string, CompiledFn> = new Map();

  // Invalidate a single compiled function by its ts_file id
  invalidate(fileId: string): void {
    this.cache.delete(fileId);
  }

  // Invalidate multiple compiled functions at once
  invalidateMany(fileIds: string[]): void {
    for (const id of fileIds) this.cache.delete(id);
  }

  // Clear all compiled function cache (use sparingly)
  clearAll(): void {
    this.cache.clear();
  }

  // Fetch, transpile, and cache the function by ts_file id
  async getCompiledFunction(fileId: string): Promise<CompiledFn> {
    if (this.cache.has(fileId)) return this.cache.get(fileId)!;

    const tsFile = await typescriptFunctionService.files.getById(fileId);
    if (!tsFile || !tsFile.content) {
      throw new Error(`TS file not found or has no content: ${fileId}`);
    }

    const transpiled = ts.transpileModule(tsFile.content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2018,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: tsFile.name || "temp.ts",
    }).outputText;

    // Build a CommonJS evaluation sandbox with Firebase utilities injected
    const factory = new Function(
      "exports",
      "moduleRef",
      "auth",
      "db",
      "storage",
      "firebaseUtils",
      "functionsUtils",
      "collection",
      "doc",
      "getDocs",
      "addDoc",
      "updateDoc",
      "deleteDoc",
      "query",
      "where",
      "orderBy",
      "serverTimestamp",
      "httpsCallable",
      "functions",
      `${transpiled}; return moduleRef.exports?.default ?? exports?.default ?? moduleRef.exports;`
    ) as (exports: any, moduleRef: any, ...firebaseUtils: any[]) => CompiledFn;

    const moduleObj = { exports: {} as any };
    const compiled = factory(
      moduleObj.exports,
      moduleObj,
      auth,
      db,
      storage,
      firebaseUtils,
      functionsUtils,
      collection,
      doc,
      getDocs,
      addDoc,
      updateDoc,
      deleteDoc,
      query,
      where,
      orderBy,
      serverTimestamp,
      httpsCallable,
      functions
    );

    if (typeof compiled !== "function") {
      throw new Error(`Default export is not a function in file ${fileId}`);
    }

    this.cache.set(fileId, compiled);
    return compiled;
  }

  // Resolve argument list based on column argument mappings and row data
  buildArgs(
    column: SheetColumn,
    row: SheetData,
    allColumns: SheetColumn[]
  ): any[] {
    const argsMeta = column.arguments || [];
    // Pre-index columns by name to avoid repeated linear scans
    const columnsByName = new Map<string, SheetColumn>();
    for (const c of allColumns) {
      if (c.columnName) columnsByName.set(c.columnName, c);
    }

    return argsMeta.map((arg) => {
      const t = (arg.type || "").toLowerCase();

      // If multiple column references are supplied (array-like param)
      if (Array.isArray(arg.columnReferences) && arg.columnReferences.length) {
        const values = arg.columnReferences.map((refName) => {
          const refCol = refName ? columnsByName.get(refName) : undefined;
          return refCol ? row[refCol.id] : undefined;
        });
        return values;
      }

      // Single column reference
      if (arg.columnReference !== undefined && arg.columnReference !== "") {
        const refCol = columnsByName.get(arg.columnReference);
        const value = refCol ? row[refCol.id] : undefined;
        return value;
      }

      // Literal value provided
      if (arg.value !== undefined) {
        // If user passed array in UI it can already be string[]
        if (Array.isArray(arg.value)) return arg.value;

        // Comma-separated for array-like params
        if (
          t.includes("[]") ||
          t === "{}" ||
          t.includes("array") ||
          t.includes("string[]")
        ) {
          if (typeof arg.value === "string") {
            return arg.value
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
          }
        }

        // Basic coercion based on declared arg.type
        if (t.includes("number")) return Number(arg.value);
        if (t.includes("boolean")) return String(arg.value) === "true";
        return arg.value as any;
      }

      // No mapping provided; pass undefined to allow default parameters
      return undefined;
    });
  }
}

export const functionExecutionService = new FunctionExecutionService();
export default functionExecutionService;
