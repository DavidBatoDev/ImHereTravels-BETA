import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { JSFunction } from "@/types/sheet-management";

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

const COLLECTION_NAME = "js_files";

// ============================================================================
// JS FUNCTIONS SERVICE INTERFACE
// ============================================================================

export interface JSFunctionsService {
  // Fetch all JS functions
  getAllFunctions(): Promise<JSFunction[]>;
  
  // Real-time listener for JS functions
  subscribeToFunctions(callback: (functions: JSFunction[]) => void): Unsubscribe;
  
  // Get function by ID
  getFunctionById(functionId: string): Promise<JSFunction | null>;
  
  // Get functions by file path
  getFunctionsByFilePath(filePath: string): Promise<JSFunction[]>;
}

// ============================================================================
// JS FUNCTIONS SERVICE IMPLEMENTATION
// ============================================================================

class JSFunctionsServiceImpl implements JSFunctionsService {
  
  async getAllFunctions(): Promise<JSFunction[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy("name", "asc"))
      );

      const functions: JSFunction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Parse the JS file content to extract function information
        const functionInfo = this.parseJSFile(data.content || "", doc.id, data.name || doc.id);
        if (functionInfo) {
          functions.push(functionInfo);
        }
      });

      return functions;
    } catch (error) {
      console.error("❌ Failed to fetch JS functions:", error);
      throw error;
    }
  }

  subscribeToFunctions(callback: (functions: JSFunction[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(db, COLLECTION_NAME), orderBy("name", "asc")),
      (querySnapshot) => {
        const functions: JSFunction[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const functionInfo = this.parseJSFile(data.content || "", doc.id, data.name || doc.id);
          if (functionInfo) {
            functions.push(functionInfo);
          }
        });
        callback(functions);
      },
      (error) => {
        console.error("❌ Error listening to JS functions:", error);
      }
    );
  }

  async getFunctionById(functionId: string): Promise<JSFunction | null> {
    try {
      const functions = await this.getAllFunctions();
      return functions.find(f => f.id === functionId) || null;
    } catch (error) {
      console.error("❌ Failed to get function by ID:", error);
      return null;
    }
  }

  async getFunctionsByFilePath(filePath: string): Promise<JSFunction[]> {
    try {
      const functions = await this.getAllFunctions();
      return functions.filter(f => f.filePath === filePath);
    } catch (error) {
      console.error("❌ Failed to get functions by file path:", error);
      return [];
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private parseJSFile(content: string, fileId: string, fileName: string): JSFunction | null {
    try {
      // Simple regex to find function definitions
      const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)/g;
      const matches = [...content.matchAll(functionRegex)];
      
      if (matches.length === 0) {
        return null;
      }

      // For now, return the first function found
      // In a more sophisticated implementation, you might want to parse all functions
      const [_, functionName, paramsString] = matches[0];
      const parameters = paramsString
        .split(',')
        .map(param => param.trim())
        .filter(param => param.length > 0);

      return {
        id: fileId,
        name: functionName,
        parameters,
        description: `Function from ${fileName}`,
        filePath: fileName,
      };
    } catch (error) {
      console.error("❌ Failed to parse JS file:", error);
      return null;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const jsFunctionsService = new JSFunctionsServiceImpl();
export default jsFunctionsService;
