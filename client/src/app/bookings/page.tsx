import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BookingsTabs from "@/components/bookings/BookingsTabs";
import PermissionGuard from "@/components/auth/PermissionGuard";

export const metadata: Metadata = {
  title: "Bookings - ImHereTravels Admin",
  description: "Manage bookings and reservations",
};

export default function BookingsPage() {
  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageBookings">
        <BookingsTabs />
      </PermissionGuard>
    </DashboardLayout>
  );
}
