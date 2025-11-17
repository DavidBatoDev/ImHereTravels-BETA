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

// Helper function to convert function name to kebab-case
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Process each column and create function files
const basePath = path.join(__dirname, '..', 'src', 'app', 'functions', 'columns');
const createdFunctions = new Set();

columnsData.forEach(column => {
  const data = column.data;
  
  // Skip if not a function type or no function ID
  if (data.dataType !== 'function' || !data.function) {
    return;
  }
  
  // Skip if we already created this function
  if (createdFunctions.has(data.function)) {
    return;
  }
  
  const funcData = functionsById.get(data.function);
  if (!funcData) {
    console.warn(`Warning: Function ${data.function} not found for column ${column.id}`);
    return;
  }
  
  const folder = parentTabToFolderName(data.parentTab);
  const folderPath = path.join(basePath, folder);
  
  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  // Create the function file
  const functionFileName = toKebabCase(funcData.functionName);
  const functionFilePath = path.join(folderPath, `${functionFileName}.function.ts`);
  
  // Use the content from the function data
  let content = funcData.content;
  
  // If content doesn't have proper formatting, add it
  if (!content.startsWith('/**') && !content.startsWith('//')) {
    content = `/**\n * ${funcData.functionName}\n * Auto-generated function for ${column.id} column\n */\n${content}`;
  }
  
  fs.writeFileSync(functionFilePath, content);
  console.log(`Created: ${functionFilePath}`);
  
  createdFunctions.add(data.function);
});

console.log(`\nTotal unique functions created: ${createdFunctions.size}`);
