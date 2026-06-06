"use client";

import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PermissionGuard from "@/components/auth/PermissionGuard";
import ResidentHostForm from "@/components/resident-hosts/ResidentHostForm";
import { createResidentHost } from "@/services/resident-hosts-service";
import { ResidentHostFormData } from "@/types/resident-hosts";

export default function NewResidentHostPage() {
  const router = useRouter();

  const handleSubmit = async (data: ResidentHostFormData): Promise<string> => {
    return await createResidentHost(data);
  };

  return (
    <DashboardLayout fullWidth>
      <PermissionGuard permission="canManageTours">
        <ResidentHostForm
          onClose={() => router.push("/resident-hosts")}
          onSubmit={handleSubmit}
        />
      </PermissionGuard>
    </DashboardLayout>
  );
}
