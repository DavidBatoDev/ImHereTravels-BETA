import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SettingsCenter from "@/components/settings/SettingsCenter";

export const metadata: Metadata = {
  title: "Settings - ImHereTravels Admin",
  description: "Manage system settings and configuration",
};

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <SettingsCenter />
    </DashboardLayout>
  );
}
