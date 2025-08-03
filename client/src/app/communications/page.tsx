import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CommunicationsCenter from "@/components/communications/CommunicationsCenter";

export const metadata: Metadata = {
  title: "Communications - ImHereTravels Admin",
  description: "Manage email templates and communications",
};

export default function CommunicationsPage() {
  return (
    <DashboardLayout>
      <CommunicationsCenter />
    </DashboardLayout>
  );
}
