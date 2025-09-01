"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Edit, Trash2, UserPlus, Power } from "lucide-react";
import { BBCUser } from "@/types/bbc-users";
import {
  getAllBBCUsers,
  createBBCUser,
  updateBBCUser,
  deleteBBCUser,
  searchBBCUsers,
} from "@/services/bbc-users-service";
import { toast } from "@/hooks/use-toast";

export default function BBCUsersManagement() {
  const [users, setUsers] = useState<BBCUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<BBCUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users from Firebase on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const fetchedUsers = await getAllBBCUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Failed to fetch BBC users",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.bbcId.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleCreateUser = async (userData: Partial<BBCUser>) => {
    try {
      setIsLoading(true);

      const newUser = await createBBCUser({
        email: userData.email || "",
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
      });

      setUsers([newUser, ...users]);
      setIsCreateDialogOpen(false);

      toast({
        title: "Success",
        description: "BBC user created successfully",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: "Failed to create BBC user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async (userData: Partial<BBCUser>) => {
    if (editingUser) {
      try {
        setIsLoading(true);

        const updatedUser = await updateBBCUser(editingUser.id, {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });

        if (updatedUser) {
          setUsers(
            users.map((user) =>
              user.id === editingUser.id ? updatedUser : user
            )
          );
          setIsEditDialogOpen(false);
          setEditingUser(null);

          toast({
            title: "Success",
            description: "BBC user updated successfully",
          });
        }
      } catch (error) {
        console.error("Error updating user:", error);
        toast({
          title: "Error",
          description: "Failed to update BBC user",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setIsLoading(true);

      const success = await deleteBBCUser(userId);

      if (success) {
        setUsers(users.filter((user) => user.id !== userId));
        toast({
          title: "Success",
          description: "BBC user deleted successfully",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete BBC user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      setIsLoading(true);

      const updatedUser = await updateBBCUser(userId, {
        isActive: !currentStatus,
      });

      if (updatedUser) {
        setUsers(
          users.map((user) => (user.id === userId ? updatedUser : user))
        );

        toast({
          title: "Success",
          description: `User ${
            !currentStatus ? "activated" : "deactivated"
          } successfully`,
        });
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-creative-midnight font-hk-grotesk">
            Manage BCC Users
          </h1>
          <p className="text-grey text-lg">
            Manage BCC users, their roles, and access permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add BCC User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] border border-royal-purple/20">
            <DialogHeader>
              <DialogTitle className="text-creative-midnight">
                Add New BCC User
              </DialogTitle>
              <DialogDescription className="text-grey">
                Create a new BCC user account with appropriate permissions
              </DialogDescription>
            </DialogHeader>
            <CreateUserForm onSubmit={handleCreateUser} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
        <CardHeader className="bg-light-grey/50 border-b border-royal-purple/20">
          <CardTitle className="text-creative-midnight">
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-creative-midnight">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-royal-purple/60" />
                <Input
                  id="search"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-creative-midnight">Results</Label>
              <div className="text-sm text-grey pt-2">
                {filteredUsers.length} of {users.length} users
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border border-royal-purple/20 shadow hover:shadow-md transition-all duration-200">
        <CardHeader className="bg-light-grey/50 border-b border-royal-purple/20">
          <CardTitle className="text-creative-midnight">BCC Users</CardTitle>
          <CardDescription className="text-grey">
            Manage BCC user accounts and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="border-royal-purple/20">
                <TableHead className="text-creative-midnight">User</TableHead>
                <TableHead className="text-creative-midnight">BCC ID</TableHead>
                <TableHead className="text-creative-midnight">Status</TableHead>
                <TableHead className="text-creative-midnight">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="text-grey">Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="text-grey">
                      {searchTerm
                        ? "No users found matching your search."
                        : "No BCC users found."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-b border-royal-purple/20 transition-colors duration-200 hover:bg-royal-purple/5"
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={undefined} />
                          <AvatarFallback className="bg-royal-purple/20 text-royal-purple">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-creative-midnight">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-grey">{user.email}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge
                              variant={user.isActive ? "default" : "secondary"}
                              className={
                                user.isActive
                                  ? "bg-spring-green/20 text-spring-green border border-spring-green/30"
                                  : "bg-grey/20 text-grey border border-grey/30"
                              }
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-royal-purple/30 text-royal-purple"
                      >
                        {user.bbcId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Power
                          className={`h-4 w-4 ${
                            user.isActive ? "text-spring-green" : "text-grey"
                          }`}
                        />
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={() =>
                            handleToggleActive(user.id, user.isActive)
                          }
                          disabled={isLoading}
                        />
                        <span className="text-sm text-grey ml-2">
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => {
                            setEditingUser(user);
                            setIsEditDialogOpen(true);
                          }}
                          className="text-royal-purple hover:text-royal-purple hover:bg-royal-purple/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-crimson-red hover:text-crimson-red hover:bg-crimson-red/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] border border-royal-purple/20">
          <DialogHeader>
            <DialogTitle className="text-creative-midnight">
              Edit BCC User
            </DialogTitle>
            <DialogDescription className="text-grey">
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <EditUserForm
              user={editingUser}
              onSubmit={handleEditUser}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create User Form Component
function CreateUserForm({
  onSubmit,
}: {
  onSubmit: (data: Partial<BBCUser>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });
      // Reset form on success
      setFormData({ firstName: "", lastName: "", email: "" });
    } catch (error) {
      console.error("Error creating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-creative-midnight">
            First Name
          </Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            required
            className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-creative-midnight">
            Last Name
          </Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            required
            className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-creative-midnight">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
        />
      </div>

      <DialogFooter>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
        >
          {isSubmitting ? "Creating..." : "Create User"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Edit User Form Component
function EditUserForm({
  user,
  onSubmit,
  onCancel,
}: {
  user: BBCUser;
  onSubmit: (data: Partial<BBCUser>) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="editFirstName" className="text-creative-midnight">
            First Name
          </Label>
          <Input
            id="editFirstName"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            required
            className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="editLastName" className="text-creative-midnight">
            Last Name
          </Label>
          <Input
            id="editLastName"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            required
            className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="editEmail" className="text-creative-midnight">
          Email
        </Label>
        <Input
          id="editEmail"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
        >
          {isSubmitting ? "Updating..." : "Update User"}
        </Button>
      </DialogFooter>
    </form>
  );
}
