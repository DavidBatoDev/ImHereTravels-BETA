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

  // Create Firebase utilities for runtime injection
  const createFirebaseUtils = () => {
    return {
      getCurrentUser: () => ({
        uid: "admin",
        email: "admin@imheretravels.com",
      }),
      isAuthenticated: () => true,
      getUserId: () => "admin",
      ensureAuthenticated: async () => ({
        uid: "admin",
        email: "admin@imheretravels.com",
      }),
      reAuthenticate: async () => {},
      createDocRef: (collectionName: string, docId?: string) =>
        docId
          ? db.collection(collectionName).doc(docId)
          : db.collection(collectionName).doc(),
      createCollectionRef: (collectionName: string) =>
        db.collection(collectionName),
      createStorageRef: (path: string) => null, // Storage not needed for this function
      getDocumentData: async (collectionName: string, docId: string) => {
        const doc = await db.collection(collectionName).doc(docId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      },
      getCollectionData: async (
        collectionName: string,
        constraints?: any[]
      ) => {
        let query: any = db.collection(collectionName);

        if (constraints && constraints.length > 0) {
          for (const constraint of constraints) {
            if (constraint.type === "where") {
              query = query.where(
                constraint.field,
                constraint.operator,
                constraint.value
              );
            } else if (constraint.type === "orderBy") {
              query = query.orderBy(
                constraint.field,
                constraint.direction || "asc"
              );
            }
          }
        }

        const snapshot = await query.get();
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      },
      addDocument: async (collectionName: string, data: any) => {
        const docRef = await db.collection(collectionName).add(data);
        return docRef.id;
      },
      updateDocument: async (
        collectionName: string,
        docId: string,
        data: any
      ) => {
        await db.collection(collectionName).doc(docId).update(data);
        return docId;
      },
      deleteDocument: async (collectionName: string, docId: string) => {
        await db.collection(collectionName).doc(docId).delete();
        return true;
      },
    };
  };

  // Create Firebase function references
  const createFirebaseFunctions = () => {
    return {
      collection: (collectionName: string) => db.collection(collectionName),
      doc: (collectionName: string, docId?: string) =>
        docId
          ? db.collection(collectionName).doc(docId)
          : db.collection(collectionName).doc(),
      getDocs: async (query: any) => {
        const snapshot = await query.get();
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      },
      addDoc: async (collectionRef: any, data: any) => {
        const docRef = await collectionRef.add(data);
        return docRef.id;
      },
      updateDoc: async (docRef: any, data: any) => {
        await docRef.update(data);
        return docRef.id;
      },
      deleteDoc: async (docRef: any) => {
        await docRef.delete();
        return true;
      },
      query: (...args: any[]) => {
        let query: any = db.collection(args[0]);
        for (let i = 1; i < args.length; i++) {
          const constraint = args[i];
          if (constraint.type === "where") {
            query = query.where(
              constraint.field,
              constraint.operator,
              constraint.value
            );
          } else if (constraint.type === "orderBy") {
            query = query.orderBy(
              constraint.field,
              constraint.direction || "asc"
            );
          }
        }
        return query;
      },
      where: (field: string, operator: string, value: any) => ({
        type: "where",
        field,
        operator,
        value,
      }),
      orderBy: (field: string, direction?: string) => ({
        type: "orderBy",
        field,
        direction: direction || "asc",
      }),
      serverTimestamp: () => new Date(),
    };
  };

  const factory = new Function(
    "exports",
    "module",
    "db",
    "auth",
    "storage",
    "firebaseUtils",
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
    `${transpiled}; return module.exports?.default ?? exports?.default ?? module.exports;`
  ) as (exports: any, module: any, ...firebaseUtils: any[]) => any;

  const moduleObj = { exports: {} as any };
  const firebaseUtils = createFirebaseUtils();
  const firebaseFunctions = createFirebaseFunctions();

  const compiled = factory(
    moduleObj.exports,
    moduleObj,
    db,
    null, // auth not needed for this function
    null, // storage not needed for this function
    firebaseUtils,
    firebaseFunctions.collection,
    firebaseFunctions.doc,
    firebaseFunctions.getDocs,
    firebaseFunctions.addDoc,
    firebaseFunctions.updateDoc,
    firebaseFunctions.deleteDoc,
    firebaseFunctions.query,
    firebaseFunctions.where,
    firebaseFunctions.orderBy,
    firebaseFunctions.serverTimestamp
  );

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
  logger.info(`Building args for column ${column.columnName}:`);
  logger.info(`  Arguments metadata: ${JSON.stringify(argsMeta, null, 2)}`);

  return argsMeta.map((arg, index) => {
    const t = (arg.type || "").toLowerCase();
    logger.info(`  Processing argument ${index}: ${JSON.stringify(arg)}`);

    if (Array.isArray(arg.columnReferences) && arg.columnReferences.length) {
      const result = arg.columnReferences.map((refName) => {
        const refCol = allColumns.find((c) => c.columnName === refName);
        const value = refCol ? row[refCol.id] : undefined;
        logger.info(
          `    Column reference "${refName}" -> column ID "${refCol?.id}" -> value "${value}"`
        );
        return value;
      });
      logger.info(
        `    Final result for arg ${index}: ${JSON.stringify(result)}`
      );
      return result;
    }
    if (arg.columnReference !== undefined && arg.columnReference !== "") {
      const refCol = allColumns.find(
        (c) => c.columnName === arg.columnReference
      );
      const value = refCol ? row[refCol.id] : undefined;
      logger.info(
        `    Single column reference "${arg.columnReference}" -> column ID "${refCol?.id}" -> value "${value}"`
      );
      return value;
    }
    if (arg.name) {
      // Check for column reference by column ID in arguments[n].name
      const refCol = allColumns.find((c) => c.id === arg.name);
      const value = refCol ? row[refCol.id] : undefined;
      logger.info(
        `    Column ID reference "${arg.name}" -> column name "${refCol?.columnName}" -> value "${value}"`
      );
      return value;
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
      logger.info(`    Static value for arg ${index}: ${arg.value}`);
      return arg.value as any;
    }
    logger.info(`    No value found for arg ${index}, returning undefined`);
    return undefined;
  });
}

/**
 * Build function dependency graph to find all functions that depend on the updated function
 */
async function buildFunctionDependencyGraph(
  db: FirebaseFirestore.Firestore
): Promise<Map<string, string[]>> {
  const dependencyGraph = new Map<string, string[]>();
  const functionNameToIdMap = new Map<string, string>();

  // Fetch all functions
  const functionsSnap = await db.collection("ts_files").get();
  const functions: any[] = functionsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Build function name to ID mapping
  functions.forEach((func) => {
    if (func.functionName) {
      functionNameToIdMap.set(func.functionName, func.id);
    }
  });

  // Build dependency graph
  functions.forEach((func) => {
    const dependencies = func.functionDependencies || [];
    const dependencyIds = dependencies
      .map((depName: string) => functionNameToIdMap.get(depName))
      .filter((id: string | undefined): id is string => id !== undefined);

    dependencyGraph.set(func.id, dependencyIds);
  });

  return dependencyGraph;
}

/**
 * Get all functions that depend on the given function (transitive closure)
 */
function getDependents(
  functionId: string,
  dependencyGraph: Map<string, string[]>
): string[] {
  const visited = new Set<string>();
  const dependents: string[] = [];

  const collectDependents = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    // Find all functions that depend on currentId
    for (const [funcId, dependencies] of dependencyGraph.entries()) {
      if (dependencies.includes(currentId)) {
        dependents.push(funcId);
        collectDependents(funcId);
      }
    }
  };

  collectDependents(functionId);
  return dependents;
}

/**
 * Build column dependency graph to find columns that depend on other columns
 */
function buildColumnDependencyGraph(
  columns: SheetColumn[]
): Map<string, string[]> {
  const dependencyGraph = new Map<string, string[]>();

  // For each column, find which other columns it depends on
  columns.forEach((column) => {
    const dependencies: string[] = [];

    if (column.arguments) {
      column.arguments.forEach((arg) => {
        // Check for single column reference by column name
        if (arg.columnReference) {
          const refColumn = columns.find(
            (c) => c.columnName === arg.columnReference
          );
          if (refColumn) {
            dependencies.push(refColumn.id);
          }
        }

        // Check for multiple column references by column name
        if (arg.columnReferences && Array.isArray(arg.columnReferences)) {
          arg.columnReferences.forEach((refName) => {
            const refColumn = columns.find((c) => c.columnName === refName);
            if (refColumn) {
              dependencies.push(refColumn.id);
            }
          });
        }

        // Check for column reference by column ID in arguments[n].name
        if (arg.name) {
          const refColumn = columns.find((c) => c.id === arg.name);
          if (refColumn) {
            dependencies.push(refColumn.id);
          }
        }
      });
    }

    dependencyGraph.set(column.id, dependencies);
  });

  return dependencyGraph;
}

/**
 * Get all columns that depend on the given column (transitive closure)
 */
function getColumnDependents(
  columnId: string,
  dependencyGraph: Map<string, string[]>
): string[] {
  const visited = new Set<string>();
  const dependents: string[] = [];

  const collectDependents = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    // Find all columns that depend on currentId
    for (const [colId, dependencies] of dependencyGraph.entries()) {
      if (dependencies.includes(currentId)) {
        dependents.push(colId);
        collectDependents(colId);
      }
    }
  };

  collectDependents(columnId);
  return dependents;
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

      // Build function dependency graph
      const dependencyGraph = await buildFunctionDependencyGraph(db);
      const dependentFunctionIds = getDependents(funcId, dependencyGraph);

      // Include the updated function itself
      const allAffectedFunctionIds = [funcId, ...dependentFunctionIds];

      logger.info(
        `Function ${funcId} updated. Found ${
          dependentFunctionIds.length
        } dependent functions: ${dependentFunctionIds.join(", ")}`
      );

      // Fetch all columns
      const colsSnap = await db.collection("bookingSheetColumns").get();
      const allColumns: SheetColumn[] = colsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Find columns that directly reference the affected functions
      const directlyImpactedColumns = allColumns.filter(
        (c) =>
          c.dataType === "function" &&
          allAffectedFunctionIds.includes(c.function || "")
      );

      if (directlyImpactedColumns.length === 0) {
        logger.info(
          `No columns reference affected functions. Nothing to recompute.`
        );
        return;
      }

      logger.info(
        `Found ${
          directlyImpactedColumns.length
        } directly impacted columns: ${directlyImpactedColumns
          .map((c) => c.columnName)
          .join(", ")}`
      );

      // Build column dependency graph to find columns that depend on the directly impacted columns
      const columnDependencyGraph = buildColumnDependencyGraph(allColumns);
      const allColumnDependents = new Set<string>();

      // Log the column dependency graph for debugging
      logger.info("Column dependency graph:");
      for (const [columnId, dependencies] of columnDependencyGraph.entries()) {
        const column = allColumns.find((c) => c.id === columnId);
        logger.info(
          `  ${column?.columnName || columnId} depends on: ${dependencies
            .map((depId) => {
              const depColumn = allColumns.find((c) => c.id === depId);
              return depColumn?.columnName || depId;
            })
            .join(", ")}`
        );
      }

      // For each directly impacted column, find all columns that depend on it
      for (const column of directlyImpactedColumns) {
        logger.info(
          `Finding dependents for directly impacted column: ${column.columnName} (${column.id})`
        );
        const dependents = getColumnDependents(
          column.id,
          columnDependencyGraph
        );
        logger.info(
          `  Found ${dependents.length} dependents: ${dependents
            .map((depId) => {
              const depColumn = allColumns.find((c) => c.id === depId);
              return depColumn?.columnName || depId;
            })
            .join(", ")}`
        );

        dependents.forEach((depId) => allColumnDependents.add(depId));
        allColumnDependents.add(column.id); // Include the column itself
      }

      // Get all columns that need to be recomputed (directly impacted + their dependents)
      const impactedColumns = allColumns.filter((col) =>
        allColumnDependents.has(col.id)
      );

      logger.info(
        `Found ${
          directlyImpactedColumns.length
        } directly impacted columns and ${
          allColumnDependents.size - directlyImpactedColumns.length
        } dependent columns. Total: ${
          impactedColumns.length
        } columns to recompute.`
      );

      // Prepare compiled functions for all functions used by impacted columns
      const compiledFunctions = new Map<string, (...args: any[]) => any>();

      // Get all function contents
      const functionsSnap = await db.collection("ts_files").get();
      const allFunctions: any[] = functionsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Collect all function IDs used by impacted columns
      const functionsToCompile = new Set<string>();
      for (const column of impactedColumns) {
        if (column.dataType === "function" && column.function) {
          functionsToCompile.add(column.function);
        }
      }

      // Compile all functions used by impacted columns
      for (const functionId of functionsToCompile) {
        const func = allFunctions.find((f) => f.id === functionId);
        if (func && func.content) {
          try {
            const compiled = transpileToFunction(
              func.content,
              func.name || "ts-func.ts"
            );
            compiledFunctions.set(functionId, compiled);
          } catch (error) {
            logger.error(`Failed to compile function ${functionId}:`, error);
          }
        }
      }

      // Stream bookings and recompute
      const bookingsRef = db.collection("bookings");
      const bookingsSnap = await bookingsRef.get();
      let updatedCount = 0;

      for (const doc of bookingsSnap.docs) {
        const row = doc.data();
        const updates: Record<string, any> = {};

        for (const col of impactedColumns) {
          if (!col.function) continue;

          const compiled = compiledFunctions.get(col.function);
          if (!compiled) {
            logger.warn(
              `No compiled function found for column ${col.id} (function ${col.function})`
            );
            continue;
          }

          try {
            const args = buildArgs(col, row, allColumns);
            logger.info(`Computing column ${col.columnName} (${col.id}):`);
            logger.info(`  Function: ${col.function}`);
            logger.info(`  Arguments: ${JSON.stringify(args)}`);
            logger.info(`  Current row value: ${row[col.id]}`);

            const result = await Promise.resolve(compiled(...args));
            logger.info(`  Computed result: ${result}`);

            if (row[col.id] !== result) {
              updates[col.id] = result;
              // Update the row data so subsequent columns can use the new value
              row[col.id] = result;
              logger.info(
                `  ✅ Will update column ${col.columnName} from "${
                  row[col.id]
                }" to "${result}"`
              );
            } else {
              logger.info(`  ⏭️ No change needed for column ${col.columnName}`);
            }
          } catch (error) {
            logger.error(`Error computing column ${col.id}:`, error);
          }
        }

        if (Object.keys(updates).length > 0) {
          await doc.ref.update(updates);
          updatedCount++;
        }
      }

      logger.info(
        `Recomputed columns for ${allAffectedFunctionIds.length} functions across ${bookingsSnap.size} bookings; updated ${updatedCount} documents.`
      );
    } catch (err) {
      logger.error(`Failed to recompute for function ${funcId}:`, err as any);
      throw err;
    }
  }
);
