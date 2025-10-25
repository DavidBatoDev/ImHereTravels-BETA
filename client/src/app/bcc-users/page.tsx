import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BCCUsersManagement from "@/components/bcc-users/BCCUsersManagement";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const metadata: Metadata = {
  title: "Manage BCC Users - ImHereTravels Admin",
  description:
    "Manage BCC users and their permissions in ImHereTravels admin system",
};

export default function BCCUsersPage() {
  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageBcc">
        <BCCUsersManagement />
      </PermissionGuard>
    </DashboardLayout>
  );
}
