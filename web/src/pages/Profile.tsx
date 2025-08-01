import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserMenu } from "@/components/auth/UserMenu";
import { User, Mail, Phone, Calendar, MapPin, Shield, Bell, Globe } from "lucide-react";
import { toast } from "sonner";
import { UpdateUserData } from "@/types/user";

export default function Profile() {
  const { user, userProfile, updateUserProfileData, loading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateUserData>({});

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        phoneNumber: userProfile.phoneNumber || "",
        dateOfBirth: userProfile.dateOfBirth || "",
        nationality: userProfile.nationality || "",
        passportNumber: userProfile.passportNumber || "",
        emergencyContact: userProfile.emergencyContact || {
          name: "",
          phone: "",
          relationship: "",
        },
        preferences: userProfile.preferences || {
          currency: "USD",
          language: "en",
          dietaryRestrictions: [],
          travelStyle: [],
          newsletter: true,
          smsNotifications: false,
        },
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    try {
      await updateUserProfileData(formData);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || "",
        phoneNumber: userProfile.phoneNumber || "",
        dateOfBirth: userProfile.dateOfBirth || "",
        nationality: userProfile.nationality || "",
        passportNumber: userProfile.passportNumber || "",
        emergencyContact: userProfile.emergencyContact || {
          name: "",
          phone: "",
          relationship: "",
        },
        preferences: userProfile.preferences || {
          currency: "USD",
          language: "en",
          dietaryRestrictions: [],
          travelStyle: [],
          newsletter: true,
          smsNotifications: false,
        },
      });
    }
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Profile Settings
              </h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={user.photoURL || undefined}
                  alt={userProfile.displayName || "User"}
                />
                <AvatarFallback className="text-lg">
                  {userProfile.displayName ? (
                    getInitials(userProfile.displayName)
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">
                    {userProfile.displayName || "User"}
                  </h2>
                  <Badge variant={userProfile.role === "admin" ? "default" : "secondary"}>
                    {userProfile.role}
                  </Badge>
                  <Badge variant={userProfile.isActive ? "default" : "destructive"}>
                    {userProfile.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Mail className="h-4 w-4 mr-2" />
                  {userProfile.email}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Member since {userProfile.createdAt.toLocaleDateString()}
                </div>
              </div>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "default"}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  disabled={!isEditing || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  disabled={!isEditing || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                  disabled={!isEditing || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, nationality: e.target.value })
                  }
                  disabled={!isEditing || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passportNumber">Passport Number</Label>
                <Input
                  id="passportNumber"
                  value={formData.passportNumber || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, passportNumber: e.target.value })
                  }
                  disabled={!isEditing || loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Emergency Contact
              </CardTitle>
              <CardDescription>
                Contact information for emergencies during travel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Contact Name</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyContact?.name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact!,
                        name: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditing || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyContact?.phone || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact!,
                        phone: e.target.value,
                      },
                    })
                  }
                  disabled={!isEditing || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Select
                  value={formData.emergencyContact?.relationship || ""}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      emergencyContact: {
                        ...formData.emergencyContact!,
                        relationship: value,
                      },
                    })
                  }
                  disabled={!isEditing || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Preferences & Settings
              </CardTitle>
              <CardDescription>
                Customize your travel preferences and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Preferred Currency</Label>
                  <Select
                    value={formData.preferences?.currency || "USD"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences!,
                          currency: value,
                        },
                      })
                    }
                    disabled={!isEditing || loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.preferences?.language || "en"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences!,
                          language: value,
                        },
                      })
                    }
                    disabled={!isEditing || loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="newsletter">Email Newsletter</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive travel tips and special offers
                      </p>
                    </div>
                    <Switch
                      id="newsletter"
                      checked={formData.preferences?.newsletter || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences!,
                            newsletter: checked,
                          },
                        })
                      }
                      disabled={!isEditing || loading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="smsNotifications">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive booking updates via SMS
                      </p>
                    </div>
                    <Switch
                      id="smsNotifications"
                      checked={formData.preferences?.smsNotifications || false}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences!,
                            smsNotifications: checked,
                          },
                        })
                      }
                      disabled={!isEditing || loading}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex justify-end space-x-4 mt-8">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}