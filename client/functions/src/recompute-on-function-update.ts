import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import ts from "typescript";

type SheetColumn = {
  id: string;
  columnName: string;
  dataType: string;
  function?: string; // ts_files id
  arguments?: Array<{
    name: string;
    type?: string;
    value?: any;
    columnReference?: string;
    columnReferences?: string[];
  }>;
};

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

function transpileToFunction(
  source: string,
  fileName = "temp.ts"
): (...args: any[]) => any {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      esModuleInterop: true,
      allowJs: true,
    },
    fileName,
  }).outputText;

  const factory = new Function(
    "exports",
    "module",
    `${transpiled}; return module.exports?.default ?? exports?.default ?? module.exports;`
  ) as (exports: any, module: any) => any;

  const moduleObj = { exports: {} as any };
  const compiled = factory(moduleObj.exports, moduleObj);
  if (typeof compiled !== "function") {
    throw new Error("Default export is not a function after transpile");
  }
  return compiled as (...args: any[]) => any;
}

function buildArgs(
  column: SheetColumn,
  row: Record<string, any>,
  allColumns: SheetColumn[]
): any[] {
  const argsMeta = column.arguments || [];
  return argsMeta.map((arg) => {
    const t = (arg.type || "").toLowerCase();
    if (Array.isArray(arg.columnReferences) && arg.columnReferences.length) {
      return arg.columnReferences.map((refName) => {
        const refCol = allColumns.find((c) => c.columnName === refName);
        return refCol ? row[refCol.id] : undefined;
      });
    }
    if (arg.columnReference !== undefined && arg.columnReference !== "") {
      const refCol = allColumns.find(
        (c) => c.columnName === arg.columnReference
      );
      return refCol ? row[refCol.id] : undefined;
    }
    if (arg.value !== undefined) {
      if (Array.isArray(arg.value)) return arg.value;
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
      if (t.includes("number")) return Number(arg.value);
      if (t.includes("boolean")) return String(arg.value) === "true";
      return arg.value as any;
    }
    return undefined;
  });
}

export const onTypeScriptFunctionUpdated = onDocumentUpdated(
  {
    document: "ts_files/{funcId}",
    region: "asia-southeast1",
    maxInstances: 5,
    timeoutSeconds: 540,
    memory: "1GiB",
  },
  async (event) => {
    const funcId = event.params.funcId as string;
    try {
      const after = event.data?.after?.data() as any;
      if (!after || !after.content) {
        logger.warn(
          `ts_files/${funcId} updated without content; skipping recompute.`
        );
        return;
      }

      // Fetch all columns that reference this function
      const colsSnap = await db.collection("bookingSheetColumns").get();
      const allColumns: SheetColumn[] = colsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      const impactedColumns = allColumns.filter(
        (c) => c.dataType === "function" && c.function === funcId
      );
      if (impactedColumns.length === 0) {
        logger.info(
          `No columns reference function ${funcId}. Nothing to recompute.`
        );
        return;
      }

      // Prepare compiled function
      const compiled = transpileToFunction(
        after.content,
        after.name || "ts-func.ts"
      );

      // Stream bookings and recompute
      const bookingsRef = db.collection("bookings");
      const bookingsSnap = await bookingsRef.get();
      let updatedCount = 0;

      for (const doc of bookingsSnap.docs) {
        const row = doc.data();
        const updates: Record<string, any> = {};

        for (const col of impactedColumns) {
          const args = buildArgs(col, row, allColumns);
          const result = await Promise.resolve(compiled(...args));
          if (row[col.id] !== result) {
            updates[col.id] = result;
          }
        }

        if (Object.keys(updates).length > 0) {
          await doc.ref.update(updates);
          updatedCount++;
        }
      }

      logger.info(
        `Recomputed columns for function ${funcId} across ${bookingsSnap.size} bookings; updated ${updatedCount} documents.`
      );
    } catch (err) {
      logger.error(`Failed to recompute for function ${funcId}:`, err as any);
      throw err;
    }
  }
);
