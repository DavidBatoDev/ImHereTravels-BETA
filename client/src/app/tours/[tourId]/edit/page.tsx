"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PermissionGuard from "@/components/auth/PermissionGuard";
import TourForm from "@/components/tours/TourForm";
import { getTourById, updateTour } from "@/services/tours-service";
import { TourPackage, TourFormDataWithStringDates } from "@/types/tours";

export default function EditTourPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tourId = params?.tourId as string;

  const [tour, setTour] = useState<TourPackage | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!tourId) return;
    getTourById(tourId)
      .then((data) => setTour(data))
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load tour data.",
          variant: "destructive",
        });
      })
      .finally(() => setIsFetching(false));
  }, [tourId]);

  const handleSubmit = async (
    data: TourFormDataWithStringDates,
  ): Promise<void> => {
    await updateTour(tourId, data);
  };

  return (
    <DashboardLayout>
      <PermissionGuard permission="canManageTours">
        <TourForm
          onClose={() => router.push("/tours")}
          onSubmit={handleSubmit}
          tour={tour}
          isLoading={isFetching}
        />
      </PermissionGuard>
    </DashboardLayout>
  );
}
