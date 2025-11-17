const fs = require('fs');
const path = require('path');

// Read the JSON files
const columnsData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'exports', 'export-prod', 'bookingSheetColumns-2025-11-13T12-41-34-817Z.json'),
    'utf8'
  )
);

const tsFilesData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'exports', 'export-prod', 'ts_files-2025-11-13T12-41-34-817Z.json'),
    'utf8'
  )
);

// Create a map of function ID to function data
const functionsById = new Map();
tsFilesData.forEach(func => {
  functionsById.set(func.id, func.data);
});

// Helper functions
function parentTabToFolderName(parentTab) {
  if (!parentTab) return 'misc';
  return parentTab
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^if-/, '');
}

function columnIdToFileName(id) {
  return id.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function columnIdToVariableName(id) {
  return id + 'Column';
}

function generateArguments(args) {
  if (!args || args.length === 0) return '';
  
  const argsCode = args.map(arg => {
    const props = [
      `name: '${arg.name}'`,
      `type: '${arg.type}'`,
    ];
    
    if (arg.columnReference) {
      props.push(`columnReference: '${arg.columnReference}'`);
    }
    
    if (arg.columnReferences && arg.columnReferences.length > 0) {
      const refs = arg.columnReferences.map(r => `'${r}'`).join(', ');
      props.push(`columnReferences: [${refs}]`);
    }
    
    props.push(`isOptional: ${arg.isOptional}`);
    props.push(`hasDefault: ${arg.hasDefault}`);
    props.push(`isRest: false`);
    props.push(`value: '${arg.value || ''}'`);
    
    return `      {\n        ${props.join(',\n        ')},\n      }`;
  }).join(',\n');
  
  return `,\n    arguments: [\n${argsCode},\n    ]`;
}

function generateColumnFileContent(column) {
  const varName = columnIdToVariableName(column.id);
  const data = column.data;
  
  // Build imports
  let content = `import { BookingSheetColumn } from '@/types/booking-sheet-column';\n\n`;
  
  // Build the data properties
  const props = [
    `id: '${column.id}'`,
    `columnName: '${data.columnName}'`,
    `dataType: '${data.dataType}'`,
  ];
  
  let functionContent = '';
  
  // If it's a function column, add the function reference
  if (data.dataType === 'function' && data.function) {
    const funcData = functionsById.get(data.function);
    if (funcData) {
      // Reference the function by name as a string with Function suffix
      props.push(`function: '${funcData.functionName}Function'`);
      functionContent = funcData.content;
      // Add Function suffix to the function name in the content
      functionContent = functionContent.replace(
        new RegExp(`export default function ${funcData.functionName}\\b`, 'g'),
        `export default function ${funcData.functionName}Function`
      );
    }
  }
  
  if (data.parentTab) {
    props.push(`parentTab: '${data.parentTab}'`);
  }
  
  props.push(`order: ${data.order}`);
  props.push(`includeInForms: ${data.includeInForms !== undefined ? data.includeInForms : false}`);
  
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
    const opts = data.options.map(o => `'${o}'`).join(', ');
    props.push(`options: [${opts}]`);
  }
  
  const propsCode = props.join(',\n    ');
  const argsCode = generateArguments(data.arguments);
  
  // Build the column export
  content += `export const ${varName}: BookingSheetColumn = {
  id: '${column.id}',
  data: {
    ${propsCode}${argsCode},
  },
};
`;

  // Add the function implementation at the bottom if it exists
  if (functionContent) {
    content += `\n// Column Function Implementation\n${functionContent}`;
  }
  
  return content;
}

// Regenerate all column files with embedded functions
const basePath = path.join(__dirname, '..', 'src', 'app', 'functions', 'columns');

// Group columns by folder
const columnsByFolder = {};
columnsData.forEach(column => {
  const folder = parentTabToFolderName(column.data.parentTab);
  if (!columnsByFolder[folder]) {
    columnsByFolder[folder] = [];
  }
  columnsByFolder[folder].push(column);
});

let totalUpdated = 0;
let functionsEmbedded = 0;

Object.entries(columnsByFolder).forEach(([folder, columns]) => {
  const folderPath = path.join(basePath, folder);
  
  columns.forEach(column => {
    const fileName = columnIdToFileName(column.id);
    const filePath = path.join(folderPath, `${fileName}.ts`);
    const content = generateColumnFileContent(column);
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
    totalUpdated++;
    
    if (column.data.dataType === 'function' && column.data.function) {
      functionsEmbedded++;
    }
  });
});

console.log(`\n✓ Updated ${totalUpdated} column files`);
console.log(`✓ Embedded ${functionsEmbedded} function implementations`);
