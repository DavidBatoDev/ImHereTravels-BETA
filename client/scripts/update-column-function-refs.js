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

// Helper function to convert parentTab to folder name
function parentTabToFolderName(parentTab) {
  if (!parentTab) return 'misc';
  return parentTab
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^if-/, '');
}

// Helper function to convert column ID to file name
function columnIdToFileName(id) {
  return id.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

// Helper function to convert function name to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Helper function to convert column ID to variable name
function columnIdToVariableName(id) {
  return id + 'Column';
}

// Helper function to generate TypeScript code for arguments
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

// Helper function to generate TypeScript column file content
function generateColumnFileContent(column) {
  const varName = columnIdToVariableName(column.id);
  const data = column.data;
  
  // Build imports
  let imports = `import { BookingSheetColumn } from '@/types/booking-sheet-column';\n`;
  
  // If it's a function column, import the function
  if (data.dataType === 'function' && data.function) {
    const funcData = functionsById.get(data.function);
    if (funcData) {
      const functionFileName = toKebabCase(funcData.functionName);
      imports += `import ${funcData.functionName} from './${functionFileName}.function';\n`;
    }
  }
  
  // Build the data properties
  const props = [
    `id: '${column.id}'`,
    `columnName: '${data.columnName}'`,
    `dataType: '${data.dataType}'`,
  ];
  
  if (data.dataType === 'function' && data.function) {
    const funcData = functionsById.get(data.function);
    if (funcData) {
      props.push(`function: ${funcData.functionName}`);
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
  
  return `${imports}
export const ${varName}: BookingSheetColumn = {
  id: '${column.id}',
  data: {
    ${propsCode}${argsCode},
  },
};
`;
}

// Regenerate all column files with function references
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

Object.entries(columnsByFolder).forEach(([folder, columns]) => {
  const folderPath = path.join(basePath, folder);
  
  columns.forEach(column => {
    const fileName = columnIdToFileName(column.id);
    const filePath = path.join(folderPath, `${fileName}.ts`);
    const content = generateColumnFileContent(column);
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  });
});

console.log('\nAll column files updated with function references!');
