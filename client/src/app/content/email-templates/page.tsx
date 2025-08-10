import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export const metadata: Metadata = {
  title: "Email Templates - ImHereTravels Admin",
  description: "Manage email templates for customer communications",
};

export default function EmailTemplatesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-600">
            Manage email templates for automated and manual communications
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Template Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: "Reservation",
                description: "Initial reservation confirmation emails",
                count: 3,
              },
              {
                name: "Payment Reminders",
                description: "P1, P2, P3, P4 payment reminder templates",
                count: 4,
              },
              {
                name: "Cancellation",
                description: "Booking cancellation notifications",
                count: 2,
              },
              {
                name: "Booking Confirmation",
                description: "Final booking confirmation templates",
                count: 2,
              },
            ].map((category) => (
              <div
                key={category.name}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {category.name}
                  </h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {category.count} templates
                  </span>
                </div>
                <p className="text-sm text-gray-600">{category.description}</p>
                <button className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Manage Templates →
                </button>
              </div>
            ))}
          </div>
          {/* TODO: Add email template management interface */}
        </div>
      </div>
    </DashboardLayout>
  );
}
