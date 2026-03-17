import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const MIGRATION_ID = "042-revolut-payment-status-email-templates";
const COLLECTION_NAME = "emailTemplates";

const approvedTemplate = {
  name: "Revolut Payment Approved",
  subject: "Payment Received - Thank You",
  content: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; margin: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px;">
      <p style="font-size: 16px; color: #333333;">Hi {{ fullName }},</p>

      <p style="font-size: 16px; color: #333333;">
        We've received your proof of payment sent on <strong>{{ proofDate }}</strong>,
        and we're happy to confirm that your payment has been successfully received and verified.
      </p>

      <p style="font-size: 16px; color: #333333;">
        Your booking has now been updated in our system.
      </p>

      <p style="font-size: 16px; color: #333333;">
        <strong>Approved term:</strong> {{ installmentTermLabel }}
      </p>

      <h3 style="font-size: 20px; color: #d32f2f; margin-top: 20px;">What's Next</h3>

      <p style="font-size: 16px; color: #333333;">
        You can view your updated payment status anytime through your Booking Status page.
      </p>

      {% if bookingStatusUrl %}
      <p style="margin-top: 15px;">
        <a
          href="{{ bookingStatusUrl }}"
          target="_blank"
          style="display: inline-block; background-color: #e74c3c; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold;"
        >
          View Booking Status
        </a>
      </p>
      {% endif %}

      <p style="font-size: 16px; color: #333333;">
        If you have any upcoming payments as part of your payment plan,
        please make sure to complete them before their due dates to keep your booking active.
      </p>

      <p style="font-size: 16px; color: #333333;">
        If you have any questions, feel free to reply to this email and our team will be happy to assist you.
      </p>

      <p style="font-size: 16px; color: #333333;">
        Thank you and we look forward to having you on the trip!
      </p>

      <p style="font-size: 16px; color: #333333;">Best regards,</p>
      <p style="font-size: 16px; color: #333333;"><strong>ImHereTravels Team</strong></p>
    </div>
  </body>
</html>`,
  variables: ["fullName", "proofDate", "bookingStatusUrl", "installmentTermLabel"],
  variableDefinitions: [
    {
      id: "1",
      name: "fullName",
      type: "string",
      description: "Recipient full name",
    },
    {
      id: "2",
      name: "proofDate",
      type: "string",
      description: "Date when payment proof was submitted",
    },
    {
      id: "3",
      name: "bookingStatusUrl",
      type: "string",
      description: "Public booking status page URL",
    },
    {
      id: "4",
      name: "installmentTermLabel",
      type: "string",
      description: "Human-friendly payment term label (e.g., P2 or Full Payment)",
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

const rejectedTemplate = {
  name: "Revolut Payment Rejected",
  subject: "Payment Unsuccessful - Action Required",
  content: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; margin: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px;">
      <p style="font-size: 16px; color: #333333;">Hi {{ fullName }},</p>

      <p style="font-size: 16px; color: #333333;">
        We received the proof of payment you sent on <strong>{{ proofDate }}</strong>.
        However, our system shows that the payment did not successfully go through.
      </p>

      <p style="font-size: 16px; color: #333333;">
        We also checked again after 48 hours, and the payment still has not been received on our end.
      </p>

      <p style="font-size: 16px; color: #333333;">
        <strong>Attempted term:</strong> {{ installmentTermLabel }}
      </p>

      <h3 style="font-size: 20px; color: #d32f2f; margin-top: 20px;">Next Steps</h3>

      <p style="font-size: 16px; color: #333333;">
        Please contact your bank or payment provider to check if the transaction was completed or reversed.
      </p>

      <p style="font-size: 16px; color: #333333;">
        Once confirmed, you may submit the payment again through your Booking Status page.
      </p>

      {% if bookingStatusUrl %}
      <p style="margin-top: 15px;">
        <a
          href="{{ bookingStatusUrl }}"
          target="_blank"
          style="display: inline-block; background-color: #e74c3c; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold;"
        >
          Open Booking Status Page
        </a>
      </p>
      {% endif %}

      <p style="font-size: 16px; color: #333333;">
        If you have any questions or need assistance, feel free to reply to this email and our team will be happy to help.
      </p>

      <p style="font-size: 16px; color: #333333;">Thank you.</p>
      <p style="font-size: 16px; color: #333333;">Best regards,</p>
      <p style="font-size: 16px; color: #333333;"><strong>ImHereTravels Team</strong></p>
    </div>
  </body>
</html>`,
  variables: ["fullName", "proofDate", "bookingStatusUrl", "installmentTermLabel"],
  variableDefinitions: [
    {
      id: "1",
      name: "fullName",
      type: "string",
      description: "Recipient full name",
    },
    {
      id: "2",
      name: "proofDate",
      type: "string",
      description: "Date when payment proof was submitted",
    },
    {
      id: "3",
      name: "bookingStatusUrl",
      type: "string",
      description: "Public booking status page URL",
    },
    {
      id: "4",
      name: "installmentTermLabel",
      type: "string",
      description: "Human-friendly payment term label (e.g., P2 or Full Payment)",
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
    const templates = [approvedTemplate, rejectedTemplate];

    for (const template of templates) {
      const conflictQuery = query(
        collection(db, COLLECTION_NAME),
        where("name", "==", template.name),
      );
      const conflictDocs = await getDocs(conflictQuery);

      if (conflictDocs.size > 0) {
        console.log(
          `⚠️  Template "${template.name}" already exists, skipping...`,
        );
        results.skipped++;
        continue;
      }

      if (!dryRun) {
        try {
          await addDoc(collection(db, COLLECTION_NAME), template);
          console.log(`✅ Created email template: ${template.name}`);
          results.created++;
        } catch (error) {
          const errorMsg = `Failed to create template "${template.name}": ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      } else {
        console.log(`🔍 [DRY RUN] Would create template: ${template.name}`);
        results.created++;
      }
    }

    const success = results.errors.length === 0;
    const message = success
      ? dryRun
        ? `Dry run completed successfully. ${results.created} templates would be created, ${results.skipped} skipped.`
        : `Migration completed successfully. ${results.created} templates created, ${results.skipped} skipped.`
      : `Migration completed with errors. ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors.`;

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Migration failed: ${errorMessage}`);

    return {
      success: false,
      message: `Migration failed: ${errorMessage}`,
      details: {
        ...results,
        errors: [...results.errors, errorMessage],
      },
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
  console.log(`🔄 Starting rollback: ${MIGRATION_ID}`);

  const results = {
    deleted: 0,
    errors: [] as string[],
  };

  try {
    const targetNames = [approvedTemplate.name, rejectedTemplate.name];

    for (const templateName of targetNames) {
      const templatesQuery = query(
        collection(db, COLLECTION_NAME),
        where("name", "==", templateName),
      );
      const templatesSnapshot = await getDocs(templatesQuery);

      for (const documentSnapshot of templatesSnapshot.docs) {
        try {
          await deleteDoc(doc(db, COLLECTION_NAME, documentSnapshot.id));
          results.deleted++;
          console.log(
            `✅ Deleted template: ${templateName} (${documentSnapshot.id})`,
          );
        } catch (error) {
          const errorMsg = `Failed to delete template "${templateName}" (${documentSnapshot.id}): ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }
    }

    const success = results.errors.length === 0;
    const message = success
      ? `Rollback completed successfully. ${results.deleted} templates deleted.`
      : `Rollback completed with errors. ${results.deleted} deleted, ${results.errors.length} errors.`;

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Rollback failed: ${errorMessage}`);

    return {
      success: false,
      message: `Rollback failed: ${errorMessage}`,
      details: {
        ...results,
        errors: [...results.errors, errorMessage],
      },
    };
  }
}
