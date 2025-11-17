import { redirect } from "next/navigation";

export default function MailPage() {
  // Server-side redirect to /mail/u/0 (default tab: Emails)
  redirect("/mail/u/0");
}
