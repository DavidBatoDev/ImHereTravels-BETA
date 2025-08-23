import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

export interface HelloWorldResponse {
  message: string;
  timestamp: string;
  success: boolean;
  region: string;
  data?: any;
  auth?: {
    uid: string;
    email: string | null;
  } | null;
}

export async function callHelloWorld(data?: any): Promise<HelloWorldResponse> {
  try {
    const functions = getFunctions(app, "asia-southeast1");
    const helloWorld = httpsCallable<any, HelloWorldResponse>(
      functions,
      "helloWorld"
    );

    const result = await helloWorld(data);
    return result.data;
  } catch (error) {
    console.error("Error calling helloWorld function:", error);

    return {
      message: "Failed to call function",
      timestamp: new Date().toISOString(),
      success: false,
      region: "error",
    };
  }
}
