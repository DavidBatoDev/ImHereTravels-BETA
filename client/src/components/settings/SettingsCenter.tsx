"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
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
          <h1 className="text-3xl font-bold text-foreground font-hk-grotesk">
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage system configuration and preferences
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue={canManageUsers ? "users" : "email"}
        className="space-y-6"
      >
        <TabsList className="bg-muted border border-royal-purple/20 dark:border-border">
          {canManageUsers && (
            <TabsTrigger
              value="users"
              className="flex items-center data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
            >
              <Users className="mr-2 h-4 w-4" />
              User Management
            </TabsTrigger>
          )}
          <TabsTrigger
            value="email"
            className="flex items-center data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="flex items-center data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            <Settings className="mr-2 h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {canManageUsers && (
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
        )}

        <TabsContent value="email" className="space-y-6">
          <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
            <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
              <CardTitle className="text-foreground">
                SMTP Configuration
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure email server settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost" className="text-foreground">
                    SMTP Host
                  </Label>
                  <Input
                    id="smtpHost"
                    value={emailSettings.smtpHost}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpHost: e.target.value,
                      })
                    }
                    className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort" className="text-foreground">
                    SMTP Port
                  </Label>
                  <Input
                    id="smtpPort"
                    value={emailSettings.smtpPort}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpPort: e.target.value,
                      })
                    }
                    className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpUser" className="text-foreground">
                    SMTP Username
                  </Label>
                  <Input
                    id="smtpUser"
                    value={emailSettings.smtpUser}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpUser: e.target.value,
                      })
                    }
                    className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword" className="text-foreground">
                    SMTP Password
                  </Label>
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
                    className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromName" className="text-foreground">
                    From Name
                  </Label>
                  <Input
                    id="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromName: e.target.value,
                      })
                    }
                    className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail" className="text-foreground">
                    From Email
                  </Label>
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
                    className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                  />
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200">
                Test Email Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
            <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
              <CardTitle className="text-foreground">
                Security Settings
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="twoFactor" className="text-foreground">
                    Two-Factor Authentication
                  </Label>
                  <p className="text-sm text-muted-foreground">
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
                <Label htmlFor="sessionTimeout" className="text-foreground">
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
                  className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordExpiry" className="text-foreground">
                  Password Expiry (days)
                </Label>
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
                  className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="failedAttempts" className="text-foreground">
                  Failed Login Attempts
                </Label>
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
                  className="border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
            <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
              <CardTitle className="text-foreground">API Keys</CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage API keys for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-royal-purple/20 dark:border-border rounded-lg bg-muted/30">
                  <div>
                    <h3 className="font-medium text-foreground">
                      Stripe API Key
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      sk_live_...abc123
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                  >
                    Regenerate
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-royal-purple/20 dark:border-border rounded-lg bg-muted/30">
                  <div>
                    <h3 className="font-medium text-foreground">
                      Email Service Key
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      em_...xyz789
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
            <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
              <CardTitle className="text-foreground">
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure system notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label
                    htmlFor="emailNotifications"
                    className="text-foreground"
                  >
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
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
                  <Label htmlFor="paymentReminders" className="text-foreground">
                    Payment Reminders
                  </Label>
                  <p className="text-sm text-muted-foreground">
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
                  <Label
                    htmlFor="bookingConfirmations"
                    className="text-foreground"
                  >
                    Booking Confirmations
                  </Label>
                  <p className="text-sm text-muted-foreground">
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
                  <Label htmlFor="systemAlerts" className="text-foreground">
                    System Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
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
                  <Label htmlFor="dailyReports" className="text-foreground">
                    Daily Reports
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Daily summary reports
                  </p>
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

          <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
            <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
              <CardTitle className="text-foreground">
                System Information
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                System details and status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    System Version
                  </span>
                  <span className="text-sm text-muted-foreground">v1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Database Status
                  </span>
                  <span className="text-sm text-spring-green">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Last Backup
                  </span>
                  <span className="text-sm text-muted-foreground">
                    2 hours ago
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Storage Used
                  </span>
                  <span className="text-sm text-muted-foreground">
                    2.3 GB / 10 GB
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-royal-purple/20 dark:border-border shadow hover:shadow-md transition-all duration-200">
            <CardHeader className="bg-muted/50 border-b border-royal-purple/20 dark:border-border">
              <CardTitle className="text-foreground">Data Management</CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage data backup and export
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Create Backup
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                >
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
