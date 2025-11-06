import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FunctionsCenter from "@/components/functions/FunctionsCenter";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const metadata: Metadata = {
  title: "Functions - ImHereTravels Admin",
  description: "Manage and execute system functions",
};

export default function FunctionsPage() {
  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageFunctions">
        <FunctionsCenter />
      </PermissionGuard>
    </DashboardLayout>
  );
}
