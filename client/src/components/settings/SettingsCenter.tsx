"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  CreditCard,
  Users,
  Shield,
  Database,
  Mail,
  Key,
  Bell,
  Save,
  RefreshCw,
} from "lucide-react";
import UserManagement from "./UserManagement";

export default function SettingsCenter() {
  const { userProfile } = useAuthStore();
  const canManageUsers = userProfile?.permissions?.canManageUsers;

  const [paymentTerms, setPaymentTerms] = useState({
    p1: 1,
    p2: 2,
    p3: 3,
    p4: 4,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpUser: "admin@imheretravels.com",
    smtpPassword: "********",
    fromName: "ImHereTravels",
    fromEmail: "admin@imheretravels.com",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    paymentReminders: true,
    bookingConfirmations: true,
    systemAlerts: true,
    dailyReports: false,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    sessionTimeout: 15,
    passwordExpiry: 90,
    failedLoginAttempts: 5,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">
            Manage system configuration and preferences
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="payment" className="space-y-6">
        <TabsList>
          <TabsTrigger value="payment" className="flex items-center">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment Configuration
          </TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="users" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              User Management
            </TabsTrigger>
          )}
          <TabsTrigger value="email" className="flex items-center">
            <Mail className="mr-2 h-4 w-4" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Terms Configuration</CardTitle>
              <CardDescription>
                Configure payment terms for different booking scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p1">P1 Payment Term (months)</Label>
                  <Input
                    id="p1"
                    type="number"
                    value={paymentTerms.p1}
                    onChange={(e) =>
                      setPaymentTerms({
                        ...paymentTerms,
                        p1: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p2">P2 Payment Term (months)</Label>
                  <Input
                    id="p2"
                    type="number"
                    value={paymentTerms.p2}
                    onChange={(e) =>
                      setPaymentTerms({
                        ...paymentTerms,
                        p2: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p3">P3 Payment Term (months)</Label>
                  <Input
                    id="p3"
                    type="number"
                    value={paymentTerms.p3}
                    onChange={(e) =>
                      setPaymentTerms({
                        ...paymentTerms,
                        p3: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p4">P4 Payment Term (months)</Label>
                  <Input
                    id="p4"
                    type="number"
                    value={paymentTerms.p4}
                    onChange={(e) =>
                      setPaymentTerms({
                        ...paymentTerms,
                        p4: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Integration</CardTitle>
              <CardDescription>
                Configure payment gateway settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Gateway</Label>
                <Select defaultValue="stripe">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="revolut">Revolut</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" placeholder="Enter API key" />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input placeholder="https://your-domain.com/webhook" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
        )}

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Configure email server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={emailSettings.smtpHost}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpHost: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={emailSettings.smtpPort}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpPort: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    value={emailSettings.smtpUser}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpUser: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromEmail: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button>Test Email Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">
                    Require 2FA for all admin accounts
                  </p>
                </div>
                <Switch
                  id="twoFactor"
                  checked={securitySettings.twoFactorAuth}
                  onCheckedChange={(checked: boolean) =>
                    setSecuritySettings({
                      ...securitySettings,
                      twoFactorAuth: checked,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">
                  Session Timeout (minutes)
                </Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      sessionTimeout: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                <Input
                  id="passwordExpiry"
                  type="number"
                  value={securitySettings.passwordExpiry}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      passwordExpiry: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="failedAttempts">Failed Login Attempts</Label>
                <Input
                  id="failedAttempts"
                  type="number"
                  value={securitySettings.failedLoginAttempts}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      failedLoginAttempts: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Stripe API Key</h3>
                    <p className="text-sm text-gray-500">sk_live_...abc123</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Regenerate
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Email Service Key</h3>
                    <p className="text-sm text-gray-500">em_...xyz789</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure system notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-500">
                    Receive email notifications
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked: boolean) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      emailNotifications: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="paymentReminders">Payment Reminders</Label>
                  <p className="text-sm text-gray-500">
                    Automated payment reminders
                  </p>
                </div>
                <Switch
                  id="paymentReminders"
                  checked={notificationSettings.paymentReminders}
                  onCheckedChange={(checked: boolean) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      paymentReminders: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="bookingConfirmations">
                    Booking Confirmations
                  </Label>
                  <p className="text-sm text-gray-500">
                    Automatic booking confirmations
                  </p>
                </div>
                <Switch
                  id="bookingConfirmations"
                  checked={notificationSettings.bookingConfirmations}
                  onCheckedChange={(checked: boolean) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      bookingConfirmations: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="systemAlerts">System Alerts</Label>
                  <p className="text-sm text-gray-500">
                    Critical system notifications
                  </p>
                </div>
                <Switch
                  id="systemAlerts"
                  checked={notificationSettings.systemAlerts}
                  onCheckedChange={(checked: boolean) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      systemAlerts: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dailyReports">Daily Reports</Label>
                  <p className="text-sm text-gray-500">Daily summary reports</p>
                </div>
                <Switch
                  id="dailyReports"
                  checked={notificationSettings.dailyReports}
                  onCheckedChange={(checked: boolean) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      dailyReports: checked,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>System details and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">System Version</span>
                  <span className="text-sm text-gray-500">v1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database Status</span>
                  <span className="text-sm text-green-500">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Backup</span>
                  <span className="text-sm text-gray-500">2 hours ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Storage Used</span>
                  <span className="text-sm text-gray-500">2.3 GB / 10 GB</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Manage data backup and export</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline" className="w-full">
                  <Database className="mr-2 h-4 w-4" />
                  Create Backup
                </Button>
                <Button variant="outline" className="w-full">
                  <Key className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
                <Button variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restore from Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
