import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ReportsCenter from "@/components/reports/ReportsCenter";

export const metadata: Metadata = {
  title: "Reports & Analytics - ImHereTravels Admin",
  description: "View reports and analytics for your business",
};

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <ReportsCenter />
    </DashboardLayout>
  );
}
