"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  Archive,
  Trash2,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TourPackage,
  TourFormDataWithStringDates,
  TourFilters,
} from "@/types/tours";
import {
  getTours,
  createTour,
  updateTour,
  deleteTour,
  archiveTour,
  testFirestoreConnection,
} from "@/services/tours-service";
import TourForm from "./TourForm";
import TourDetails from "./TourDetails";

export default function ToursList() {
  const [tours, setTours] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTour, setSelectedTour] = useState<TourPackage | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<TourPackage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Load tours
  const loadTours = async () => {
    try {
      setLoading(true);

      // Test Firestore connection first
      await testFirestoreConnection();

      const filters: TourFilters = {};

      if (statusFilter !== "all") {
        filters.status = statusFilter as "active" | "draft" | "archived";
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      const { tours: fetchedTours } = await getTours(
        filters,
        "createdAt",
        "desc",
        50
      );
      console.log("Fetched tours:", fetchedTours);
      console.log("Total tours fetched:", fetchedTours.length);
      console.log(
        "Tour codes:",
        fetchedTours.map((t) => t.tourCode)
      );
      setTours(fetchedTours);
    } catch (error) {
      console.error("Error loading tours:", error);
      toast({
        title: "Error",
        description: "Failed to load tours. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTours();
  }, [searchTerm, statusFilter]);

  // Create tour
  const handleCreateTour = async (data: TourFormDataWithStringDates) => {
    try {
      setIsSubmitting(true);

      const tourId = await createTour(data);

      toast({
        title: "Success",
        description: "Tour created successfully!",
      });

      await loadTours();
      setIsFormOpen(false);
      setSelectedTour(null);

      return tourId; // Return the tour ID for blob uploads
    } catch (error) {
      console.error("Error creating tour:", error);
      toast({
        title: "Error",
        description: "Failed to create tour. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update tour
  const handleUpdateTour = async (data: TourFormDataWithStringDates) => {
    if (!selectedTour) return;

    try {
      setIsSubmitting(true);

      await updateTour(selectedTour.id, data);

      toast({
        title: "Success",
        description: "Tour updated successfully!",
      });

      await loadTours();
      setIsFormOpen(false);
      setSelectedTour(null);
    } catch (error) {
      console.error("Error updating tour:", error);
      toast({
        title: "Error",
        description: "Failed to update tour. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive tour
  const handleArchiveTour = async (tour: TourPackage) => {
    try {
      await archiveTour(tour.id);

      toast({
        title: "Success",
        description: "Tour archived successfully!",
      });

      await loadTours();
      setIsDetailsOpen(false);
    } catch (error) {
      console.error("Error archiving tour:", error);
      toast({
        title: "Error",
        description: "Failed to archive tour. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Delete tour
  const handleDeleteTour = async () => {
    if (!tourToDelete) return;

    try {
      await deleteTour(tourToDelete.id);

      toast({
        title: "Success",
        description: "Tour deleted successfully!",
      });

      await loadTours();
      setIsDeleteDialogOpen(false);
      setTourToDelete(null);
      setIsDetailsOpen(false);
    } catch (error) {
      console.error("Error deleting tour:", error);
      toast({
        title: "Error",
        description: "Failed to delete tour. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const handleFormSubmit = async (data: TourFormDataWithStringDates) => {
    if (selectedTour) {
      await handleUpdateTour(data);
    } else {
      return await handleCreateTour(data); // Return tour ID for blob uploads
    }
  };

  // Open create form
  const openCreateForm = () => {
    setSelectedTour(null);
    setIsFormOpen(true);
  };

  // Open edit form
  const openEditForm = (tour: TourPackage) => {
    setSelectedTour(tour);
    setIsFormOpen(true);
  };

  // Open tour details
  const openTourDetails = (tour: TourPackage) => {
    setSelectedTour(tour);
    setIsDetailsOpen(true);
  };

  // Confirm delete
  const confirmDelete = (tour: TourPackage) => {
    setTourToDelete(tour);
    setIsDeleteDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading tours...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tour Packages</h1>
          <p className="text-gray-600 mt-2">
            Manage your tour packages and itineraries
          </p>
        </div>
        <Button onClick={openCreateForm} className="mt-4 md:mt-0">
          <Plus className="mr-2 h-4 w-4" />
          Add New Tour
        </Button>
      </div>

      {/* Summary Cards */}
      {tours.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Tours
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tours.length}
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
                    {tours.reduce(
                      (sum, tour) => sum + tour.metadata.bookingsCount,
                      0
                    )}
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
                  <p className="text-sm font-medium text-gray-600">
                    Avg. Price
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    $
                    {tours.length > 0
                      ? Math.round(
                          tours.reduce(
                            (sum, tour) =>
                              sum +
                              (tour.pricing.discounted ||
                                tour.pricing.original),
                            0
                          ) / tours.length
                        )
                      : 0}
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
                  <p className="text-sm font-medium text-gray-600">
                    Active Tours
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tours.filter((tour) => tour.status === "active").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tours..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadTours} disabled={loading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tours List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map((tour) => {
          const currentPrice = tour.pricing.discounted || tour.pricing.original;
          const hasDiscount =
            tour.pricing.discounted &&
            tour.pricing.discounted < tour.pricing.original;

          return (
            <Card
              key={tour.id}
              className="hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Cover Image */}
              <div className="relative w-full h-48 bg-gray-200">
                {tour.media?.coverImage ? (
                  <Image
                    src={tour.media.coverImage}
                    alt={tour.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-500">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No image</p>
                    </div>
                  </div>
                )}
                {/* Status Badge Overlay */}
                <div className="absolute top-3 right-3">
                  <Badge className={getStatusColor(tour.status)}>
                    {tour.status.charAt(0).toUpperCase() + tour.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{tour.name}</CardTitle>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      {tour.location}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openTourDetails(tour)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditForm(tour)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {tour.status !== "archived" && (
                          <DropdownMenuItem
                            onClick={() => handleArchiveTour(tour)}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => confirmDelete(tour)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {tour.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Tour Details */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-gray-500" />
                        <span>{tour.duration} days</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-500" />
                        <span>{tour.metadata.bookingsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-900">
                          {formatPrice(currentPrice, tour.pricing.currency)}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-gray-500 line-through">
                            {formatPrice(
                              tour.pricing.original,
                              tour.pricing.currency
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Deposit:{" "}
                        {formatPrice(
                          tour.pricing.deposit,
                          tour.pricing.currency
                        )}
                      </p>
                    </div>
                    {hasDiscount && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        {Math.round(
                          ((tour.pricing.original - tour.pricing.discounted!) /
                            tour.pricing.original) *
                            100
                        )}
                        % OFF
                      </Badge>
                    )}
                  </div>

                  {/* Highlights Preview */}
                  <div>
                    <div className="flex flex-wrap gap-1">
                      {tour.details.highlights
                        .slice(0, 3)
                        .map((highlight, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {highlight.length > 15
                              ? `${highlight.slice(0, 15)}...`
                              : highlight}
                          </Badge>
                        ))}
                      {tour.details.highlights.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{tour.details.highlights.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTourDetails(tour)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(tour)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {tours.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tours found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first tour package"}
            </p>
            <Button onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Tour
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tour Form Dialog */}
      <TourForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTour(null);
        }}
        onSubmit={handleFormSubmit}
        tour={selectedTour}
        isLoading={isSubmitting}
      />

      {/* Tour Details Dialog */}
      <TourDetails
        tour={selectedTour}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTour(null);
        }}
        onEdit={(tour) => {
          setIsDetailsOpen(false);
          openEditForm(tour);
        }}
        onArchive={handleArchiveTour}
        onDelete={confirmDelete}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              tour "{tourToDelete?.name}" and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTour}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
