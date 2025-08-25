import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "010-scheduled-reminder-email-template";
const COLLECTION_NAME = "emailTemplates";

// ============================================================================
// MIGRATION DATA - Scheduled Reminder Email Template
// ============================================================================

const scheduledReminderEmailTemplate = {
  name: "Scheduled Reminder Email",
  subject: "Tour Reminder - Your Adventure Awaits!",
  content: `<!-- scheduledReminderEmail.html -->
<div style="font-family: Arial, sans-serif; font-size: 14px;">

  <p>Hi <?= fullName ?>,</p>

  <p>
    This is a friendly reminder about your upcoming tour: <strong><?= tourPackage ?></strong>.
  </p>

  <h3 style="color: #d00;">Tour Details</h3>

  <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-size: 14px; border: 1px solid #ddd;" cellpadding="8" cellspacing="0">
    <tbody>
      <tr style="background-color: #f8f9fa;">
        <td style="border: 1px solid #ddd; text-align: left; font-weight: bold; padding: 10px;">Tour Name</td>
        <td style="border: 1px solid #ddd; padding: 10px;"><?= tourPackage ?></td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; text-align: left; font-weight: bold; padding: 10px;">Tour Date</td>
        <td style="border: 1px solid #ddd; padding: 10px;"><?= tourDate ?></td>
      </tr>
      <tr style="background-color: #f8f9fa;">
        <td style="border: 1px solid #ddd; text-align: left; font-weight: bold; padding: 10px;">Return Date</td>
        <td style="border: 1px solid #ddd; padding: 10px;"><?= returnDate ?></td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; text-align: left; font-weight: bold; padding: 10px;">Duration</td>
        <td style="border: 1px solid #ddd; padding: 10px;"><?= tourDuration ?> days</td>
      </tr>
      <tr style="background-color: #f8f9fa;">
        <td style="border: 1px solid #ddd; text-align: left; font-weight: bold; padding: 10px;">Booking ID</td>
        <td style="border: 1px solid #ddd; padding: 10px;"><?= bookingId ?></td>
      </tr>
      <? if (bookingType === "Group Booking" || bookingType === "Duo Booking") { ?>
        <tr>
          <td style="border: 1px solid #ddd; text-align: left; font-weight: bold; padding: 10px;">Group ID</td>
          <td style="border: 1px solid #ddd; padding: 10px;"><?= groupId ?></td>
        </tr>
        <tr style="background-color: #f8f9fa;">
          <td style="border: 1px solid #ddd; text-align: left; font-weight: bold; padding: 10px;">Main Booker</td>
          <td style="border: 1px solid #ddd; padding: 10px;"><?= mainBooker ?></td>
        </tr>
      <? } ?>
    </tbody>
  </table>

  <br>

  <h3 style="color: #d00;">Important Reminders</h3>

  <ul style="margin: 0; padding-left: 20px;">
    <li style="margin-bottom: 8px;">Please arrive at the meeting point 15 minutes before departure time</li>
    <li style="margin-bottom: 8px;">Bring comfortable walking shoes and weather-appropriate clothing</li>
    <li style="margin-bottom: 8px;">Don't forget your camera and any personal items you may need</li>
    <li style="margin-bottom: 8px;">Ensure you have all necessary travel documents</li>
  </ul>

  <br>

  <p><strong>Meeting Point:</strong> <?= meetingPoint ?></p>
  <p><strong>Departure Time:</strong> <?= departureTime ?></p>

  <? if (specialInstructions && specialInstructions.trim() !== "") { ?>
    <br>
    <h3 style="color: #d00;">Special Instructions</h3>
    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 15px 0;">
      <p style="margin: 0; color: #856404;"><?= specialInstructions ?></p>
    </div>
  <? } ?>

  <br>

  <p>If you have any questions or need to make changes to your booking, please contact us as soon as possible.</p>

  <p>We're excited to have you join us for this amazing adventure!</p>

  <p>
    Warm regards,<br>
    <strong>The ImHereTravels Team</strong><br>
  </p>

  <div style="margin-top: 20px;">
    <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px;">
  </div>
</div>`,
  variables: [
    "fullName",
    "tourPackage",
    "tourDate",
    "returnDate",
    "tourDuration",
    "bookingId",
    "bookingType",
    "groupId",
    "mainBooker",
    "meetingPoint",
    "departureTime",
    "specialInstructions",
  ],
  variableDefinitions: [
    {
      id: "1",
      name: "fullName",
      type: "string",
      description: "Full name of the recipient",
    },
    {
      id: "2",
      name: "tourPackage",
      type: "string",
      description: "Name of the tour package",
    },
    {
      id: "3",
      name: "tourDate",
      type: "string",
      description: "Start date of the tour",
    },
    {
      id: "4",
      name: "returnDate",
      type: "string",
      description: "End date of the tour",
    },
    {
      id: "5",
      name: "tourDuration",
      type: "number",
      description: "Duration of the tour in days",
    },
    {
      id: "6",
      name: "bookingId",
      type: "string",
      description: "Unique booking identifier",
    },
    {
      id: "7",
      name: "bookingType",
      type: "string",
      description: "Type of booking (Individual, Duo Booking, Group Booking)",
    },
    {
      id: "8",
      name: "groupId",
      type: "string",
      description: "Group identifier (for group and duo bookings)",
    },
    {
      id: "9",
      name: "mainBooker",
      type: "string",
      description: "Main booker's name (for group and duo bookings)",
    },
    {
      id: "10",
      name: "meetingPoint",
      type: "string",
      description: "Location where the tour will meet",
    },
    {
      id: "11",
      name: "departureTime",
      type: "string",
      description: "Time when the tour will depart",
    },
    {
      id: "12",
      name: "specialInstructions",
      type: "string",
      description: "Any special instructions or notes for the tour",
    },
  ],
  status: "active" as const,
  bccGroups: [],
  metadata: {
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: "system",
    usedCount: 0,
  },
};

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

export async function runMigration(dryRun: boolean = false): Promise<{
  success: boolean;
  message: string;
  details?: {
    created: number;
    skipped: number;
    errors: string[];
  };
}> {
  console.log(`🚀 Starting migration: ${MIGRATION_ID}`);
  console.log(`📊 Dry run mode: ${dryRun ? "ON" : "OFF"}`);

  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Check if template already exists
    const existingTemplates = await getDocs(collection(db, COLLECTION_NAME));
    const templateName = scheduledReminderEmailTemplate.name;

    if (existingTemplates.size > 0) {
      console.log(
        `⚠️  Found ${existingTemplates.size} existing email templates. Checking for conflicts...`
      );

      // Check for template name conflicts
      const conflictQuery = query(
        collection(db, COLLECTION_NAME),
        where("name", "==", templateName)
      );
      const conflictDocs = await getDocs(conflictQuery);

      if (conflictDocs.size > 0) {
        console.log(
          `⚠️  Template "${templateName}" already exists, skipping...`
        );
        results.skipped++;
      } else {
        if (!dryRun) {
          try {
            await addDoc(
              collection(db, COLLECTION_NAME),
              scheduledReminderEmailTemplate
            );
            console.log(`✅ Created email template: ${templateName}`);
            results.created++;
          } catch (error) {
            const errorMsg = `Failed to create template "${templateName}": ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            console.error(`❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        } else {
          console.log(
            `🔍 [DRY RUN] Would create email template: ${templateName}`
          );
          results.created++;
        }
      }
    } else {
      console.log(
        `📝 No existing email templates found. Creating scheduled reminder email template...`
      );

      if (!dryRun) {
        try {
          await addDoc(
            collection(db, COLLECTION_NAME),
            scheduledReminderEmailTemplate
          );
          console.log(`✅ Created email template: ${templateName}`);
          results.created++;
        } catch (error) {
          const errorMsg = `Failed to create template "${templateName}": ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      } else {
        console.log(
          `🔍 [DRY RUN] Would create email template: ${templateName}`
        );
        results.created++;
      }
    }

    const success = results.errors.length === 0;
    const message = dryRun
      ? `Migration dry run completed. Would create ${results.created} templates, skip ${results.skipped}.`
      : `Migration completed successfully. Created ${results.created} templates, skipped ${results.skipped}.`;

    console.log(
      `🎯 Migration ${success ? "SUCCESS" : "COMPLETED WITH ERRORS"}`
    );
    console.log(
      `📊 Results: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`
    );

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMsg = `Migration failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

export async function rollbackMigration(): Promise<{
  success: boolean;
  message: string;
  details?: {
    deleted: number;
    errors: string[];
  };
}> {
  console.log(`🔄 Rolling back migration: ${MIGRATION_ID}`);

  const results = {
    deleted: 0,
    errors: [] as string[],
  };

  try {
    // Find and delete template created by this migration
    const templateName = scheduledReminderEmailTemplate.name;
    const templateQuery = query(
      collection(db, COLLECTION_NAME),
      where("name", "==", templateName)
    );
    const templateDocs = await getDocs(templateQuery);

    for (const doc of templateDocs.docs) {
      try {
        await deleteDoc(doc.ref);
        console.log(`🗑️  Deleted email template: ${doc.data().name}`);
        results.deleted++;
      } catch (error) {
        const errorMsg = `Failed to delete template "${templateName}": ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    const success = results.errors.length === 0;
    const message = `Rollback ${
      success ? "completed successfully" : "completed with errors"
    }. Deleted ${results.deleted} templates.`;

    console.log(`🎯 Rollback ${success ? "SUCCESS" : "COMPLETED WITH ERRORS"}`);
    console.log(
      `📊 Results: ${results.deleted} deleted, ${results.errors.length} errors`
    );

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMsg = `Rollback failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    console.error(`❌ ${errorMsg}`);
    return {
      success: false,
      message: errorMsg,
    };
  }
}
