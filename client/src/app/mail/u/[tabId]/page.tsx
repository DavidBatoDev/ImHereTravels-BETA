import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MailCenter from "@/components/mail/MailCenter";

export const metadata: Metadata = {
  title: "Mail - ImHereTravels Admin",
  description: "Manage email templates and mail communications",
};

export default function MailPage() {
  return (
    <DashboardLayout>
      <MailCenter />
    </DashboardLayout>
  );
}
