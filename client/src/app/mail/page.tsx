import { redirect } from "next/navigation";

export default function MailPage() {
  // Server-side redirect to /mail/payment-reminders (default tab: Payment Reminders)
  redirect("/mail/payment-reminders");
}
