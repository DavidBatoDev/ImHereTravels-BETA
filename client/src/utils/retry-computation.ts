/**
 * Retry Computation Utility
 * 
 * Provides retry logic for column calculations and formulas that may fail
 * due to async operations, external dependencies, or timing issues.
 */

export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number; // Base delay in milliseconds
  maxDelay?: number; // Maximum delay in milliseconds
  backoffMultiplier?: number; // Exponential backoff multiplier
  onRetry?: (attempt: number, error: any) => void;
  shouldRetry?: (error: any) => boolean; // Custom function to determine if error is retryable
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  onRetry: () => {},
  shouldRetry: () => true,
};

/**
 * Execute a computation with retry logic
 * 
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns Promise with retry result
 */
export async function retryComputation<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = performance.now();
  let lastError: any;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await fn();
      const totalTime = performance.now() - startTime;

      return {
        success: true,
        result,
        attempts: attempt,
        totalTime,
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!finalConfig.shouldRetry(error)) {
        console.log(
          `🚫 [RETRY] Error is not retryable, aborting after attempt ${attempt}`
        );
        break;
      }

      // If this is not the last attempt, wait before retrying
      if (attempt < finalConfig.maxAttempts) {
        // Calculate exponential backoff delay
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        );

        console.log(
          `🔄 [RETRY] Attempt ${attempt}/${finalConfig.maxAttempts} failed, retrying in ${delay}ms...`
        );

        finalConfig.onRetry(attempt, error);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const totalTime = performance.now() - startTime;

  return {
    success: false,
    error: lastError,
    attempts: finalConfig.maxAttempts,
    totalTime,
  };
}

/**
 * Batch retry computation for multiple items with progress tracking
 * 
 * @param items - Array of items to process
 * @param fn - Function to execute for each item
 * @param config - Retry configuration
 * @param onProgress - Progress callback
 * @returns Array of retry results
 */
export async function retryBatchComputation<TItem, TResult>(
  items: TItem[],
  fn: (item: TItem) => Promise<TResult>,
  config: RetryConfig = {},
  onProgress?: (completed: number, total: number, currentItem: TItem) => void
): Promise<RetryResult<TResult>[]> {
  const results: RetryResult<TResult>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (onProgress) {
      onProgress(i, items.length, item);
    }

    const result = await retryComputation(() => fn(item), config);
    results.push(result);
  }

  if (onProgress) {
    onProgress(items.length, items.length, items[items.length - 1]);
  }

  return results;
}

/**
 * Parallel batch retry computation with concurrency control
 * 
 * @param items - Array of items to process
 * @param fn - Function to execute for each item
 * @param config - Retry configuration
 * @param concurrency - Maximum number of concurrent operations
 * @param onProgress - Progress callback
 * @returns Array of retry results
 */
export async function retryParallelBatchComputation<TItem, TResult>(
  items: TItem[],
  fn: (item: TItem) => Promise<TResult>,
  config: RetryConfig = {},
  concurrency: number = 5,
  onProgress?: (completed: number, total: number) => void
): Promise<RetryResult<TResult>[]> {
  const results: RetryResult<TResult>[] = new Array(items.length);
  let completed = 0;
  let index = 0;

  const processNext = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];

      const result = await retryComputation(() => fn(item), config);
      results[currentIndex] = result;
      completed++;

      if (onProgress) {
        onProgress(completed, items.length);
      }
    }
  };

  // Create worker promises
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => processNext());

  // Wait for all workers to complete
  await Promise.all(workers);

  return results;
}

/**
 * Check if an error is retryable based on common patterns
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || "";
  const errorString = String(error).toLowerCase();

  // Network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("enotfound")
  ) {
    return true;
  }

  // Rate limiting
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests") ||
    errorString.includes("429")
  ) {
    return true;
  }

  // Temporary service errors
  if (
    errorMessage.includes("service unavailable") ||
    errorMessage.includes("503") ||
    errorMessage.includes("502") ||
    errorMessage.includes("504")
  ) {
    return true;
  }

  // Firebase/Firestore specific errors
  if (
    errorMessage.includes("deadline-exceeded") ||
    errorMessage.includes("unavailable") ||
    errorMessage.includes("resource-exhausted")
  ) {
    return true;
  }

  // Dependency not ready yet
  if (
    errorMessage.includes("undefined") ||
    errorMessage.includes("not found") ||
    errorMessage.includes("missing")
  ) {
    return true;
  }

  return false;
}

/**
 * Create a retry configuration for column computations
 */
export function createColumnComputationRetryConfig(
  columnName?: string
): RetryConfig {
  return {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    shouldRetry: isRetryableError,
    onRetry: (attempt, error) => {
      console.log(
        `🔄 [COLUMN RETRY${
          columnName ? ` - ${columnName}` : ""
        }] Attempt ${attempt} failed:`,
        error
      );
    },
  };
}

/**
 * Statistics for retry operations
 */
export interface RetryStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalAttempts: number;
  totalTime: number;
  averageTime: number;
  averageAttemptsPerOperation: number;
}

/**
 * Calculate statistics from retry results
 */
export function calculateRetryStats<T>(
  results: RetryResult<T>[]
): RetryStats {
  const totalOperations = results.length;
  const successfulOperations = results.filter((r) => r.success).length;
  const failedOperations = totalOperations - successfulOperations;
  const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);
  const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);

  return {
    totalOperations,
    successfulOperations,
    failedOperations,
    totalAttempts,
    totalTime,
    averageTime: totalTime / totalOperations,
    averageAttemptsPerOperation: totalAttempts / totalOperations,
  };
}
