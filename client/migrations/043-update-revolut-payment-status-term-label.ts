import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";
import { collection, getDocs, query, updateDoc, where } from "firebase/firestore";

const MIGRATION_ID = "043-update-revolut-payment-status-term-label";
const COLLECTION_NAME = "emailTemplates";

const APPROVED_TEMPLATE_NAME = "Revolut Payment Approved";
const REJECTED_TEMPLATE_NAME = "Revolut Payment Rejected";

const approvedContent = `<!DOCTYPE html>
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
</html>`;

const rejectedContent = `<!DOCTYPE html>
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
</html>`;

const commonVariables = [
  "fullName",
  "proofDate",
  "bookingStatusUrl",
  "installmentTermLabel",
];

const commonVariableDefinitions = [
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
];

export async function runMigration(dryRun: boolean = false): Promise<{
  success: boolean;
  message: string;
  details?: {
    updated: number;
    skipped: number;
    errors: string[];
  };
}> {
  console.log(`🚀 Starting migration: ${MIGRATION_ID}`);
  console.log(`📊 Dry run mode: ${dryRun ? "ON" : "OFF"}`);

  const results = {
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const updates = [
    {
      name: APPROVED_TEMPLATE_NAME,
      content: approvedContent,
    },
    {
      name: REJECTED_TEMPLATE_NAME,
      content: rejectedContent,
    },
  ];

  try {
    for (const templateUpdate of updates) {
      const templateQuery = query(
        collection(db, COLLECTION_NAME),
        where("name", "==", templateUpdate.name),
      );
      const templateSnapshots = await getDocs(templateQuery);

      if (templateSnapshots.empty) {
        console.log(`⚠️  Template not found, skipping: ${templateUpdate.name}`);
        results.skipped++;
        continue;
      }

      for (const templateDoc of templateSnapshots.docs) {
        if (!dryRun) {
          try {
            await updateDoc(templateDoc.ref, {
              content: templateUpdate.content,
              variables: commonVariables,
              variableDefinitions: commonVariableDefinitions,
              "metadata.updatedAt": Timestamp.now(),
            });
            results.updated++;
            console.log(`✅ Updated template: ${templateUpdate.name}`);
          } catch (error) {
            const errorMsg = `Failed to update template \"${templateUpdate.name}\": ${
              error instanceof Error ? error.message : "Unknown error"
            }`;
            console.error(`❌ ${errorMsg}`);
            results.errors.push(errorMsg);
          }
        } else {
          console.log(`🔍 [DRY RUN] Would update template: ${templateUpdate.name}`);
          results.updated++;
        }
      }
    }

    const success = results.errors.length === 0;
    const message = success
      ? dryRun
        ? `Dry run completed successfully. ${results.updated} templates would be updated, ${results.skipped} skipped.`
        : `Migration completed successfully. ${results.updated} templates updated, ${results.skipped} skipped.`
      : `Migration completed with errors. ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors.`;

    return {
      success,
      message,
      details: results,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

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
}> {
  return {
    success: true,
    message:
      "Rollback is not implemented for 043. Re-run migration 042 rollback + 042 run if you need to recreate templates.",
  };
}
