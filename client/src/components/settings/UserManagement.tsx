"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/lib/auth-store";
import type { User as UserType } from "@/types/users";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  CreditCard,
  Search,
  RefreshCw,
  Save,
  MapPin,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserWithId extends UserType {
  id: string;
}

export default function UserManagement() {
  const { userProfile } = useAuthStore();
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterApproval, setFilterApproval] = useState<string>("all");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Check if current user has permission to manage users
  const canManageUsers = userProfile?.permissions?.canManageUsers;

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);

      const usersData: UserWithId[] = [];
      querySnapshot.forEach((doc) => {
        const userData = {
          id: doc.id,
          ...doc.data(),
        } as UserWithId;

        // Exclude the current user from the list
        if (
          userData.id !== userProfile?.id &&
          userData.hasAgreedToTerms !== false
        ) {
          usersData.push(userData);
        }
      });

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<UserType>) => {
    try {
      setUpdatingUser(userId);
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        ...updates,
        metadata: {
          updatedAt: new Date() as any,
        },
      });

      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, ...updates } : user
        )
      );

      toast({
        title: "Success",
        description: "User updated successfully",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const toggleUserApproval = async (userId: string, isApproved: boolean) => {
    await updateUser(userId, { isApproved });
  };

  const togglePermission = async (
    userId: string,
    permission: keyof UserType["permissions"],
    value: boolean
  ) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const updatedPermissions = {
      ...user.permissions,
      [permission]: value,
    };

    await updateUser(userId, { permissions: updatedPermissions });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.profile?.firstName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.profile?.lastName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesApproval =
      filterApproval === "all" ||
      (filterApproval === "approved" && user.isApproved) ||
      (filterApproval === "pending" && !user.isApproved);

    return matchesSearch && matchesRole && matchesApproval;
  });

  if (!canManageUsers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to manage users.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            User Management
          </h2>
          <p className="text-gray-600">
            Manage user accounts, permissions, and approval status
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-filter">Approval Status</Label>
              <Select value={filterApproval} onValueChange={setFilterApproval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Badge variant="secondary" className="text-sm">
                {filteredUsers.length} users
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user permissions and approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading users...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profile?.avatar} />
                            <AvatarFallback>
                              {user.profile?.firstName?.[0]}
                              {user.profile?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.profile?.firstName} {user.profile?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" ? "destructive" : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.isApproved}
                            onCheckedChange={(checked) =>
                              toggleUserApproval(user.id, checked)
                            }
                            disabled={updatingUser === user.id}
                          />
                          <Label className="text-sm">
                            {user.isApproved ? "Approved" : "Pending"}
                          </Label>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-3">
                          {!user.isApproved && (
                            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                              <p className="text-xs text-amber-700 font-medium">
                                User not approved - All permissions disabled
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {/* Bookings Permission */}
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <Label className="text-xs font-medium">
                                  Bookings
                                </Label>
                              </div>
                              <Switch
                                checked={
                                  user.isApproved
                                    ? user.permissions.canManageBookings
                                    : false
                                }
                                onCheckedChange={(checked) =>
                                  togglePermission(
                                    user.id,
                                    "canManageBookings",
                                    checked
                                  )
                                }
                                disabled={
                                  !user.isApproved || updatingUser === user.id
                                }
                              />
                            </div>

                            {/* Tours Permission */}
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                <Label className="text-xs font-medium">
                                  Tours
                                </Label>
                              </div>
                              <Switch
                                checked={
                                  user.isApproved
                                    ? user.permissions.canManageTours
                                    : false
                                }
                                onCheckedChange={(checked) =>
                                  togglePermission(
                                    user.id,
                                    "canManageTours",
                                    checked
                                  )
                                }
                                disabled={
                                  !user.isApproved || updatingUser === user.id
                                }
                              />
                            </div>

                            {/* Communications Permission */}
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <MessageSquare className="h-4 w-4 text-gray-500" />
                                <Label className="text-xs font-medium">
                                  Communications
                                </Label>
                              </div>
                              <Switch
                                checked={
                                  user.isApproved
                                    ? user.permissions.canManageTemplates
                                    : false
                                }
                                onCheckedChange={(checked) =>
                                  togglePermission(
                                    user.id,
                                    "canManageTemplates",
                                    checked
                                  )
                                }
                                disabled={
                                  !user.isApproved || updatingUser === user.id
                                }
                              />
                            </div>

                            {/* Reports Permission */}
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <BarChart3 className="h-4 w-4 text-gray-500" />
                                <Label className="text-xs font-medium">
                                  Reports
                                </Label>
                              </div>
                              <Switch
                                checked={
                                  user.isApproved
                                    ? user.permissions.canAccessReports
                                    : false
                                }
                                onCheckedChange={(checked) =>
                                  togglePermission(
                                    user.id,
                                    "canAccessReports",
                                    checked
                                  )
                                }
                                disabled={
                                  !user.isApproved || updatingUser === user.id
                                }
                              />
                            </div>

                            {/* Financials Permission */}
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <CreditCard className="h-4 w-4 text-gray-500" />
                                <Label className="text-xs font-medium">
                                  Financials
                                </Label>
                              </div>
                              <Switch
                                checked={
                                  user.isApproved
                                    ? user.permissions.canEditFinancials
                                    : false
                                }
                                onCheckedChange={(checked) =>
                                  togglePermission(
                                    user.id,
                                    "canEditFinancials",
                                    checked
                                  )
                                }
                                disabled={
                                  !user.isApproved || updatingUser === user.id
                                }
                              />
                            </div>

                            {/* User Management Permission */}
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <Label className="text-xs font-medium">
                                  User Management
                                </Label>
                              </div>
                              <Switch
                                checked={
                                  user.isApproved
                                    ? user.permissions.canManageUsers
                                    : false
                                }
                                onCheckedChange={(checked) =>
                                  togglePermission(
                                    user.id,
                                    "canManageUsers",
                                    checked
                                  )
                                }
                                disabled={
                                  !user.isApproved || updatingUser === user.id
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
