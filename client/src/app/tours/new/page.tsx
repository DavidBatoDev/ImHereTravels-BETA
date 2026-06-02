"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PermissionGuard from "@/components/auth/PermissionGuard";
import TourForm from "@/components/tours/TourForm";
import { createTour } from "@/services/tours-service";
import { TourFormDataWithStringDates } from "@/types/tours";

export default function NewTourPage() {
  const router = useRouter();

  const handleSubmit = async (
    data: TourFormDataWithStringDates,
  ): Promise<string> => {
    return await createTour(data);
  };

  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageTours">
        <TourForm
          onClose={() => router.push("/tours")}
          onSubmit={handleSubmit}
        />
      </PermissionGuard>
    </DashboardLayout>
  );
}
