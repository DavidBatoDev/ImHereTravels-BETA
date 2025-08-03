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
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Star,
} from "lucide-react";

// Mock data - replace with real data from your backend
const mockTours = [
  {
    id: "T001",
    name: "Bali Adventure Tour",
    location: "Bali, Indonesia",
    duration: "7 days",
    basePrice: 1200,
    discountedPrice: 1100,
    bookings: 15,
    status: "Active",
    rating: 4.8,
    highlights: ["Temple visits", "Beach activities", "Cultural experiences"],
  },
  {
    id: "T002",
    name: "Thailand Cultural Experience",
    location: "Bangkok & Chiang Mai, Thailand",
    duration: "10 days",
    basePrice: 1800,
    discountedPrice: 1650,
    bookings: 8,
    status: "Active",
    rating: 4.6,
    highlights: ["Temple tours", "Street food", "Elephant sanctuary"],
  },
  {
    id: "T003",
    name: "Vietnam Discovery",
    location: "Hanoi & Ho Chi Minh City, Vietnam",
    duration: "8 days",
    basePrice: 900,
    discountedPrice: 900,
    bookings: 12,
    status: "Active",
    rating: 4.7,
    highlights: ["Halong Bay", "Street markets", "War history"],
  },
];

const statuses = ["All", "Active", "Draft", "Archived"];
const locations = [
  "All",
  "Bali, Indonesia",
  "Bangkok & Chiang Mai, Thailand",
  "Hanoi & Ho Chi Minh City, Vietnam",
];

export default function ToursList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");

  const filteredTours = mockTours.filter((tour) => {
    const matchesSearch =
      tour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || tour.status === statusFilter;
    const matchesLocation =
      locationFilter === "All" || tour.location === locationFilter;

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-yellow-100 text-yellow-800";
      case "Archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tour Packages</h1>
          <p className="text-gray-600">Manage tour packages and itineraries</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Tour Package
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tours..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
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

      {/* Tours Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTours.map((tour) => (
          <Card key={tour.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{tour.name}</CardTitle>
                  <CardDescription className="flex items-center mt-1">
                    <MapPin className="mr-1 h-4 w-4" />
                    {tour.location}
                  </CardDescription>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    tour.status
                  )}`}
                >
                  {tour.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Clock className="mr-1 h-4 w-4 text-gray-400" />
                    Duration
                  </span>
                  <span className="font-medium">{tour.duration}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <DollarSign className="mr-1 h-4 w-4 text-gray-400" />
                    Price
                  </span>
                  <div className="text-right">
                    <span className="font-medium">${tour.discountedPrice}</span>
                    {tour.discountedPrice < tour.basePrice && (
                      <span className="text-xs text-gray-500 line-through ml-1">
                        ${tour.basePrice}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Users className="mr-1 h-4 w-4 text-gray-400" />
                    Bookings
                  </span>
                  <span className="font-medium">{tour.bookings}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Star className="mr-1 h-4 w-4 text-gray-400" />
                    Rating
                  </span>
                  <span className="font-medium">{tour.rating}/5</span>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-1">Highlights:</p>
                  <div className="flex flex-wrap gap-1">
                    {tour.highlights.slice(0, 2).map((highlight, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {highlight}
                      </span>
                    ))}
                    {tour.highlights.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{tour.highlights.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-1 h-4 w-4" />
                    View
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockTours.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockTours.reduce((sum, tour) => sum + tour.bookings, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  $
                  {Math.round(
                    mockTours.reduce(
                      (sum, tour) => sum + tour.discountedPrice,
                      0
                    ) / mockTours.length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(
                    mockTours.reduce((sum, tour) => sum + tour.rating, 0) /
                    mockTours.length
                  ).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
