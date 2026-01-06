// Suppress specific React warnings that are known issues from third-party libraries
if (typeof window !== "undefined") {
  const originalError = console.error;

  console.error = (...args: any[]) => {
    const errorMessage = args[0]?.toString() || "";

    // Suppress flushSync warning from Radix UI on mobile devices
    if (
      errorMessage.includes(
        "flushSync was called from inside a lifecycle method"
      ) ||
      errorMessage.includes(
        "React cannot flush when React is already rendering"
      )
    ) {
      return;
    }

    // Call the original console.error for other errors
    originalError.apply(console, args);
  };
}

export {};
