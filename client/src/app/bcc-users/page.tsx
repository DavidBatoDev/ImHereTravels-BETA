import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BBCUsersManagement from "@/components/bbc-users/BBCUsersManagement";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const metadata: Metadata = {
  title: "Manage BBC Users - ImHereTravels Admin",
  description:
    "Manage BBC users and their permissions in ImHereTravels admin system",
};

export default function BBCUsersPage() {
  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageBcc">
        <BBCUsersManagement />
      </PermissionGuard>
    </DashboardLayout>
  );
}
