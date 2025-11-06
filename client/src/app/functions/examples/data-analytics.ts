// data-analytics.ts
// Example TypeScript function for data analytics with Firebase SDK

import {
  db,
  firebaseUtils,
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "../firebase-utils";

export default function dataAnalytics(
  operation: "summary" | "trends" | "filter" | "aggregate",
  options?: {
    collectionName?: string;
    dateRange?: { start: Date; end: Date };
    filters?: { [key: string]: any };
    limit?: number;
  }
) {
  // Functions are pre-authenticated, no need to check auth state
  switch (operation) {
    case "summary":
      return getDataSummary(options?.collectionName || "analytics");

    case "trends":
      return getTrends(
        options?.collectionName || "analytics",
        options?.dateRange
      );

    case "filter":
      return filterData(
        options?.collectionName || "analytics",
        options?.filters
      );

    case "aggregate":
      return aggregateData(
        options?.collectionName || "analytics",
        options?.filters
      );

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

// Get summary statistics for a collection
async function getDataSummary(collectionName: string) {
  try {
    const data = await firebaseUtils.getCollectionData(collectionName);

    const summary = {
      totalRecords: data.length,
      dateRange: {
        earliest:
          data.length > 0
            ? Math.min(
                ...data.map(
                  (d) =>
                    (d as any).createdAt?.toDate?.() || new Date().getTime()
                )
              )
            : null,
        latest:
          data.length > 0
            ? Math.max(
                ...data.map(
                  (d) =>
                    (d as any).createdAt?.toDate?.() || new Date().getTime()
                )
              )
            : null,
      },
      fields: data.length > 0 ? Object.keys(data[0]) : [],
      sampleData: data.slice(0, 5),
    };

    return { success: true, summary };
  } catch (error) {
    console.error("Error getting data summary:", error);
    throw new Error("Failed to get data summary");
  }
}

// Get trends over time
async function getTrends(
  collectionName: string,
  dateRange?: { start: Date; end: Date }
) {
  try {
    let constraints: any[] = [orderBy("createdAt", "desc")];

    if (dateRange) {
      constraints = [
        where("createdAt", ">=", dateRange.start),
        where("createdAt", "<=", dateRange.end),
        orderBy("createdAt", "desc"),
      ];
    }

    const data = await firebaseUtils.getCollectionData(
      collectionName,
      constraints
    );

    // Group by date (day)
    const trends = data.reduce((acc: any, item: any) => {
      const date = item.createdAt?.toDate?.() || new Date();
      const dayKey = date.toISOString().split("T")[0];

      if (!acc[dayKey]) {
        acc[dayKey] = { count: 0, items: [] };
      }

      acc[dayKey].count++;
      acc[dayKey].items.push(item);

      return acc;
    }, {});

    return { success: true, trends };
  } catch (error) {
    console.error("Error getting trends:", error);
    throw new Error("Failed to get trends");
  }
}

// Filter data based on criteria
async function filterData(
  collectionName: string,
  filters?: { [key: string]: any }
) {
  try {
    const constraints: any[] = [];

    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        constraints.push(where(field, "==", value));
      });
    }

    // Add ordering at the end
    constraints.push(orderBy("createdAt", "desc"));

    const data = await firebaseUtils.getCollectionData(
      collectionName,
      constraints
    );

    return { success: true, data, count: data.length };
  } catch (error) {
    console.error("Error filtering data:", error);
    throw new Error("Failed to filter data");
  }
}

// Aggregate data
async function aggregateData(
  collectionName: string,
  filters?: { [key: string]: any }
) {
  try {
    const constraints = [];

    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        constraints.push(where(field, "==", value));
      });
    }

    const data = await firebaseUtils.getCollectionData(
      collectionName,
      constraints
    );

    // Basic aggregations
    const aggregations = {
      count: data.length,
      numericFields: {},
      categoricalFields: {},
    };

    // Analyze numeric fields
    if (data.length > 0) {
      const sample = data[0];
      Object.keys(sample).forEach((key) => {
        if (typeof sample[key] === "number") {
          const values = data
            .map((d) => d[key])
            .filter((v) => typeof v === "number");
          if (values.length > 0) {
            aggregations.numericFields[key] = {
              min: Math.min(...values),
              max: Math.max(...values),
              avg: values.reduce((a, b) => a + b, 0) / values.length,
              sum: values.reduce((a, b) => a + b, 0),
            };
          }
        } else if (typeof sample[key] === "string") {
          const values = data
            .map((d) => d[key])
            .filter((v) => typeof v === "string");
          const valueCounts = values.reduce((acc: any, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {});
          aggregations.categoricalFields[key] = valueCounts;
        }
      });
    }

    return { success: true, aggregations };
  } catch (error) {
    console.error("Error aggregating data:", error);
    throw new Error("Failed to aggregate data");
  }
}
