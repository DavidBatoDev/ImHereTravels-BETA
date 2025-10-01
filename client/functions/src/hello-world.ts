// functions/src/helloWorld.ts
import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

export const helloWorld = onRequest(
  {
    region: "asia-southeast1",
    maxInstances: 10,
    cors: true, // Enable CORS for all origins
    invoker: "public", // Make function publicly accessible
  },
  async (request, response) => {
    try {
      logger.info("Hello World function called", { structuredData: true });

      // Simple hello world response
      const responseData = {
        message: "Hello World from Firebase Functions! 🚀",
        timestamp: new Date().toISOString(),
        success: true,
        region: "asia-southeast1",
        method: request.method,
        userAgent: request.get("User-Agent") || "Unknown",
        ip: request.ip,
      };

      response.status(200).json(responseData);
    } catch (error) {
      logger.error("Error in hello world function:", error);
      response.status(500).json({
        message: "Something went wrong",
        success: false,
        timestamp: new Date().toISOString(),
      });
    }
  }
);
