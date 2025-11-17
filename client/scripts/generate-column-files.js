const fs = require("fs");
const path = require("path");

// Read the JSON file
const columnsData = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "exports",
      "export-prod",
      "bookingSheetColumns-2025-11-13T12-41-34-817Z.json"
    ),
    "utf8"
  )
);

// Helper function to convert parentTab to folder name
function parentTabToFolderName(parentTab) {
  if (!parentTab) return "misc";
  return parentTab
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^if-/, "");
}

// Helper function to convert column ID to file name
function columnIdToFileName(id) {
  return id
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

// Helper function to convert column ID to variable name
function columnIdToVariableName(id) {
  return id + "Column";
}

// Helper function to generate TypeScript code for arguments
function generateArguments(args) {
  if (!args || args.length === 0) return "";

  const argsCode = args
    .map((arg) => {
      const props = [`name: '${arg.name}'`, `type: '${arg.type}'`];

      if (arg.columnReference) {
        props.push(`columnReference: '${arg.columnReference}'`);
      }

      if (arg.columnReferences && arg.columnReferences.length > 0) {
        const refs = arg.columnReferences.map((r) => `'${r}'`).join(", ");
        props.push(`columnReferences: [${refs}]`);
      }

      props.push(`isOptional: ${arg.isOptional}`);
      props.push(`hasDefault: ${arg.hasDefault}`);
      props.push(`isRest: false`);
      props.push(`value: '${arg.value || ""}'`);

      return `      {\n        ${props.join(",\n        ")},\n      }`;
    })
    .join(",\n");

  return `,\n    arguments: [\n${argsCode},\n    ]`;
}

// Helper function to generate TypeScript column file content
function generateColumnFileContent(column) {
  const varName = columnIdToVariableName(column.id);
  const data = column.data;

  // Build the data properties
  const props = [
    `id: '${column.id}'`,
    `columnName: '${data.columnName}'`,
    `dataType: '${data.dataType}'`,
  ];

  if (data.function) {
    props.push(`function: '${data.function}'`);
  }

  if (data.parentTab) {
    props.push(`parentTab: '${data.parentTab}'`);
  }

  props.push(`order: ${data.order}`);
  props.push(
    `includeInForms: ${
      data.includeInForms !== undefined ? data.includeInForms : false
    }`
  );

  if (data.showColumn !== undefined) {
    props.push(`showColumn: ${data.showColumn}`);
  }

  if (data.color) {
    props.push(`color: '${data.color}'`);
  }

  if (data.width) {
    props.push(`width: ${data.width}`);
  }

  if (data.options && data.options.length > 0) {
    const opts = data.options.map((o) => `'${o}'`).join(", ");
    props.push(`options: [${opts}]`);
  }

  const propsCode = props.join(",\n    ");
  const argsCode = generateArguments(data.arguments);

  return `import { BookingSheetColumn } from '@/types/booking-sheet-column';

export const ${varName}: BookingSheetColumn = {
  id: '${column.id}',
  data: {
    ${propsCode}${argsCode},
  },
};
`;
}

// Group columns by folder
const columnsByFolder = {};
columnsData.forEach((column) => {
  const folder = parentTabToFolderName(column.data.parentTab);
  if (!columnsByFolder[folder]) {
    columnsByFolder[folder] = [];
  }
  columnsByFolder[folder].push(column);
});

// Create directories and files
const basePath = path.join(
  __dirname,
  "..",
  "src",
  "app",
  "functions",
  "columns"
);

Object.entries(columnsByFolder).forEach(([folder, columns]) => {
  const folderPath = path.join(basePath, folder);

  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const exports = [];

  // Create each column file
  columns.forEach((column) => {
    const fileName = columnIdToFileName(column.id);
    const filePath = path.join(folderPath, `${fileName}.ts`);
    const content = generateColumnFileContent(column);

    fs.writeFileSync(filePath, content);
    console.log(`Created: ${filePath}`);

    exports.push({
      varName: columnIdToVariableName(column.id),
      fileName,
    });
  });

  // Create index.ts for the folder
  const indexContent =
    exports
      .map((e) => `export { ${e.varName} } from './${e.fileName}';`)
      .join("\n") + "\n";

  const indexPath = path.join(folderPath, "index.ts");
  fs.writeFileSync(indexPath, indexContent);
  console.log(`Created: ${indexPath}`);
});

console.log("\nAll column files generated successfully!");
console.log(`\nFolders created: ${Object.keys(columnsByFolder).join(", ")}`);
