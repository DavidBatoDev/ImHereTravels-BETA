"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ResidentHostForm from "@/components/resident-hosts/ResidentHostForm";
import {
  getResidentHostById,
  updateResidentHost,
} from "@/services/resident-hosts-service";
import { ResidentHost, ResidentHostFormData } from "@/types/resident-hosts";

export default function EditResidentHostPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const hostId = params?.hostId as string;

  const [host, setHost] = useState<ResidentHost | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!hostId) return;
    getResidentHostById(hostId)
      .then((data) => setHost(data))
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load resident host data.",
          variant: "destructive",
        });
      })
      .finally(() => setIsFetching(false));
  }, [hostId]);

  const handleSubmit = async (data: ResidentHostFormData): Promise<void> => {
    await updateResidentHost(hostId, data);
  };

  return (
    <DashboardLayout fullWidth>
      <PermissionGuard permission="canManageTours">
        <ResidentHostForm
          onClose={() => router.push("/resident-hosts")}
          onSubmit={handleSubmit}
          host={host}
          isLoading={isFetching}
        />
      </PermissionGuard>
    </DashboardLayout>
  );
}
