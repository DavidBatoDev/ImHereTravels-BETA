"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Send,
  Mail,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

// Mock data - replace with real data from your backend
const mockTemplates = [
  {
    id: "T001",
    name: "Reservation Confirmation",
    type: "Confirmation",
    subject: "Your ImHereTravels booking is confirmed!",
    lastModified: "2024-01-15",
    usageCount: 45,
    status: "Active",
  },
  {
    id: "T002",
    name: "Payment Reminder",
    type: "Reminder",
    subject: "Payment due for your upcoming tour",
    lastModified: "2024-01-10",
    usageCount: 23,
    status: "Active",
  },
  {
    id: "T003",
    name: "Cancellation Notice",
    type: "Cancellation",
    subject: "Your booking has been cancelled",
    lastModified: "2024-01-05",
    usageCount: 8,
    status: "Active",
  },
  {
    id: "T004",
    name: "Adventure Kit",
    type: "Information",
    subject: "Your adventure kit is ready!",
    lastModified: "2024-01-12",
    usageCount: 12,
    status: "Active",
  },
];

const mockEmailHistory = [
  {
    id: "E001",
    recipient: "john@example.com",
    subject: "Your ImHereTravels booking is confirmed!",
    type: "Confirmation",
    sentAt: "2024-01-20T10:30:00Z",
    status: "Delivered",
    bookingId: "BK001",
  },
  {
    id: "E002",
    recipient: "sarah@example.com",
    subject: "Payment due for your upcoming tour",
    type: "Reminder",
    sentAt: "2024-01-20T09:15:00Z",
    status: "Delivered",
    bookingId: "BK002",
  },
  {
    id: "E003",
    recipient: "mike@example.com",
    subject: "Your adventure kit is ready!",
    type: "Information",
    sentAt: "2024-01-19T14:45:00Z",
    status: "Failed",
    bookingId: "BK003",
  },
];

const templateTypes = [
  "All",
  "Confirmation",
  "Reminder",
  "Cancellation",
  "Information",
];
const emailTypes = [
  "All",
  "Confirmation",
  "Reminder",
  "Cancellation",
  "Information",
];
const statuses = ["All", "Delivered", "Failed", "Pending"];

export default function CommunicationsCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredTemplates = mockTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "All" || template.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const filteredEmails = mockEmailHistory.filter((email) => {
    const matchesSearch =
      email.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "All" || email.type === typeFilter;
    const matchesStatus =
      statusFilter === "All" || email.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Failed":
        return "bg-red-100 text-red-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Active":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Communications Center
          </h1>
          <p className="text-gray-600">
            Manage email templates and communication history
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <Mail className="mr-2 h-4 w-4" />
            Email History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Template Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Template Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Template Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {template.subject}
                      </CardDescription>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        template.status
                      )}`}
                    >
                      {template.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium">{template.type}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Usage Count</span>
                      <span className="font-medium">{template.usageCount}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Last Modified</span>
                      <span className="font-medium">
                        {new Date(template.lastModified).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="mr-1 h-4 w-4" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Email History Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                Email History Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Email Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Email History</CardTitle>
              <CardDescription>
                Showing {filteredEmails.length} of {mockEmailHistory.length}{" "}
                emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">
                        Recipient
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Subject
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Sent At
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmails.map((email) => (
                      <tr key={email.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{email.recipient}</div>
                          <div className="text-sm text-gray-500">
                            Booking: {email.bookingId}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs truncate">
                            {email.subject}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {email.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {getStatusIcon(email.status)}
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                email.status
                              )}`}
                            >
                              {email.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {new Date(email.sentAt).toLocaleDateString()}
                            <div className="text-gray-500">
                              {new Date(email.sentAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Templates
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockTemplates.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Emails Sent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockEmailHistory.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Delivery Rate
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    (mockEmailHistory.filter((e) => e.status === "Delivered")
                      .length /
                      mockEmailHistory.length) *
                      100
                  )}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Template Usage
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockTemplates.reduce(
                    (sum, template) => sum + template.usageCount,
                    0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
