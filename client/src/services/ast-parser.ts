import * as ts from "typescript";
import { TSArgument, FileAnalysisResult } from "@/types/functions";

/**
 * AST-based parser for TypeScript/JavaScript files
 * Uses TypeScript compiler API for accurate parsing and comprehensive analysis
 */
export class ASTParser {
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private sourceFile: ts.SourceFile | null = null;

  /**
   * Parse TypeScript/JavaScript content using AST for comprehensive analysis
   * @param content - The file content to parse
   * @param fileName - Optional filename for better error reporting
   * @returns Comprehensive file analysis result
   */
  parseContent(
    content: string,
    fileName: string = "temp.ts"
  ): FileAnalysisResult {
    try {
      // Create a temporary program for parsing
      this.createProgram(content, fileName);

      if (!this.sourceFile || !this.typeChecker) {
        return this.createDefaultResult();
      }

      // Find export default declarations
      const exportDefault = this.findExportDefault();

      if (!exportDefault) {
        return this.fallbackToBasicDetection(content);
      }

      // Extract comprehensive function information
      const analysis = this.analyzeExportDefault(exportDefault);

      return analysis;
    } catch (error) {
      console.error("Error parsing content with AST:", error);
      // Fallback to basic detection
      return this.fallbackToBasicDetection(content);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Create TypeScript program for parsing
   */
  private createProgram(content: string, fileName: string): void {
    // Create compiler options
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.CommonJS,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noEmit: true,
      strict: false,
      jsx: ts.JsxEmit.React,
    };

    // Create source file
    this.sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    // Create program
    this.program = ts.createProgram([fileName], compilerOptions, {
      getSourceFile: (name) => {
        if (name === fileName) {
          return this.sourceFile!;
        }
        return undefined;
      },
      writeFile: () => {},
      getCurrentDirectory: () => process.cwd(),
      getDirectories: () => [],
      fileExists: (name) => name === fileName,
      readFile: (name) => (name === fileName ? content : undefined),
      getDefaultLibFileName: () => "lib.d.ts",
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => false,
      getNewLine: () => "\n",
    });

    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * Find export default declaration in the AST
   */
  private findExportDefault(): ts.Node | null {
    if (!this.sourceFile) return null;

    let exportDefault: ts.Node | null = null;

    const visitNode = (node: ts.Node): void => {
      // Check for export default statements
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        // Found export default (older syntax)
        exportDefault = node.expression;
        return;
      }

      // Check for export default declarations (modern syntax)
      if (ts.isExportDeclaration(node) && node.exportClause) {
        if (ts.isNamedExports(node.exportClause)) {
          const namedExports = node.exportClause.elements;
          const defaultExport = namedExports.find(
            (exportSpecifier) => exportSpecifier.name.text === "default"
          );
          if (defaultExport) {
            exportDefault = defaultExport;
            return;
          }
        }
      }

      // Check for export default function/class declarations
      if (ts.isFunctionDeclaration(node) && node.modifiers) {
        const hasExportDefault = node.modifiers.some(
          (modifier) =>
            modifier.kind === ts.SyntaxKind.ExportKeyword &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
        );
        if (hasExportDefault) {
          exportDefault = node;
          return;
        }
      }

      // Check for export default class declarations
      if (ts.isClassDeclaration(node) && node.modifiers) {
        const hasExportDefault = node.modifiers.some(
          (modifier) =>
            modifier.kind === ts.SyntaxKind.ExportKeyword &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
        );
        if (hasExportDefault) {
          exportDefault = node;
          return;
        }
        // Also check for export default class without explicit modifiers
        if (
          node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          // This might be an export default class
          exportDefault = node;
          return;
        }
      }

      ts.forEachChild(node, visitNode);
    };

    ts.forEachChild(this.sourceFile, visitNode);

    // If we didn't find anything with the complex logic, try a simpler approach
    if (!exportDefault) {
      // Look for export default function/class declarations directly
      const simpleVisit = (node: ts.Node): void => {
        if (ts.isFunctionDeclaration(node) && node.modifiers) {
          const hasExport = node.modifiers.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword
          );
          const hasDefault = node.modifiers.some(
            (m) => m.kind === ts.SyntaxKind.DefaultKeyword
          );
          if (hasExport && hasDefault) {
            exportDefault = node;
            return;
          }
        }
        if (ts.isClassDeclaration(node) && node.modifiers) {
          const hasExport = node.modifiers.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword
          );
          const hasDefault = node.modifiers.some(
            (m) => m.kind === ts.SyntaxKind.DefaultKeyword
          );
          if (hasExport && hasDefault) {
            exportDefault = node;
            return;
          }
        }
        ts.forEachChild(node, simpleVisit);
      };
      ts.forEachChild(this.sourceFile, simpleVisit);
    }

    return exportDefault;
  }

  /**
   * Analyze export default declaration comprehensively
   */
  private analyzeExportDefault(exportDefault: ts.Node): FileAnalysisResult {
    const analysis: FileAnalysisResult = {
      hasExportDefault: true,
      arguments: [],
      fileType: this.detectFileType(),
      hasTypeAnnotations: this.hasTypeAnnotations(),
      complexity: "simple",
      exportType: "none",
      functionName: null,
      parameterCount: 0,
      hasGenerics: false,
      hasUnionTypes: false,
      hasIntersectionTypes: false,
      hasDestructuring: false,
      hasRestParameters: false,
      functionDependencies: [],
    };

    // Determine export type and extract function information
    if (ts.isIdentifier(exportDefault)) {
      // export default functionName
      analysis.functionName = exportDefault.text;
      const declaration = this.findFunctionDeclaration(exportDefault.text);
      if (declaration) {
        this.analyzeFunction(declaration, analysis);
      }
    } else if (ts.isFunctionDeclaration(exportDefault)) {
      // export default function name(params) {}
      analysis.exportType = "function";
      analysis.functionName = exportDefault.name?.text || null;
      this.analyzeFunction(exportDefault, analysis);
    } else if (ts.isVariableDeclaration(exportDefault)) {
      // export default const/let/var name = function
      if (exportDefault.name && ts.isIdentifier(exportDefault.name)) {
        analysis.functionName = exportDefault.name.text;
      }
      const initializer = exportDefault.initializer;
      if (initializer) {
        this.analyzeInitializer(initializer, analysis);
      }
    } else if (ts.isArrowFunction(exportDefault)) {
      // export default (params) => {}
      analysis.exportType = "function";
      // Arrow functions don't have names, so functionName remains null
      this.analyzeFunction(exportDefault, analysis);
    } else if (ts.isClassDeclaration(exportDefault)) {
      analysis.exportType = "class";
      analysis.functionName = exportDefault.name?.text || null;
    } else if (ts.isObjectLiteralExpression(exportDefault)) {
      analysis.exportType = "object";
    } else {
      analysis.exportType = "value";
    }

    // Assess complexity based on analysis
    analysis.complexity = this.assessComplexity(analysis);

    return analysis;
  }

  /**
   * Analyze function declaration/expression comprehensively
   */
  private analyzeFunction(
    functionNode:
      | ts.FunctionDeclaration
      | ts.FunctionExpression
      | ts.ArrowFunction,
    analysis: FileAnalysisResult
  ): void {
    if (!functionNode.parameters) return;

    // Set function name if available and not already set
    if (
      ts.isFunctionDeclaration(functionNode) &&
      functionNode.name &&
      !analysis.functionName
    ) {
      analysis.functionName = functionNode.name.text;
    } else if (
      ts.isFunctionExpression(functionNode) &&
      functionNode.name &&
      !analysis.functionName
    ) {
      // Function expressions might have names
      analysis.functionName = functionNode.name.text;
    }
    // Arrow functions don't have names, so functionName remains null

    analysis.parameterCount = functionNode.parameters.length;

    functionNode.parameters.forEach((param) => {
      const paramInfo = this.extractParameterInfo(param);
      if (paramInfo) {
        analysis.arguments.push(paramInfo);

        // Track advanced features
        if (paramInfo.isRest) analysis.hasRestParameters = true;
        if (paramInfo.type.includes("|")) analysis.hasUnionTypes = true;
        if (paramInfo.type.includes("&")) analysis.hasIntersectionTypes = true;
        if (paramInfo.type.includes("<") && paramInfo.type.includes(">"))
          analysis.hasGenerics = true;
        if (
          param.name &&
          (ts.isObjectBindingPattern(param.name) ||
            ts.isArrayBindingPattern(param.name))
        ) {
          analysis.hasDestructuring = true;
        }
      }
    });

    // Extract function dependencies from the function body
    if (functionNode.body) {
      analysis.functionDependencies = this.extractFunctionDependencies(
        functionNode.body
      );
    }
  }

  /**
   * Analyze variable initializer
   */
  private analyzeInitializer(
    initializer: ts.Expression,
    analysis: FileAnalysisResult
  ): void {
    if (
      ts.isFunctionExpression(initializer) ||
      ts.isArrowFunction(initializer)
    ) {
      analysis.exportType = "function";
      // For function expressions, we might not have a name, so keep functionName as null
      // The function name should already be set from the variable declaration
      this.analyzeFunction(initializer, analysis);
    } else if (ts.isCallExpression(initializer)) {
      // Handle cases like export default createFunction(params)
      analysis.exportType = "value";
      // For call expressions, we might want to extract the function name
      if (ts.isIdentifier(initializer.expression) && !analysis.functionName) {
        analysis.functionName = initializer.expression.text;
      }
    }
  }

  /**
   * Find function declaration by name
   */
  private findFunctionDeclaration(
    functionName: string
  ): ts.FunctionDeclaration | null {
    if (!this.sourceFile) return null;

    let declaration: ts.FunctionDeclaration | null = null;

    const visitNode = (node: ts.Node): void => {
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.name.text === functionName
      ) {
        declaration = node;
        return;
      }

      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((decl) => {
          if (
            ts.isVariableDeclaration(decl) &&
            decl.name &&
            ts.isIdentifier(decl.name) &&
            decl.name.text === functionName &&
            decl.initializer
          ) {
            // Check if initializer is a function
            if (
              ts.isFunctionExpression(decl.initializer) ||
              ts.isArrowFunction(decl.initializer)
            ) {
              declaration = decl.initializer as any;
              return;
            }
          }
        });
      }

      ts.forEachChild(node, visitNode);
    };

    ts.forEachChild(this.sourceFile, visitNode);
    return declaration;
  }

  /**
   * Extract detailed parameter information
   */
  private extractParameterInfo(
    param: ts.ParameterDeclaration
  ): TSArgument | null {
    if (!param.name) return null;

    let paramName = "";
    let paramType = "any";
    let isOptional = false;
    let hasDefault = false;
    let isRest = false;

    // Extract parameter name
    if (ts.isIdentifier(param.name)) {
      paramName = param.name.text;
    } else if (ts.isObjectBindingPattern(param.name)) {
      // Destructured object parameter
      return this.extractDestructuredObjectParams(param.name, param);
    } else if (ts.isArrayBindingPattern(param.name)) {
      // Destructured array parameter
      return this.extractDestructuredArrayParams(param.name, param);
    }

    // Extract type annotation
    if (param.type) {
      paramType = this.typeToString(param.type);
    }

    // Handle rest parameters
    if (param.dotDotDotToken) {
      isRest = true;
      paramName = paramName.startsWith("...")
        ? paramName.substring(3)
        : paramName;
      paramType = paramType === "any" ? "any[]" : paramType;
    }

    // Check if optional
    if (param.questionToken) {
      isOptional = true;
    }

    // Check if has default value
    if (param.initializer) {
      hasDefault = true;
    }

    return {
      name: paramName,
      type: paramType,
      isOptional,
      hasDefault,
      isRest,
    };
  }

  /**
   * Extract destructured object parameters
   */
  private extractDestructuredObjectParams(
    bindingPattern: ts.ObjectBindingPattern,
    param: ts.ParameterDeclaration
  ): TSArgument | null {
    const elements: TSArgument[] = [];

    bindingPattern.elements.forEach((element) => {
      if (ts.isBindingElement(element)) {
        const name = element.propertyName || element.name;
        if (ts.isIdentifier(name)) {
          let type = "any";

          // Try to get type from the parameter's type annotation
          if (param.type && ts.isTypeLiteralNode(param.type)) {
            const propertyType = this.findPropertyType(param.type, name.text);
            if (propertyType) {
              type = this.typeToString(propertyType);
            }
          }

          elements.push({
            name: name.text,
            type: type,
          });
        }
      }
    });

    // Return the first element for now, or create a combined object
    if (elements.length === 1) {
      return elements[0];
    } else if (elements.length > 1) {
      // For multiple destructured properties, we could return an array
      // or create a combined object type
      return {
        name: "destructured",
        type: `{ ${elements.map((e) => `${e.name}: ${e.type}`).join(", ")} }`,
      };
    }

    return null;
  }

  /**
   * Extract destructured array parameters
   */
  private extractDestructuredArrayParams(
    bindingPattern: ts.ArrayBindingPattern,
    param: ts.ParameterDeclaration
  ): TSArgument | null {
    const elements: TSArgument[] = [];

    bindingPattern.elements.forEach((element) => {
      if (ts.isBindingElement(element)) {
        const name = element.name;
        if (ts.isIdentifier(name)) {
          let type = "any";

          // Try to get type from the parameter's type annotation
          if (param.type && ts.isArrayTypeNode(param.type)) {
            const elementType = param.type.elementType;
            if (elementType) {
              type = this.typeToString(elementType);
            }
          }

          elements.push({
            name: name.text,
            type: type,
          });
        }
      }
    });

    if (elements.length === 1) {
      return elements[0];
    } else if (elements.length > 1) {
      return {
        name: "destructured",
        type: `[${elements.map((e) => e.type).join(", ")}]`,
      };
    }

    return null;
  }

  /**
   * Find property type in object type literal
   */
  private findPropertyType(
    typeLiteral: ts.TypeLiteralNode,
    propertyName: string
  ): ts.TypeNode | null {
    for (const member of typeLiteral.members) {
      if (
        ts.isPropertySignature(member) &&
        member.name &&
        ts.isIdentifier(member.name) &&
        member.name.text === propertyName
      ) {
        return member.type || null;
      }
    }
    return null;
  }

  /**
   * Convert TypeScript type node to string
   */
  private typeToString(typeNode: ts.TypeNode): string {
    if (!this.typeChecker) return "any";

    try {
      // Get the type from the type checker
      const type = this.typeChecker.getTypeFromTypeNode(typeNode);
      if (type) {
        return this.typeChecker.typeToString(type);
      }
    } catch (error) {
      // Fallback to manual type extraction
    }

    // Manual type extraction as fallback
    if (ts.isTypeReferenceNode(typeNode)) {
      if (typeNode.typeName && ts.isIdentifier(typeNode.typeName)) {
        let typeName = typeNode.typeName.text;

        // Handle generic types
        if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
          const typeArgs = typeNode.typeArguments.map((arg) =>
            this.typeToString(arg)
          );
          typeName += `<${typeArgs.join(", ")}>`;
        }

        return typeName;
      }
    } else if (ts.isUnionTypeNode(typeNode)) {
      const types = typeNode.types.map((t) => this.typeToString(t));
      return types.join(" | ");
    } else if (ts.isIntersectionTypeNode(typeNode)) {
      const types = typeNode.types.map((t) => this.typeToString(t));
      return types.join(" & ");
    } else if (ts.isArrayTypeNode(typeNode)) {
      const elementType = this.typeToString(typeNode.elementType);
      return `${elementType}[]`;
    } else if (ts.isTypeLiteralNode(typeNode)) {
      // For object types, create a simplified representation
      const properties: string[] = [];
      typeNode.members.forEach((member) => {
        if (
          ts.isPropertySignature(member) &&
          member.name &&
          ts.isIdentifier(member.name)
        ) {
          const propName = member.name.text;
          const propType = member.type ? this.typeToString(member.type) : "any";
          properties.push(`${propName}: ${propType}`);
        }
      });
      return `{ ${properties.join(", ")} }`;
    } else if (ts.isLiteralTypeNode(typeNode)) {
      if (ts.isStringLiteral(typeNode.literal)) {
        return `"${typeNode.literal.text}"`;
      } else if (ts.isNumericLiteral(typeNode.literal)) {
        return typeNode.literal.text;
      }
    }

    return "any";
  }

  /**
   * Detect file type based on content
   */
  private detectFileType(): "typescript" | "javascript" {
    if (!this.sourceFile) return "javascript";

    // Check for TypeScript-specific syntax
    let hasTypeScript = false;

    const visitNode = (node: ts.Node): void => {
      if (
        ts.isTypeReferenceNode(node) ||
        ts.isTypeLiteralNode(node) ||
        ts.isUnionTypeNode(node) ||
        ts.isIntersectionTypeNode(node) ||
        (ts.isTypeReferenceNode(node) &&
          node.typeName &&
          ts.isIdentifier(node.typeName) &&
          node.typeArguments &&
          node.typeArguments.length > 0)
      ) {
        hasTypeScript = true;
        return;
      }

      ts.forEachChild(node, visitNode);
    };

    ts.forEachChild(this.sourceFile, visitNode);
    return hasTypeScript ? "typescript" : "javascript";
  }

  /**
   * Check if file has type annotations
   */
  private hasTypeAnnotations(): boolean {
    if (!this.sourceFile) return false;

    let hasTypes = false;

    const visitNode = (node: ts.Node): void => {
      if (ts.isParameter(node) && node.type) {
        hasTypes = true;
        return;
      }

      ts.forEachChild(node, visitNode);
    };

    ts.forEachChild(this.sourceFile, visitNode);
    return hasTypes;
  }

  /**
   * Assess complexity based on analysis
   */
  private assessComplexity(
    analysis: FileAnalysisResult
  ): "simple" | "moderate" | "complex" {
    let score = 0;

    // Parameter count
    if (analysis.parameterCount > 5) score += 2;
    else if (analysis.parameterCount > 2) score += 1;

    // Advanced features
    if (analysis.hasGenerics) score += 2;
    if (analysis.hasUnionTypes) score += 1;
    if (analysis.hasIntersectionTypes) score += 1;
    if (analysis.hasDestructuring) score += 1;
    if (analysis.hasRestParameters) score += 1;
    if (analysis.hasTypeAnnotations) score += 1;

    if (score >= 4) return "complex";
    if (score >= 2) return "moderate";
    return "simple";
  }

  /**
   * Create default result for files without export default
   */
  private createDefaultResult(): FileAnalysisResult {
    return {
      hasExportDefault: false,
      arguments: [],
      fileType: "javascript",
      hasTypeAnnotations: false,
      complexity: "simple",
      exportType: "none",
      functionName: null,
      parameterCount: 0,
      hasGenerics: false,
      hasUnionTypes: false,
      hasIntersectionTypes: false,
      hasDestructuring: false,
      hasRestParameters: false,
      functionDependencies: [],
    };
  }

  /**
   * Fallback to basic detection if AST parsing fails
   */
  private fallbackToBasicDetection(content: string): FileAnalysisResult {
    // Simple regex fallback for basic cases
    const exportDefaultMatch = content.match(
      /export\s+default\s+(?:function\s+)?(\w+)/
    );
    if (!exportDefaultMatch) {
      return this.createDefaultResult();
    }

    const functionName = exportDefaultMatch[1];

    // Extract parameters using regex (this is what we're replacing with AST)
    const functionPattern = new RegExp(
      `export\\s+default\\s+function\\s+${functionName}\\s*\\(([^)]*)\\)`
    );

    const match = content.match(functionPattern);
    if (!match) {
      return {
        ...this.createDefaultResult(),
        hasExportDefault: true,
        exportType: "function",
        functionName,
        parameterCount: 0,
        fileType: this.detectFileTypeFromContent(content),
        hasTypeAnnotations: this.hasTypeAnnotationsFromContent(content),
      };
    }

    const paramsString = match[1];

    const extractedArgs = paramsString.split(",").map((param) => {
      const trimmed = param.trim();
      // Extract type if present
      const typeMatch = trimmed.match(/^([^:]+):\s*([^=]+?)(?:\s*=\s*[^,]+)?$/);
      if (typeMatch) {
        return {
          name: typeMatch[1].trim(),
          type: typeMatch[2].trim(),
        };
      }
      return {
        name: trimmed.replace(/=\s*[^,]+$/, "").trim(),
        type: "any",
      };
    });

    return {
      ...this.createDefaultResult(),
      hasExportDefault: true,
      arguments: extractedArgs,
      exportType: "function",
      functionName,
      parameterCount: extractedArgs.length,
      fileType: this.detectFileTypeFromContent(content),
      hasTypeAnnotations: this.hasTypeAnnotationsFromContent(content),
    };
  }

  /**
   * Detect file type from content using regex (fallback method)
   */
  private detectFileTypeFromContent(
    content: string
  ): "typescript" | "javascript" {
    // Check for TypeScript-specific syntax
    const hasTypeAnnotations = /:\s*\w+(\[\])?(\s*[=,)]|$)/.test(content);
    const hasTypeImports = /import.*<.*>/.test(content);
    const hasInterface = /interface\s+\w+/.test(content);
    const hasType = /type\s+\w+\s*=/.test(content);

    return hasTypeAnnotations || hasTypeImports || hasInterface || hasType
      ? "typescript"
      : "javascript";
  }

  /**
   * Check if file has type annotations using regex (fallback method)
   */
  private hasTypeAnnotationsFromContent(content: string): boolean {
    // Check for parameter type annotations
    const hasParamTypes = /\(\s*\w+\s*:\s*\w+/.test(content);
    // Check for return type annotations
    const hasReturnType = /\)\s*:\s*\w+/.test(content);
    // Check for variable type annotations
    const hasVarTypes = /:\s*\w+(\[\])?(\s*[=,;]|$)/.test(content);

    return hasParamTypes || hasReturnType || hasVarTypes;
  }

  /**
   * Extract function dependencies from a function body
   */
  private extractFunctionDependencies(body: ts.Node): string[] {
    const dependencies = new Set<string>();

    const visitNode = (node: ts.Node): void => {
      // Check for function calls
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression)) {
          // Direct function call: functionName()
          dependencies.add(node.expression.text);
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          // Method call: object.method()
          if (ts.isIdentifier(node.expression.name)) {
            dependencies.add(node.expression.name.text);
          }
        }
      }

      // Check for function references (not calls)
      if (ts.isIdentifier(node)) {
        // This is a simple heuristic - in practice, you might want to be more sophisticated
        // about distinguishing between function references and other identifiers
        const symbol = this.typeChecker?.getSymbolAtLocation(node);
        if (
          symbol &&
          symbol.valueDeclaration &&
          ts.isFunctionDeclaration(symbol.valueDeclaration)
        ) {
          dependencies.add(node.text);
        }
      }

      // Recursively visit child nodes
      ts.forEachChild(node, visitNode);
    };

    visitNode(body);
    return Array.from(dependencies);
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.program = null;
    this.typeChecker = null;
    this.sourceFile = null;
  }
}

// Export singleton instance
export const astParser = new ASTParser();
export default astParser;
