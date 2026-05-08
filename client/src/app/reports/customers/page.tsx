import { Metadata } from "next";
import { Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CustomerListReport from "@/components/reports/CustomerListReport";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Customer Guest List - ImHereTravels Admin",
  description: "Guest demographics, nationality, and age breakdown report",
};

export default function CustomersReportPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <CustomerListReport />
      </Suspense>
    </DashboardLayout>
  );
}
