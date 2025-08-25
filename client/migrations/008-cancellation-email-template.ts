import { db } from "../src/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";

interface MigrationResult {
  message: string;
  details?: {
    created: number;
    skipped: number;
    errors: string[];
  };
}

export async function runMigration008(
  dryRun: boolean = false
): Promise<MigrationResult> {
  try {
    console.log("🔍 Checking if cancellation email template already exists...");

    // Check if template already exists
    const templatesRef = collection(db, "emailTemplates");
    const q = query(
      templatesRef,
      where("name", "==", "Cancellation Email Template")
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log(
        "⏭️  Cancellation email template already exists, skipping..."
      );
      return {
        message:
          "Cancellation email template already exists, migration skipped",
        details: {
          created: 0,
          skipped: 1,
          errors: [],
        },
      };
    }

    if (dryRun) {
      console.log("🔍 DRY RUN: Would create cancellation email template");
      return {
        message: "DRY RUN: Cancellation email template would be created",
        details: {
          created: 1,
          skipped: 0,
          errors: [],
        },
      };
    }

    console.log("📝 Creating cancellation email template...");

    const cancellationEmailTemplate = {
      name: "Cancellation Email Template",
      subject: "Tour Cancellation Notice - Important Update",
      content: `<!-- cancellationEmailTemplate.html -->

<p style="font-size: 16px; color: #333333;">Dear <strong>{{fullName}}</strong>,</p>

<p style="font-size: 16px; color: #333333;">
  We're reaching out with unfortunate news regarding your upcoming <strong>{{tourPackage}}</strong> scheduled for <strong>{{tourDate}}</strong>.
</p>

<p style="font-size: 16px; color: #333333;">
  Due to unforeseen circumstances, we regret to inform you that this tour has been <strong style="color: red;">cancelled</strong>. We understand how disappointing this may be and sincerely apologize for the inconvenience.
</p>

<p style="font-size: 16px; color: #333333;"><strong>You have a couple of options moving forward:</strong></p>

<ul style="font-size: 16px; color: #333333; padding-left: 20px;">
  <li><strong>Reschedule:</strong> We'd be happy to help you rebook the same tour for a future date or explore other travel packages that may suit your schedule.</li>
  <li><strong>Refund:</strong> If you prefer a full refund of <strong style="color: red;">{{cancelledRefundAmount}}</strong>, please send us your bank details and we'll process it promptly.</li>
</ul>

<p style="font-size: 16px; color: #333333;">
  Our team is ready to assist you and ensure this experience is handled with care. If you have any questions or need support, don't hesitate to contact us directly.
</p>

<p style="font-size: 16px; color: #333333;">Thank you for your patience and understanding.</p>
<p style="font-size: 16px; color: #333333;">Warm regards,</p>
<p style="font-size: 16px; color: #333333;"><strong>The ImHereTravels Team</strong></strong></p>

<div style="text-align: left; margin-top: 20px;">
  <img src="https://imheretravels.com/wp-content/uploads/2025/04/ImHereTravels-Logo.png" alt="ImHereTravels Logo" style="width: 120px; height: auto; display: block;">
</div>`,
      status: "active",
      variables: [
        "fullName",
        "tourPackage",
        "tourDate",
        "cancelledRefundAmount",
      ],
      metadata: {
        description:
          "Email template for notifying customers about tour cancellations",
        category: "cancellation",
        tags: ["cancellation", "refund", "reschedule", "customer-service"],
        createdBy: "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const docRef = await addDoc(
      collection(db, "emailTemplates"),
      cancellationEmailTemplate
    );

    console.log(
      "✅ Cancellation email template created successfully with ID:",
      docRef.id
    );

    return {
      message: "Cancellation email template created successfully",
      details: {
        created: 1,
        skipped: 0,
        errors: [],
      },
    };
  } catch (error) {
    console.error("❌ Error creating cancellation email template:", error);
    return {
      message: "Failed to create cancellation email template",
      details: {
        created: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
    };
  }
}

export async function rollbackMigration008(): Promise<MigrationResult> {
  try {
    console.log("🔄 Rolling back cancellation email template migration...");

    // Find and delete the cancellation email template
    const templatesRef = collection(db, "emailTemplates");
    const q = query(
      templatesRef,
      where("name", "==", "Cancellation Email Template")
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("⚠️  Cancellation email template not found for rollback");
      return {
        message: "Cancellation email template not found for rollback",
        details: {
          created: 0,
          skipped: 0,
          errors: [],
        },
      };
    }

    // Delete the template
    const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(
      "✅ Cancellation email template rollback completed successfully"
    );

    return {
      message: "Cancellation email template rollback completed successfully",
      details: {
        created: 0,
        skipped: 0,
        errors: [],
      },
    };
  } catch (error) {
    console.error(
      "❌ Error rolling back cancellation email template migration:",
      error
    );
    return {
      message: "Failed to rollback cancellation email template migration",
      details: {
        created: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
    };
  }
}
