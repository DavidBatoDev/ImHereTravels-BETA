import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MailCenter from "@/components/mail/MailCenter";

export const metadata: Metadata = {
  title: "Email Templates - ImHereTravels Admin",
  description: "Manage email templates for automated communications",
};

export default function EmailTemplatesPage() {
  return (
    <DashboardLayout>
      <MailCenter />
    </DashboardLayout>
  );
}
