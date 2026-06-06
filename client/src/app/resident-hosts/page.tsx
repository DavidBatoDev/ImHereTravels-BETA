import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ResidentHostsList from "@/components/resident-hosts/ResidentHostsList";

export const metadata: Metadata = {
  title: "Resident Hosts - ImHereTravels Admin",
  description: "Manage resident hosts and their hosted tours",
};

export default function ResidentHostsPage() {
  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageTours">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-hk-grotesk">
              Resident Hosts
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage resident hosts and their hosted tours
            </p>
          </div>
          <ResidentHostsList />
        </div>
      </PermissionGuard>
    </DashboardLayout>
  );
}
