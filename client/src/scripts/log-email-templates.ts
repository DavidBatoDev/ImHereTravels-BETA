#!/usr/bin/env tsx

/**
 * Script to generate a JSON file with all email templates from Firebase
 *
 * Usage:
 *   npm run log-email-templates
 *   or
 *   npx tsx src/scripts/log-email-templates.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../migrations/firebase-config";
import { CommunicationTemplate } from "../types/communications";

console.log("🚀 Starting email templates JSON generation from Firebase...");

// Fetch email templates from Firebase
async function fetchEmailTemplatesFromFirebase(): Promise<
  CommunicationTemplate[]
> {
  try {
    console.log("📡 Fetching email templates from Firebase...");
    const templatesRef = collection(db, "emailTemplates");
    const snapshot = await getDocs(templatesRef);

    if (snapshot.empty) {
      console.log("❌ No email templates found in Firebase");
      return [];
    }

    const templates: CommunicationTemplate[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        ...data,
      } as CommunicationTemplate);
    });

    console.log(`✅ Fetched ${templates.length} email templates from Firebase`);
    return templates;
  } catch (error) {
    console.error("❌ Error fetching email templates from Firebase:", error);
    throw error;
  }
}

// Generate summary statistics
function generateTemplateSummary(templates: CommunicationTemplate[]) {
  const statusCounts = templates.reduce((acc, template) => {
    acc[template.status] = (acc[template.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const createdByCounts = templates.reduce((acc, template) => {
    const createdBy = template.metadata?.createdBy || "unknown";
    acc[createdBy] = (acc[createdBy] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalUsedCount = templates.reduce((acc, template) => {
    return acc + (template.metadata?.usedCount || 0);
  }, 0);

  const averageUsedCount =
    templates.length > 0 ? totalUsedCount / templates.length : 0;

  return {
    totalTemplates: templates.length,
    statusSummary: statusCounts,
    createdBySummary: createdByCounts,
    totalUsedCount,
    averageUsedCount: Math.round(averageUsedCount * 100) / 100,
  };
}

// Main execution
async function main() {
  try {
    // Fetch email templates from Firebase
    const templates = await fetchEmailTemplatesFromFirebase();

    if (templates.length === 0) {
      console.log("❌ No email templates to export");
      return;
    }

    // Generate summary
    const summary = generateTemplateSummary(templates);

    // Prepare export data
    const exportedData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalTemplates: templates.length,
        source: "Firebase emailTemplates collection",
      },
      summary,
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        subject: template.subject,
        content: template.content,
        variables: template.variables,
        variableDefinitions: template.variableDefinitions,
        status: template.status,
        bccGroups: template.bccGroups,
        metadata: {
          createdAt:
            template.metadata?.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt:
            template.metadata?.updatedAt?.toDate?.()?.toISOString() || null,
          createdBy: template.metadata?.createdBy,
          usedCount: template.metadata?.usedCount || 0,
        },
      })),
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `email-templates-${timestamp}.json`;

    // Write to exports directory
    const outputPath = join(process.cwd(), "exports", filename);

    // Ensure exports directory exists
    const fs = require("fs");
    const exportsDir = join(process.cwd(), "exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Write JSON file
    writeFileSync(outputPath, JSON.stringify(exportedData, null, 2));

    console.log(`✅ JSON file generated successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📍 Path: ${outputPath}`);
    console.log(`📊 Templates: ${exportedData.metadata.totalTemplates}`);
    console.log(`📈 Summary:`);
    console.log(`   - Active: ${summary.statusSummary.active || 0}`);
    console.log(`   - Draft: ${summary.statusSummary.draft || 0}`);
    console.log(`   - Archived: ${summary.statusSummary.archived || 0}`);
    console.log(`   - Total Used Count: ${summary.totalUsedCount}`);
    console.log(`   - Average Used Count: ${summary.averageUsedCount}`);
  } catch (error) {
    console.error("❌ Error generating JSON file:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
