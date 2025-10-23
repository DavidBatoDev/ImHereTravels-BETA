import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StorageTabs from "@/components/storage/StorageTabs";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const metadata: Metadata = {
  title: "Storage - ImHereTravels Admin",
  description: "Manage file storage and image collections",
};

export default function StoragePage() {
  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageStorage">
        <StorageTabs />
      </PermissionGuard>
    </DashboardLayout>
  );
}
