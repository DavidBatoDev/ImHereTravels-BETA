"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { RefreshCw, ShieldX } from "lucide-react";
import type { UserPermissions } from "@/types/users";

interface PermissionGuardProps {
  permission: keyof UserPermissions;
  children: React.ReactNode;
}

export default function PermissionGuard({
  permission,
  children,
}: PermissionGuardProps) {
  const router = useRouter();
  const { userProfile } = useAuthStore();

  // Check if user has the required permission
  const hasPermission = userProfile?.permissions?.[permission] || false;

  // Handle refresh button click
  const handleRefresh = () => {
    window.location.reload();
  };

  // Handle go to dashboard button click
  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  // If user has permission, render children
  if (hasPermission) {
    return <>{children}</>;
  }

  // If permission denied, show access denied page
  return (
    <div className="min-h-[calc(100vh-10rem)] bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex items-center justify-center">
                <img
                  src="/logos/Logo_Red.svg"
                  alt="I'm Here Travels Logo"
                  className="w-12 h-12"
                />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Access Restricted
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              You don't have the necessary permissions to access this feature.
              Please contact your administrator to request access.
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Status Header */}
            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-8 py-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mr-4">
                  <ShieldX className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-900 dark:text-red-100">
                    Permission Required
                  </h2>
                  <p className="text-red-700 dark:text-red-300">
                    This feature requires specific administrative privileges
                  </p>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left Column - Permission Details */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Required Permission
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
                    <div className="flex items-center mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {permission
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 ml-5">
                      This permission controls access to administrative
                      functions and sensitive data.
                    </p>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    What This Means
                  </h3>
                  <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span>
                        You need administrator approval to access this feature
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span>
                        Contact your system administrator to request access
                      </span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span>
                        Your current role may not include this permission
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Right Column - Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Next Steps
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Contact Administrator
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        Reach out to your system administrator to request the
                        required permission.
                      </p>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        <strong>Email:</strong> admin@imheretravels.com
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 space-y-3">
                    <button
                      onClick={handleRefresh}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Page
                    </button>
                    <button
                      onClick={handleGoToDashboard}
                      className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Need help? Contact support at{" "}
              <a
                href="mailto:support@imheretravels.com"
                className="text-primary hover:text-primary/80 underline"
              >
                support@imheretravels.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
