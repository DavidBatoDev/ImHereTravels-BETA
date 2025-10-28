/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";

// Import our functions
export { helloWorld } from "./hello-world";
export { sendVerificationEmail } from "./send-verification-email";
export { verifyEmail } from "./verify-email";
export {
  onTypeScriptFunctionUpdated,
  onTypeScriptFunctionUpdatedSimple,
} from "./recompute-on-function-update";
export { testRecompute } from "./test-recompute";
export { generateReservationEmail } from "./generate-reservation-email";
export { sendReservationEmail } from "./send-reservation-email";
export { generateCancellationEmail } from "./generate-cancellation-email";
export { sendCancellationEmail } from "./send-cancellation-email";
export { getDraftSubject } from "./get-draft-subject";
export { getEmailDetails } from "./get-email-details";
export { telegramBot } from "./telegram-bot";

// Export only the scheduled email processor (cron job)
// Other email functions have been migrated to Next.js API routes
export { processScheduledEmails } from "./scheduled-emails";

// Export payment reminder trigger
export { onPaymentReminderEnabled } from "./payment-reminder-trigger";

// Export email utilities
export { EmailTemplateLoader } from "./email-template-loader";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
