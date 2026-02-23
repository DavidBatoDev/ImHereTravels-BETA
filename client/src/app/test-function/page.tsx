"use client";

import { useState } from "react";

export default function TestFunctionPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testFunction = async () => {
    setLoading(true);
    try {
      // Update this to call your actual API endpoint
      const response = await fetch("/api/your-endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testData: "Hello from client!",
          timestamp: new Date().toISOString(),
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        message: "Error calling API",
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Test API Function
        </h1>

        <button
          onClick={testFunction}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {loading ? "Testing..." : "Test API"}
        </button>

        {result && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Result:
            </h2>
            <pre className="bg-gray-100 p-3 rounded-md text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
