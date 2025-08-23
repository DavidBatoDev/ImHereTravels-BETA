// functions/src/helloWorld.ts
import { onCall } from "firebase-functions/v2/https";

export const helloWorld = onCall(
  {
    region: "asia-southeast1",
    maxInstances: 10,
  },
  async (request) => {
    try {
      // Simple hello world response
      return {
        message: "Hello World from Firebase Functions! 🚀",
        timestamp: new Date().toISOString(),
        success: true,
        region: "asia-southeast1",
        data: request.data || null,
        auth: request.auth
          ? {
              uid: request.auth.uid,
              email: request.auth.token.email || null,
            }
          : null,
      };
    } catch (error) {
      console.error("Error in hello world function:", error);
      throw new Error("Something went wrong");
    }
  }
);
