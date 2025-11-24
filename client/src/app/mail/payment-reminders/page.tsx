import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MailCenter from "@/components/mail/MailCenter";

export const metadata: Metadata = {
  title: "Payment Reminders - ImHereTravels Admin",
  description: "Manage scheduled payment reminder emails",
};

export default function PaymentRemindersPage() {
  return (
    <DashboardLayout>
      <MailCenter />
    </DashboardLayout>
  );
}
