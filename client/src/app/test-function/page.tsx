"use client";

import { useState } from "react";
import { callHelloWorld } from "@/services/hello-world-service";

export default function TestFunctionPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testFunction = async () => {
    setLoading(true);
    try {
      const response = await callHelloWorld({
        testData: "Hello from client!",
        timestamp: new Date().toISOString(),
      });
      setResult(response);
    } catch (error) {
      setResult({
        message: "Error calling function",
        timestamp: new Date().toISOString(),
        success: false,
        region: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Test Firebase Function
        </h1>

        <div className="mb-4 p-3 bg-green-100 rounded-md">
          <h2 className="font-semibold text-green-900 mb-2">Status:</h2>
          <p className="text-green-700">
            ✅ Using Firebase onCall function - direct connection
          </p>
        </div>

        <button
          onClick={testFunction}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {loading ? "Testing..." : "Test Hello World Function"}
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
