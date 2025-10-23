import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ToursList from "@/components/tours/ToursList";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const metadata: Metadata = {
  title: "Tour Packages - ImHereTravels Admin",
  description: "Manage tour packages and itineraries",
};

export default function ToursPage() {
  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageTours">
        <ToursList />
      </PermissionGuard>
    </DashboardLayout>
  );
}
