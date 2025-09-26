const admin = require("firebase-admin");
const serviceAccount = require("../keys/serviceAcc.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "imheretravels",
  });
}

async function testFunction() {
  try {
    console.log("🧪 Testing column dependencies...");

    const db = admin.firestore();

    // Get all columns
    const colsSnap = await db.collection("bookingSheetColumns").get();
    const allColumns = colsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    console.log(`\n📋 Found ${allColumns.length} columns:`);
    allColumns.forEach((col, index) => {
      console.log(`\n--- Column ${index + 1}: ${col.columnName} ---`);
      console.log("ID:", col.id);
      console.log("DataType:", col.dataType);
      console.log("Function:", col.function);
      console.log("Arguments:", JSON.stringify(col.arguments, null, 2));
    });

    // Build column dependency graph
    console.log("\n🔗 Building column dependency graph...");
    const dependencyGraph = new Map();

    allColumns.forEach((column) => {
      const dependencies = [];

      if (column.arguments) {
        column.arguments.forEach((arg) => {
          console.log(`\n  Processing argument for ${column.columnName}:`, arg);

          // Check for single column reference by column name
          if (arg.columnReference) {
            const refColumn = allColumns.find(
              (c) => c.columnName === arg.columnReference
            );
            if (refColumn) {
              dependencies.push(refColumn.id);
              console.log(
                `    Found column reference: ${arg.columnReference} -> ${refColumn.id}`
              );
            }
          }

          // Check for multiple column references by column name
          if (arg.columnReferences && Array.isArray(arg.columnReferences)) {
            arg.columnReferences.forEach((refName) => {
              const refColumn = allColumns.find(
                (c) => c.columnName === refName
              );
              if (refColumn) {
                dependencies.push(refColumn.id);
                console.log(
                  `    Found column reference: ${refName} -> ${refColumn.id}`
                );
              }
            });
          }

          // Check for column reference by column ID in arguments[n].name
          if (arg.name) {
            const refColumn = allColumns.find((c) => c.id === arg.name);
            if (refColumn) {
              dependencies.push(refColumn.id);
              console.log(
                `    Found column ID reference: ${arg.name} -> ${refColumn.columnName}`
              );
            }
          }
        });
      }

      dependencyGraph.set(column.id, dependencies);
    });

    console.log("\n📊 Column Dependency Graph:");
    for (const [columnId, dependencies] of dependencyGraph.entries()) {
      const column = allColumns.find((c) => c.id === columnId);
      console.log(
        `  ${column?.columnName || columnId} depends on: ${dependencies
          .map((depId) => {
            const depColumn = allColumns.find((c) => c.id === depId);
            return depColumn?.columnName || depId;
          })
          .join(", ")}`
      );
    }

    // Test the dependency finding
    console.log("\n🔍 Testing dependency finding...");
    const fullNameColumn = allColumns.find((c) => c.columnName === "Full Name");
    if (fullNameColumn) {
      console.log(`\nFound Full Name column: ${fullNameColumn.id}`);

      // Find all columns that depend on Full Name
      const getColumnDependents = (columnId, dependencyGraph) => {
        const visited = new Set();
        const dependents = [];

        const collectDependents = (currentId) => {
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
        fullNameColumn.id,
        dependencyGraph
      );
      console.log(
        `\nColumns that depend on Full Name: ${dependents
          .map((depId) => {
            const depColumn = allColumns.find((c) => c.id === depId);
            return depColumn?.columnName || depId;
          })
          .join(", ")}`
      );
    } else {
      console.log("❌ Full Name column not found");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testFunction();
