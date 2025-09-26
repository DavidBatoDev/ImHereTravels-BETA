import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

type SheetColumn = {
  id: string;
  columnName: string;
  dataType: string;
  function?: string;
  arguments?: Array<{
    name?: string;
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

export const testRecompute = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 1,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    try {
      logger.info("🧪 Starting test recompute...");

      // Get all columns
      const colsSnap = await db.collection("bookingSheetColumns").get();
      const allColumns: SheetColumn[] = colsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as SheetColumn[];

      logger.info(`📋 Found ${allColumns.length} columns:`);
      allColumns.forEach((col, index) => {
        logger.info(`--- Column ${index + 1}: ${col.columnName} ---`);
        logger.info(`ID: ${col.id}`);
        logger.info(`DataType: ${col.dataType}`);
        logger.info(`Function: ${col.function}`);
        logger.info(`Arguments: ${JSON.stringify(col.arguments, null, 2)}`);
      });

      // Build column dependency graph
      logger.info("🔗 Building column dependency graph...");
      const dependencyGraph = new Map<string, string[]>();

      allColumns.forEach((column) => {
        const dependencies: string[] = [];

        if (column.arguments) {
          column.arguments.forEach((arg) => {
            logger.info(`Processing argument for ${column.columnName}:`, arg);

            // Check for single column reference by column name
            if (arg.columnReference) {
              const refColumn = allColumns.find(
                (c) => c.columnName === arg.columnReference
              );
              if (refColumn) {
                dependencies.push(refColumn.id);
                logger.info(
                  `Found column reference: ${arg.columnReference} -> ${refColumn.id}`
                );
              }
            }

            // Check for multiple column references by column name
            if (arg.columnReferences && Array.isArray(arg.columnReferences)) {
              arg.columnReferences.forEach((refName: string) => {
                const refColumn = allColumns.find(
                  (c) => c.columnName === refName
                );
                if (refColumn) {
                  dependencies.push(refColumn.id);
                  logger.info(
                    `Found column reference: ${refName} -> ${refColumn.id}`
                  );
                }
              });
            }

            // Check for column reference by column ID in arguments[n].name
            if (arg.name) {
              const refColumn = allColumns.find((c) => c.id === arg.name);
              if (refColumn) {
                dependencies.push(refColumn.id);
                logger.info(
                  `Found column ID reference: ${arg.name} -> ${refColumn.columnName}`
                );
              }
            }
          });
        }

        dependencyGraph.set(column.id, dependencies);
      });

      logger.info("📊 Column Dependency Graph:");
      for (const [columnId, dependencies] of dependencyGraph.entries()) {
        const column = allColumns.find((c) => c.id === columnId);
        logger.info(
          `${column?.columnName || columnId} depends on: ${dependencies
            .map((depId: string) => {
              const depColumn = allColumns.find((c) => c.id === depId);
              return depColumn?.columnName || depId;
            })
            .join(", ")}`
        );
      }

      // Test the dependency finding
      logger.info("🔍 Testing dependency finding...");
      const fullName1Column = allColumns.find(
        (c) => c.columnName === "Full Name"
      );
      if (fullName1Column) {
        logger.info(`Found Full Name 1 column: ${fullName1Column.id}`);

        // Find all columns that depend on Full Name 1
        const getColumnDependents = (
          columnId: string,
          dependencyGraph: Map<string, string[]>
        ) => {
          const visited = new Set<string>();
          const dependents: string[] = [];

          const collectDependents = (currentId: string) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);

            for (const [colId, dependencies] of dependencyGraph.entries()) {
              if (dependencies.includes(currentId)) {
                dependents.push(colId);
                collectDependents(colId);
              }
            }
          };

          collectDependents(columnId);
          return dependents;
        };

        const dependents = getColumnDependents(
          fullName1Column.id,
          dependencyGraph
        );
        logger.info(
          `Columns that depend on Full Name 1: ${dependents
            .map((depId: string) => {
              const depColumn = allColumns.find((c) => c.id === depId);
              return depColumn?.columnName || depId;
            })
            .join(", ")}`
        );
      } else {
        logger.info("❌ Full Name 1 column not found");
      }

      return {
        success: true,
        message: "Test completed. Check the logs for detailed output.",
        columnsFound: allColumns.length,
        fullName1Found: !!fullName1Column,
      };
    } catch (error) {
      logger.error("❌ Test failed:", error);
      throw new Error(
        `Test failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
);
