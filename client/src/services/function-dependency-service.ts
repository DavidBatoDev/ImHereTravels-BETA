import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TSFile } from "@/types/functions";

export interface FunctionDependency {
  functionId: string;
  functionName: string;
  dependencies: string[]; // Array of function names this function depends on
  dependents: string[]; // Array of function names that depend on this function
}

export interface DependencyGraph {
  [functionId: string]: FunctionDependency;
}

export class FunctionDependencyService {
  private dependencyGraph: DependencyGraph = {};
  private functionNameToIdMap: Map<string, string> = new Map();

  /**
   * Build the complete dependency graph from all functions
   */
  async buildDependencyGraph(): Promise<DependencyGraph> {
    try {
      // Fetch all functions
      const functionsRef = collection(db, "ts_files");
      const functionsSnapshot = await getDocs(functionsRef);

      const functions: TSFile[] = [];
      functionsSnapshot.forEach((doc) => {
        functions.push({ id: doc.id, ...doc.data() } as TSFile);
      });

      // Initialize the graph
      this.dependencyGraph = {};
      this.functionNameToIdMap.clear();

      // Build function name to ID mapping
      functions.forEach((func) => {
        if (func.functionName) {
          this.functionNameToIdMap.set(func.functionName, func.id);
        }
      });

      // Build dependency graph
      functions.forEach((func) => {
        const dependencies = func.functionDependencies || [];
        const dependencyIds = dependencies
          .map((depName) => this.functionNameToIdMap.get(depName))
          .filter((id): id is string => id !== undefined);

        this.dependencyGraph[func.id] = {
          functionId: func.id,
          functionName: func.functionName || "",
          dependencies: dependencyIds,
          dependents: [],
        };
      });

      // Build dependents (reverse dependencies)
      Object.values(this.dependencyGraph).forEach((funcDep) => {
        funcDep.dependencies.forEach((depId) => {
          if (this.dependencyGraph[depId]) {
            this.dependencyGraph[depId].dependents.push(funcDep.functionId);
          }
        });
      });

      return this.dependencyGraph;
    } catch (error) {
      console.error("Error building dependency graph:", error);
      throw error;
    }
  }

  /**
   * Get all functions that depend on the given function (transitive closure)
   */
  getDependents(functionId: string): string[] {
    const visited = new Set<string>();
    const dependents: string[] = [];

    const collectDependents = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const funcDep = this.dependencyGraph[currentId];
      if (funcDep) {
        funcDep.dependents.forEach((dependentId) => {
          dependents.push(dependentId);
          collectDependents(dependentId);
        });
      }
    };

    collectDependents(functionId);
    return dependents;
  }

  /**
   * Get all functions that the given function depends on (transitive closure)
   */
  getDependencies(functionId: string): string[] {
    const visited = new Set<string>();
    const dependencies: string[] = [];

    const collectDependencies = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const funcDep = this.dependencyGraph[currentId];
      if (funcDep) {
        funcDep.dependencies.forEach((depId) => {
          dependencies.push(depId);
          collectDependencies(depId);
        });
      }
    };

    collectDependencies(functionId);
    return dependencies;
  }

  /**
   * Check if there are circular dependencies
   */
  hasCircularDependencies(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (functionId: string): boolean => {
      if (recursionStack.has(functionId)) return true;
      if (visited.has(functionId)) return false;

      visited.add(functionId);
      recursionStack.add(functionId);

      const funcDep = this.dependencyGraph[functionId];
      if (funcDep) {
        for (const depId of funcDep.dependencies) {
          if (hasCycle(depId)) return true;
        }
      }

      recursionStack.delete(functionId);
      return false;
    };

    return Object.keys(this.dependencyGraph).some((functionId) =>
      hasCycle(functionId)
    );
  }

  /**
   * Get the dependency graph
   */
  getDependencyGraph(): DependencyGraph {
    return this.dependencyGraph;
  }

  /**
   * Update function dependencies in the database
   */
  async updateFunctionDependencies(
    functionId: string,
    dependencies: string[]
  ): Promise<void> {
    try {
      const functionRef = doc(db, "ts_files", functionId);
      await updateDoc(functionRef, {
        functionDependencies: dependencies,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error updating function dependencies:", error);
      throw error;
    }
  }

  /**
   * Get functions that need to be recomputed when a function is updated
   */
  getFunctionsToRecompute(updatedFunctionId: string): string[] {
    // Get all functions that depend on the updated function (including transitive dependencies)
    const dependents = this.getDependents(updatedFunctionId);

    // Include the updated function itself
    return [updatedFunctionId, ...dependents];
  }
}

// Export singleton instance
export const functionDependencyService = new FunctionDependencyService();
export default functionDependencyService;
