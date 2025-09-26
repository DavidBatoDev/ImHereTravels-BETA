import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { TypeScriptFunction, FunctionArgument } from "@/types/sheet-management";

// ============================================================================
// COLLECTION CONSTANTS
// ============================================================================

const COLLECTION_NAME = "ts_files";

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

export interface TypeScriptFunctionsService {
  // CRUD Operations
  createFunction(func: Omit<TypeScriptFunction, "id">): Promise<string>;
  getFunction(funcId: string): Promise<TypeScriptFunction | null>;
  getAllFunctions(): Promise<TypeScriptFunction[]>;
  updateFunction(
    funcId: string,
    updates: Partial<TypeScriptFunction>
  ): Promise<void>;
  deleteFunction(funcId: string): Promise<void>;

  // Special Operations
  getActiveFunctions(): Promise<TypeScriptFunction[]>;
  getFunctionsByType(fileType: string): Promise<TypeScriptFunction[]>;
  getFunctionsByParameterCount(count: number): Promise<TypeScriptFunction[]>;
  getFunctionsByComplexity(complexity: string): Promise<TypeScriptFunction[]>;

  // Real-time Listeners
  subscribeToFunctions(
    callback: (functions: TypeScriptFunction[]) => void
  ): Unsubscribe;
  subscribeToFunctionChanges(
    funcId: string,
    callback: (func: TypeScriptFunction | null) => void
  ): Unsubscribe;

  // Utility Methods
  validateFunction(func: Partial<TypeScriptFunction>): {
    isValid: boolean;
    errors: string[];
  };
  parseFunctionArguments(func: TypeScriptFunction): FunctionArgument[];
  getFunctionSignature(func: TypeScriptFunction): string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

class TypeScriptFunctionsServiceImpl implements TypeScriptFunctionsService {
  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  async createFunction(func: Omit<TypeScriptFunction, "id">): Promise<string> {
    try {
      // Validate function data
      const validation = this.validateFunction(func);
      if (!validation.isValid) {
        throw new Error(
          `Invalid function data: ${validation.errors.join(", ")}`
        );
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...func,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModified: new Date(),
      });

      console.log(
        `✅ Created TypeScript function: ${func.functionName} with ID: ${docRef.id}`
      );
      return docRef.id;
    } catch (error) {
      console.error(
        `❌ Failed to create TypeScript function: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getFunction(funcId: string): Promise<TypeScriptFunction | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, funcId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date(),
          functionDependencies: data.functionDependencies || [],
        } as TypeScriptFunction;
      }

      return null;
    } catch (error) {
      console.error(
        `❌ Failed to get TypeScript function ${funcId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getAllFunctions(): Promise<TypeScriptFunction[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc"))
      );

      const allFunctions = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date(),
          functionDependencies: data.functionDependencies || [],
        } as TypeScriptFunction;
      });

      console.log("🔍 All functions from database:", allFunctions.length);
      console.log(
        "🔍 Function details:",
        allFunctions.map((f) => ({
          id: f.id,
          name: f.name,
          functionName: f.functionName,
          exportType: f.exportType,
          hasFunctionName: !!f.functionName,
          hasExportType: !!f.exportType,
        }))
      );

      const functions = allFunctions.filter((func) => {
        // Filter out functions that don't have required fields
        return func.functionName && func.exportType === "function";
      });

      console.log(
        "🔍 Filtered functions:",
        functions.length,
        "functions found"
      );
      return functions;
    } catch (error) {
      console.error(
        `❌ Failed to get all TypeScript functions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async updateFunction(
    funcId: string,
    updates: Partial<TypeScriptFunction>
  ): Promise<void> {
    try {
      // Validate updates
      const existingFunction = await this.getFunction(funcId);
      if (!existingFunction) {
        throw new Error(`Function not found: ${funcId}`);
      }

      const updatedFunction = { ...existingFunction, ...updates };
      const validation = this.validateFunction(updatedFunction);
      if (!validation.isValid) {
        throw new Error(
          `Invalid function data: ${validation.errors.join(", ")}`
        );
      }

      const docRef = doc(db, COLLECTION_NAME, funcId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date(),
        lastModified: new Date(),
      });

      console.log(`✅ Updated TypeScript function: ${funcId}`);
    } catch (error) {
      console.error(
        `❌ Failed to update TypeScript function ${funcId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async deleteFunction(funcId: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, funcId);
      await deleteDoc(docRef);
      console.log(`✅ Deleted TypeScript function: ${funcId}`);
    } catch (error) {
      console.error(
        `❌ Failed to delete TypeScript function ${funcId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // SPECIAL OPERATIONS
  // ========================================================================

  async getActiveFunctions(): Promise<TypeScriptFunction[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTION_NAME),
          where("isActive", "==", true),
          orderBy("updatedAt", "desc")
        )
      );

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date(),
        } as TypeScriptFunction;
      });
    } catch (error) {
      console.error(
        `❌ Failed to get active TypeScript functions: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getFunctionsByType(fileType: string): Promise<TypeScriptFunction[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTION_NAME),
          where("fileType", "==", fileType),
          orderBy("updatedAt", "desc")
        )
      );

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date(),
        } as TypeScriptFunction;
      });
    } catch (error) {
      console.error(
        `❌ Failed to get TypeScript functions by type ${fileType}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getFunctionsByParameterCount(
    count: number
  ): Promise<TypeScriptFunction[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTION_NAME),
          where("parameterCount", "==", count),
          orderBy("updatedAt", "desc")
        )
      );

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date(),
        } as TypeScriptFunction;
      });
    } catch (error) {
      console.error(
        `❌ Failed to get TypeScript functions by parameter count ${count}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  async getFunctionsByComplexity(
    complexity: string
  ): Promise<TypeScriptFunction[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTION_NAME),
          where("complexity", "==", complexity),
          orderBy("updatedAt", "desc")
        )
      );

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastModified: data.lastModified?.toDate() || new Date(),
        } as TypeScriptFunction;
      });
    } catch (error) {
      console.error(
        `❌ Failed to get TypeScript functions by complexity ${complexity}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      throw error;
    }
  }

  // ========================================================================
  // REAL-TIME LISTENERS
  // ========================================================================

  subscribeToFunctions(
    callback: (functions: TypeScriptFunction[]) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, COLLECTION_NAME), orderBy("updatedAt", "desc")),
      (querySnapshot) => {
        const functions = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastModified: data.lastModified?.toDate() || new Date(),
          } as TypeScriptFunction;
        });
        callback(functions);
      },
      (error) => {
        console.error(
          `❌ Error listening to TypeScript functions: ${error.message}`
        );
      }
    );
  }

  subscribeToFunctionChanges(
    funcId: string,
    callback: (func: TypeScriptFunction | null) => void
  ): Unsubscribe {
    return onSnapshot(
      doc(db, COLLECTION_NAME, funcId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          callback({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastModified: data.lastModified?.toDate() || new Date(),
          } as TypeScriptFunction);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(
          `❌ Error listening to TypeScript function ${funcId}: ${error.message}`
        );
      }
    );
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  validateFunction(func: Partial<TypeScriptFunction>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!func.name || func.name.trim().length === 0) {
      errors.push("Function name is required");
    }

    if (!func.functionName || func.functionName.trim().length === 0) {
      errors.push("Function name is required");
    }

    if (!func.fileType || func.fileType.trim().length === 0) {
      errors.push("File type is required");
    }

    if (func.parameterCount === undefined || func.parameterCount < 0) {
      errors.push("Parameter count must be a non-negative number");
    }

    if (func.arguments && !Array.isArray(func.arguments)) {
      errors.push("Arguments must be an array");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  parseFunctionArguments(func: TypeScriptFunction): FunctionArgument[] {
    return func.arguments || [];
  }

  getFunctionSignature(func: TypeScriptFunction): string {
    const args = this.parseFunctionArguments(func);
    const argStrings = args.map((arg) => {
      let signature = arg.name;
      if (arg.type) signature += `: ${arg.type}`;
      if (arg.isOptional) signature += "?";
      if (arg.hasDefault) signature += " = default";
      if (arg.isRest) signature = `...${signature}`;
      return signature;
    });

    return `${func.functionName}(${argStrings.join(", ")})`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const typescriptFunctionsService = new TypeScriptFunctionsServiceImpl();
export default typescriptFunctionsService;
