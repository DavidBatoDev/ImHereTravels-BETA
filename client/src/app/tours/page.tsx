import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ToursTabs from "@/components/tours/ToursTabs";

export const metadata: Metadata = {
  title: "Tour Packages - ImHereTravels Admin",
  description: "Manage tour packages and itineraries",
};

export default function ToursPage() {
  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageTours">
        <ToursTabs />
      </PermissionGuard>
    </DashboardLayout>
  );
}
