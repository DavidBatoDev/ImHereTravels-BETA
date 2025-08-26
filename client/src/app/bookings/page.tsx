import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BookingsTabs from "@/components/bookings/BookingsTabs";

export const metadata: Metadata = {
  title: "Bookings - ImHereTravels Admin",
  description: "Manage bookings and reservations",
};

export default function BookingsPage() {
  return (
    <DashboardLayout>
      <BookingsTabs />
    </DashboardLayout>
  );
}
