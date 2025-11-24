import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MailCenter from "@/components/mail/MailCenter";

export const metadata: Metadata = {
  title: "Test Email Templates - ImHereTravels Admin",
  description: "Test and preview email templates",
};

export default function EmailTemplatesTestPage() {
  return (
    <DashboardLayout>
      <MailCenter />
    </DashboardLayout>
  );
}
