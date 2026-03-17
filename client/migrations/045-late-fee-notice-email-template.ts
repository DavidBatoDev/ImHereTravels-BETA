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

const MIGRATION_ID = "045-late-fee-notice-email-template";
const COLLECTION_NAME = "emailTemplates";

const lateFeeNoticeTemplate = {
  name: "Late Fee Notice",
  subject: "Action Required: Late Fee Applied to {{ paymentTerm }}",
  content: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 24px;">
    <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 24px;">
      <p style="font-size: 16px; color: #333333; margin: 0 0 16px 0;">Hi {{ fullName }},</p>

      <p style="font-size: 16px; color: #333333; margin: 0 0 16px 0;">
        We are writing to inform you that a late fee has been applied to your <strong>{{ paymentTerm }}</strong> installment under booking
        <strong>{{ bookingCode }}</strong>.
      </p>

      <p style="font-size: 15px; color: #555555; margin: 0 0 16px 0; line-height: 1.6;">
        Please review the updated payment details below and settle the overdue amount as soon as possible to avoid further issues with your reservation.
      </p>

      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="border: 1px solid #dddddd; padding: 10px; font-weight: bold;">Tour</td>
          <td style="border: 1px solid #dddddd; padding: 10px;">{{ tourPackageName }}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #dddddd; padding: 10px; font-weight: bold;">Original Term Amount</td>
          <td style="border: 1px solid #dddddd; padding: 10px;">{{ originalAmount }}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #dddddd; padding: 10px; font-weight: bold;">Late Fee (3%)</td>
          <td style="border: 1px solid #dddddd; padding: 10px; color: #b71c1c; font-weight: bold;">{{ lateFeeAmount }}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #dddddd; padding: 10px; font-weight: bold;">Due Date</td>
          <td style="border: 1px solid #dddddd; padding: 10px;">{{ dueDate }}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #dddddd; padding: 10px; font-weight: bold;">Days Overdue</td>
          <td style="border: 1px solid #dddddd; padding: 10px;">{{ daysOverdue }}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #dddddd; padding: 10px; font-weight: bold;">Updated Remaining Balance</td>
          <td style="border: 1px solid #dddddd; padding: 10px;">{{ updatedRemainingBalance }}</td>
        </tr>
      </table>

      {% if bookingStatusUrl %}
      <p style="margin: 20px 0;">
        <a href="{{ bookingStatusUrl }}" target="_blank" style="background-color: #d32f2f; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px; display: inline-block;">
          View Booking Status
        </a>
      </p>
      {% endif %}

      <p style="font-size: 16px; color: #333333; margin: 0 0 16px 0;">
        If payment is still not made within 3 days from this notice, your booking may be cancelled.
      </p>

      <p style="font-size: 16px; color: #333333; margin: 0 0 16px 0;">
        Please review our Terms and Conditions:
        <a href="https://imheretravels.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" style="color: #0b57d0; text-decoration: underline;">Terms and Conditions</a>
      </p>

      <div style="background-color: #f5f5f5; border-left: 5px solid #e74c3c; border-radius: 10px; padding: 14px 16px; margin: 0 0 18px 0;">
        <p style="font-size: 14px; color: #555555; margin: 0; line-height: 1.6;">
          If you think this late fee was applied by mistake, or if you have any concerns, please reply to this email and our team will review it right away.
        </p>
      </div>

      <p style="font-size: 16px; color: #333333; margin: 0;">Best regards,<br /><strong>ImHereTravels Team</strong></p>

      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #e74c3c;">
        <h3 style="color: #e74c3c; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-align: center;">Need help?</h3>
        <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px; text-align: center;">
          Email us at <a href="mailto:bella@imheretravels.com" style="color: #2196F3; text-decoration: none;">bella@imheretravels.com</a>
        </p>
        <p style="color: #666666; margin: 0 0 15px 0; font-size: 14px; text-align: center;">or call us at +63 998 247 6847</p>
        <p style="color: #666666; margin: 0; font-size: 14px; text-align: center; font-weight: bold;">Connect</p>
        <div style="margin: 15px 0 0 0; text-align: center;">
          <a href="https://instagram.com/imheretravels" style="display: inline-block; margin: 0 8px;">
            <img src="https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1769577611985_instagram-icon.png?alt=media&token=26e11a52-4b1b-4323-bca0-8ffb3b8889ab" alt="Instagram" style="width: 24px; height: 24px; display: inline-block;">
          </a>
          <a href="https://www.facebook.com/profile.php?id=100089932897402" style="display: inline-block; margin: 0 8px;">
            <img src="https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1769578187350_facebook-icon.png?alt=media&token=0d59a081-d764-463a-8949-533dab620dc0" alt="Facebook" style="width: 24px; height: 24px; display: inline-block;">
          </a>
          <a href="https://www.tiktok.com/@imheretravels" style="display: inline-block; margin: 0 8px;">
            <img src="https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1769577615216_tiktok-icon.png?alt=media&token=2d2d9e95-52c5-4cf7-8906-7377ad7957d8" alt="TikTok" style="width: 24px; height: 24px; display: inline-block;">
          </a>
          <a href="https://imheretravels.com" style="display: inline-block; margin: 0 8px;">
            <img src="https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1769577613602_link-icon.png?alt=media&token=2a058d58-eaf7-4f53-bdea-845b2409764d" alt="Website" style="width: 24px; height: 24px; display: inline-block;">
          </a>
        </div>
      </div>

      <div style="background-color: #2c3e50; padding: 30px 20px; border-radius: 12px; margin: 35px 0 0 0; text-align: center; color: #ffffff;">
        <img src="https://firebasestorage.googleapis.com/v0/b/imheretravels-a3f81.firebasestorage.app/o/images%2F1768292814673_%F0%9F%9A%A3%20Logo%20Center%20(Row%20For%20Content%20Columns).png?alt=media&token=476fb69b-4cd5-4c56-901a-9190c15685f0" alt="ImHereTravels Logo" style="width: 150px; height: auto; display: block; margin: 0 auto 15px;" />
        <p style="margin: 0; font-size: 12px; color: #bdc3c7;">&copy; 2026 I'm Here Travels. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`,
  variables: [
    "fullName",
    "paymentTerm",
    "bookingCode",
    "tourPackageName",
    "originalAmount",
    "lateFeeAmount",
    "dueDate",
    "daysOverdue",
    "updatedRemainingBalance",
    "bookingStatusUrl",
  ],
  variableDefinitions: [
    {
      id: "1",
      name: "fullName",
      type: "string",
      description: "Recipient full name",
    },
    {
      id: "2",
      name: "paymentTerm",
      type: "string",
      description: "Installment term label (P1-P4)",
    },
    {
      id: "3",
      name: "bookingCode",
      type: "string",
      description: "Booking reference code",
    },
    {
      id: "4",
      name: "tourPackageName",
      type: "string",
      description: "Tour package name",
    },
    {
      id: "5",
      name: "originalAmount",
      type: "string",
      description: "Original installment amount",
    },
    {
      id: "6",
      name: "lateFeeAmount",
      type: "string",
      description: "Computed late fee amount",
    },
    {
      id: "7",
      name: "dueDate",
      type: "string",
      description: "Installment due date",
    },
    {
      id: "8",
      name: "daysOverdue",
      type: "number",
      description: "Number of overdue days",
    },
    {
      id: "9",
      name: "updatedRemainingBalance",
      type: "string",
      description: "Updated booking remaining balance",
    },
    {
      id: "10",
      name: "bookingStatusUrl",
      type: "string",
      description: "Public booking status URL",
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
    const conflictQuery = query(
      collection(db, COLLECTION_NAME),
      where("name", "==", lateFeeNoticeTemplate.name),
    );
    const conflictDocs = await getDocs(conflictQuery);

    if (conflictDocs.size > 0) {
      console.log("⚠️  Late Fee Notice template already exists, skipping...");
      results.skipped++;
    } else if (!dryRun) {
      await addDoc(collection(db, COLLECTION_NAME), lateFeeNoticeTemplate);
      console.log("✅ Created email template: Late Fee Notice");
      results.created++;
    } else {
      console.log("🔍 [DRY RUN] Would create template: Late Fee Notice");
      results.created++;
    }

    return {
      success: results.errors.length === 0,
      message:
        results.errors.length === 0
          ? dryRun
            ? `Dry run completed successfully. ${results.created} template would be created, ${results.skipped} skipped.`
            : `Migration completed successfully. ${results.created} template created, ${results.skipped} skipped.`
          : `Migration completed with errors. ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors.`,
      details: results,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown migration error";
    results.errors.push(errorMessage);

    return {
      success: false,
      message: `Migration failed: ${errorMessage}`,
      details: results,
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

  const result = {
    deleted: 0,
    errors: [] as string[],
  };

  try {
    const templateQuery = query(
      collection(db, COLLECTION_NAME),
      where("name", "==", lateFeeNoticeTemplate.name),
    );
    const templateDocs = await getDocs(templateQuery);

    for (const templateDoc of templateDocs.docs) {
      await deleteDoc(templateDoc.ref);
      result.deleted++;
    }

    return {
      success: true,
      message: `Rollback completed successfully. ${result.deleted} templates deleted.`,
      details: result,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown rollback error";
    result.errors.push(errorMessage);

    return {
      success: false,
      message: `Rollback failed: ${errorMessage}`,
      details: result,
    };
  }
}
