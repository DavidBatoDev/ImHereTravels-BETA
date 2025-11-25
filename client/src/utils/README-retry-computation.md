# Retry Computation Utility

Provides retry logic for column calculations and formulas that may fail due to async operations, external dependencies, or timing issues.

## Features

- **Automatic Retry**: Automatically retries failed computations with configurable attempts
- **Exponential Backoff**: Progressive delay between retry attempts (default: 500ms, 1s, 2s)
- **Smart Error Detection**: Identifies retryable errors (network issues, rate limits, temporary failures)
- **Progress Tracking**: Built-in progress tracking for batch operations
- **Parallel Processing**: Support for concurrent batch operations with concurrency control
- **Statistics**: Comprehensive statistics tracking for monitoring retry behavior

## Usage

### Basic Retry

```typescript
import {
  retryComputation,
  createColumnComputationRetryConfig,
} from "@/utils/retry-computation";

const result = await retryComputation(async () => {
  // Your computation that might fail
  return await someAsyncOperation();
}, createColumnComputationRetryConfig("My Column"));

if (result.success) {
  console.log("Result:", result.result);
  console.log(
    `Completed in ${result.attempts} attempts (${result.totalTime}ms)`
  );
} else {
  console.error("Failed after", result.attempts, "attempts:", result.error);
}
```

### Custom Configuration

```typescript
import { retryComputation } from "@/utils/retry-computation";

const result = await retryComputation(async () => await fetchData(), {
  maxAttempts: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds max
  backoffMultiplier: 2, // Exponential: 1s, 2s, 4s, 8s, 10s
  shouldRetry: (error) => {
    // Custom logic to determine if error is retryable
    return error.message.includes("timeout");
  },
  onRetry: (attempt, error) => {
    console.log(`Retry attempt ${attempt}:`, error);
  },
});
```

### Batch Processing

```typescript
import { retryBatchComputation } from "@/utils/retry-computation";

const items = [1, 2, 3, 4, 5];
const results = await retryBatchComputation(
  items,
  async (item) => {
    // Process each item
    return await processItem(item);
  },
  createColumnComputationRetryConfig(),
  (completed, total, currentItem) => {
    console.log(`Progress: ${completed}/${total}, processing:`, currentItem);
  }
);
```

### Parallel Batch Processing

```typescript
import { retryParallelBatchComputation } from '@/utils/retry-computation';

const rows = [...]; // Your data rows
const results = await retryParallelBatchComputation(
  rows,
  async (row) => {
    // Compute function for each row
    return await computeFunction(row);
  },
  createColumnComputationRetryConfig(),
  5, // Process 5 rows concurrently
  (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
);
```

### Statistics

```typescript
import { calculateRetryStats } from '@/utils/retry-computation';

const results = [...]; // Results from batch operations
const stats = calculateRetryStats(results);

console.log('Statistics:', {
  totalOperations: stats.totalOperations,
  successRate: `${(stats.successfulOperations / stats.totalOperations * 100).toFixed(2)}%`,
  averageAttempts: stats.averageAttemptsPerOperation.toFixed(2),
  averageTime: `${stats.averageTime.toFixed(2)}ms`,
  totalTime: `${(stats.totalTime / 1000).toFixed(2)}s`
});
```

## Retryable Errors

The utility automatically detects and retries these types of errors:

- **Network Errors**: Connection refused, timeout, DNS lookup failures
- **Rate Limiting**: 429 Too Many Requests, rate limit exceeded
- **Temporary Service Errors**: 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
- **Firebase/Firestore Errors**: deadline-exceeded, unavailable, resource-exhausted
- **Dependency Errors**: Missing or undefined dependencies (data not yet available)

## Configuration Options

| Option              | Type     | Default            | Description                                 |
| ------------------- | -------- | ------------------ | ------------------------------------------- |
| `maxAttempts`       | number   | 3                  | Maximum number of retry attempts            |
| `baseDelay`         | number   | 500                | Base delay in milliseconds                  |
| `maxDelay`          | number   | 5000               | Maximum delay between retries               |
| `backoffMultiplier` | number   | 2                  | Exponential backoff multiplier              |
| `shouldRetry`       | function | `isRetryableError` | Function to determine if error is retryable |
| `onRetry`           | function | -                  | Callback invoked on each retry attempt      |

## Integration with BookingsDataGrid

The retry logic is automatically integrated into the `computeFunctionForRow` function in `BookingsDataGrid.tsx`. All column computations benefit from automatic retry with these features:

- **3 retry attempts** with exponential backoff
- **Smart error detection** for retryable failures
- **Automatic logging** of retry attempts and success/failure
- **Progress tracking** during batch recomputation
- **Statistics** showing retry behavior for monitoring

### Example Log Output

```
🔄 [COLUMN RETRY - Return Date] Attempt 1 failed: TypeError: Cannot read property 'toDate' of undefined
🔄 [RETRY] Attempt 1/3 failed, retrying in 500ms...
⚡ [DIRECT EXEC] Calling tourEndDateFromStartAndDurationFunction with args: [...]
✅ [RETRY SUCCESS] tourEndDateFromStartAndDurationFunction succeeded after 2 attempts (1250.45ms)
```

## Performance Considerations

- **Parallel Processing**: Use `retryParallelBatchComputation` for large datasets with controlled concurrency
- **Backoff Strategy**: Exponential backoff prevents overwhelming services during temporary outages
- **Smart Retries**: Only retries errors that are likely to succeed on retry
- **Progress Tracking**: Minimal overhead with throttled UI updates
- **Cache Integration**: Works seamlessly with existing function arguments cache

## Best Practices

1. **Use column-specific configs**: `createColumnComputationRetryConfig(columnName)` for better logging
2. **Adjust concurrency**: Lower concurrency (2-5) for external API calls, higher (10-20) for local computations
3. **Monitor statistics**: Use `calculateRetryStats` to identify problematic functions
4. **Custom shouldRetry**: Implement custom logic for domain-specific errors
5. **Progressive delays**: Default exponential backoff works well for most cases

## Troubleshooting

### High Retry Rates

If you see many retry attempts:

- Check network connectivity
- Verify external service availability
- Review function dependencies (ensure required data is computed first)
- Consider increasing base delay for rate-limited APIs

### Slow Performance

If computations are slow:

- Reduce `maxAttempts` for non-critical functions
- Decrease `baseDelay` for fast, reliable operations
- Increase concurrency in parallel batch operations
- Review function execution time tracking

### Persistent Failures

If functions consistently fail after all retries:

- Check `shouldRetry` logic (may be retrying non-retryable errors)
- Review function implementation for bugs
- Verify data dependencies are correctly configured
- Check Firebase/Firestore quotas and limits
