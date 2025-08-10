import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export const metadata: Metadata = {
  title: "Adventure Kit - ImHereTravels Admin",
  description: "Manage adventure kit templates and generation",
};

export default function AdventureKitPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adventure Kit</h1>
          <p className="text-gray-600">
            Manage adventure kit templates and automated generation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Template Management</h2>
            <p className="text-gray-500 mb-4">
              Create and manage adventure kit templates with tour-specific
              information, packing lists, and travel tips.
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded">
                <span className="font-medium">Ecuador Adventure Kit</span>
                <span className="text-sm text-gray-500">
                  Last updated: 2 days ago
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded">
                <span className="font-medium">Galapagos Adventure Kit</span>
                <span className="text-sm text-gray-500">
                  Last updated: 1 week ago
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded">
                <span className="font-medium">Amazon Adventure Kit</span>
                <span className="text-sm text-gray-500">
                  Last updated: 3 days ago
                </span>
              </div>
            </div>
            {/* TODO: Add template management interface */}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Generation Queue</h2>
            <p className="text-gray-500 mb-4">
              Monitor adventure kit generation status and delivery queue.
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <span className="font-medium block">
                    John Doe - Ecuador Tour
                  </span>
                  <span className="text-sm text-gray-500">
                    Booking: TR-EC-20250810-JD-01
                  </span>
                </div>
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Sent
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <span className="font-medium block">
                    Jane Smith - Galapagos Tour
                  </span>
                  <span className="text-sm text-gray-500">
                    Booking: TR-GA-20250815-JS-01
                  </span>
                </div>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  Pending
                </span>
              </div>
            </div>
            {/* TODO: Add generation queue interface */}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
