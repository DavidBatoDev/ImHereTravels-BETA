import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BookingsList from "@/components/bookings/BookingsList";

export const metadata: Metadata = {
  title: "Bookings - ImHereTravels Admin",
  description: "Manage bookings and reservations",
};

export default function BookingsPage() {
  return (
    <DashboardLayout>
      <BookingsList />
    </DashboardLayout>
  );
}
