## Plan: Late Fees Automation + Bookings Tab

Introduce a late-fee workflow that reuses your existing payment reminder and config patterns: store policy in `config/late-fees`, run a daily Cloud Function to apply one-time 3% penalties after a 3-day grace period for overdue `P1`-`P4` terms, queue/send notices via `scheduledEmails`, and add a new `/bookings` tab showing overdue + notice history with skip/resend controls.

**Steps**
1. Phase 1 - Data contract and scope lock
2. Confirm term-level data model additions on booking docs for `p1`-`p4` late-fee state: penalty amount, applied timestamp, related scheduled email id/link, optional skipped/sent status fields, and aggregation helpers (`totalLateFees`, optional status summary). This step is foundational for all later work.
3. Define config doc contract at `config/late-fees` with immutable keys for automation: `effectiveDate`, `penaltyPercent` (3), `graceDays` (3), `enabled`, `createdAt`, `updatedAt`. Validate behavior rule: only bookings with `reservationDate >= effectiveDate` are eligible.
4. Phase 2 - Migration and schema plumbing
5. Add a migration to create `config/late-fees` with defaults and migration record support, following existing config migration style used by `041-pre-departure-config.ts`.
6. Add/extend booking column metadata for late-fee fields (IDs, labels, data types, visibility/editability) in the booking sheet column source/migration path used by current payment columns. Keep new fields non-breaking for existing forms.
7. Add/extend shared type definitions (`Booking`, optional config interface) so frontend, API routes, and functions share consistent late-fee fields.
8. Phase 3 - Backend automation (Cloud Functions)
9. Implement a new scheduled function (daily, Asia/Manila) that reads `config/late-fees`, exits when disabled/missing, queries eligible bookings, and evaluates term lateness with your existing due/paid semantics (unpaid + overdue beyond grace).
10. For each overdue term (`P1`-`P4`), apply fee once via transaction/idempotent check: if late fee already exists for that term, skip; otherwise set `pxLateFeesPenalty = pxAmount * 0.03`, increase `remainingBalance`, preserve `paid`, stamp `pxLateFeeAppliedAt`, and record audit fields.
11. Create one scheduled email record per newly penalized term in `scheduledEmails` (`emailType: late-fee-notice`) so existing scheduler/UI controls can manage skip/resend consistently. Use deterministic duplicate guards (term-level booking field + existing scheduledEmail link/id check).
12. Extend scheduled email processor behavior only where needed to support late-fee email type rendering/sending while preserving current `payment-reminder` flow.
13. Export new function(s) in `functions/src/index.ts` and ensure deployment surface is explicit.
14. Phase 4 - Email templates and rendering
15. Seed late-fee templates in `emailTemplates` via migration (name, subject, HTML/Nunjucks content, variables, metadata), following existing template migration style (`009`, `010`, `042`).
16. Add template variable mapping for late-fee notice content (traveler name, booking id, term, original amount, penalty amount, updated remaining balance, due date, days overdue).
17. Ensure duplicate-prevention behavior for notices uses both booking term markers and scheduled email state checks; keep resend manual-only through existing resend API/button pattern.
18. Phase 5 - `/bookings` late-fees tab
19. Add new tab mapping in `BookingsTabs.tsx` for URL/internal values (desktop and mobile controls, tabs content section).
20. Build `LateFeesSection` component patterned after existing list sections, with live data query/filtering for: currently overdue unpaid terms + history statuses (pending/sent/skipped/failed). Include primary columns for booking, term, amount, penalty, due date, grace state, notice status, and actions.
21. Reuse existing scheduled email service endpoints for skip/unskip/resend actions where applicable, scoped to `emailType = late-fee-notice` and booking/term context.
22. Phase 6 - API/service integration and safety
23. If needed, add focused API route(s) for late-fee tab data shaping (aggregated per booking-term row) rather than duplicating heavy client-side transforms.
24. Add telemetry/notifications for fee application and notice creation similar to payment reminder notifications, with minimal noise.
25. Add guardrails for timezone consistency (`Asia/Manila`), transaction retries, and no double-application during concurrent runs.

**Relevant files**
- `d:\Documents\GitHub\ImHereTravels-BETA\client\src\components\bookings\BookingsTabs.tsx` — Add new tab key/url mapping, trigger, and content slot for late-fees section.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\src\components\bookings\BookingsSection.tsx` — Reuse overdue determination semantics (`checkOverduePayments`) as baseline logic reference.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\src\types\bookings.ts` — Extend booking interface for term-level late-fee fields and aggregates.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\src\services\scheduled-email-service.ts` — Reuse skip/unskip/resend and list filtering by `emailType`.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\src\components\mail\ScheduledEmailsTab.tsx` — Reuse UI action/status patterns for duplicate prevention and manual resend controls.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\functions\src\payment-reminder-trigger.ts` — Reference idempotency and term-level scheduled email creation pattern.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\functions\src\scheduled-emails.ts` — Extend scheduler processing path for `late-fee-notice` email type.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\functions\src\index.ts` — Export new scheduled late-fee function(s).
- `d:\Documents\GitHub\ImHereTravels-BETA\client\migrations\041-pre-departure-config.ts` — Reference for `config/{doc}` migration pattern and rollback.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\migrations\009-initial-payment-reminder-template.ts` — Reference for template seeding shape.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\migrations\010-scheduled-reminder-email-template.ts` — Reference for reminder template format and metadata.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\migrations\042-revolut-payment-status-email-templates.ts` — Reference for newer template migration style and variable definitions.
- `d:\Documents\GitHub\ImHereTravels-BETA\client\src\app\(protected)\bookings\components\PreDeparturePackSection.tsx` — Reference runtime config read/update behavior (`config/pre-departure`).
- `d:\Documents\GitHub\ImHereTravels-BETA\client\src\app\(protected)\bookings\components\GuestInvitationsSection.tsx` — Reference config toggle behavior (`config/guest-invitation`) and status-driven actions.

**Verification**
1. Migration validation: run migrations in dry-run and live mode, then verify `config/late-fees` document and template docs exist with expected keys.
2. Scheduler idempotency test: create a booking with overdue unpaid `P1`; run checker twice; verify penalty is applied exactly once for `P1` and `remainingBalance` increments once.
3. Eligibility boundary test: confirm bookings with `reservationDate < effectiveDate` are excluded even when overdue.
4. Grace-period test: due date + 1/2 days should not apply fee; due date + 3 days (or beyond, based on exact cutoff convention chosen in implementation) should apply.
5. Paid-state test: if `pxDatePaid` exists, no fee is applied and no notice is scheduled.
6. Scheduled email lifecycle test: verify late-fee notices appear in `scheduledEmails`, support skip/unskip/resend manually, and avoid duplicate generation.
7. UI tab test: new `/bookings?tab=late-fees` renders in desktop/mobile tab controls, lists overdue + history statuses, and action buttons mutate status correctly.
8. End-to-end email test: confirm template rendering variables resolve correctly and sent mail link is persisted for traceability.

**Decisions**
- Apply late fee once per overdue term, not recurring.
- Use 3-day grace period before applying penalty.
- Scope to installment terms `P1`-`P4` (exclude full payment for now).
- Late-fees tab includes both active overdue items and notification history states.
- Resend remains manual-only from UI controls (no auto-repeat cadence).
- Store and manage templates in `emailTemplates` collection.

**Further Considerations**
1. Migration numbering in this repo has duplicates (`042`, `043`), so select a unique new file name/ID carefully (e.g., date-suffixed or next free semantic name) to avoid accidental skips/conflicts.
2. Decide strict grace cutoff convention during implementation: apply at exact `dueDate + 3 days` midnight Manila vs next scheduler run after threshold; document this to avoid support ambiguity.
3. Consider adding a lightweight audit collection for applied late fees (bookingId, term, amount, appliedAt, batchRunId) to simplify reconciliations and rollback support.
