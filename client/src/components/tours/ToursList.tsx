"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Fuse from "fuse.js";
import type { Booking } from "@/types/bookings";
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
  Banknote,
  Users,
  Star,
  Archive,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Calendar,
  TrendingUp,
  X,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allTours, setAllTours] = useState<TourPackage[]>([]); // Full list for client-side search
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    if (allTours.length === 0) return null;

    return new Fuse(allTours, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "description", weight: 0.3 },
        { name: "location", weight: 0.2 },
        { name: "tourCode", weight: 0.7 },
      ],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [allTours]);

  // Filter tours based on search and filters
  const filteredTours = useMemo(() => {
    let results = allTours;

    // Apply Fuse.js fuzzy search
    if (fuse && searchTerm) {
      const fuseResults = fuse.search(searchTerm);
      results = fuseResults.map((result) => result.item);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      results = results.filter((tour) => tour.status === statusFilter);
    }

    return results;
  }, [fuse, searchTerm, statusFilter, allTours]);

  // Load bookings data
  const loadBookings = () => {
    try {
      const bookingsQuery = query(collection(db, "bookings"));

      const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
        const bookingData = snapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert Firebase Timestamps to JavaScript Date objects
          return {
            id: doc.id,
            ...data,
            reservationDate: data.reservationDate?.toDate
              ? data.reservationDate.toDate()
              : new Date(data.reservationDate),
            tourDate: data.tourDate?.toDate
              ? data.tourDate.toDate()
              : new Date(data.tourDate),
            returnDate: data.returnDate?.toDate
              ? data.returnDate.toDate()
              : data.returnDate
              ? new Date(data.returnDate)
              : null,
          };
        }) as Booking[];

        setBookings(bookingData);
        console.log("Loaded bookings:", bookingData.length, bookingData);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading bookings:", error);
      return () => {}; // Return empty function as fallback
    }
  };

  // Load tours
  const loadTours = async () => {
    try {
      setLoading(true);

      // Test Firestore connection first
      await testFirestoreConnection();

      // Don't apply search filter server-side, use client-side fuzzy search instead
      const filters: TourFilters = {};

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
      setAllTours(fetchedTours);
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
    const unsubscribeBookings = loadBookings();

    return () => {
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
    };
  }, []); // Only load on mount, filtering is now client-side

  // Handle query parameters for opening modals
  useEffect(() => {
    const tourId = searchParams.get("tourId");
    const action = searchParams.get("action");
    const mode = searchParams.get("mode");

    if (tourId && allTours.length > 0) {
      const tour = allTours.find((t) => t.id === tourId);
      if (tour) {
        setSelectedTour(tour);
        if (mode === "edit") {
          setIsDetailsOpen(false);
          setIsFormOpen(true);
        } else {
          setIsDetailsOpen(true);
        }
      }
    } else if (action === "new") {
      setSelectedTour(null);
      setIsFormOpen(true);
    }
  }, [searchParams, allTours]);

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

      // Clear URL parameters after create
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      params.delete("mode");
      router.push(`/tours?${params.toString()}`, { scroll: false });

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

      // Clear URL parameters after update
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tourId");
      params.delete("action");
      params.delete("mode");
      router.push(`/tours?${params.toString()}`, { scroll: false });
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

      // Clear URL parameters after archive
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tourId");
      params.delete("action");
      params.delete("mode");
      router.push(`/tours?${params.toString()}`, { scroll: false });
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

      // Clear URL parameters after delete
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tourId");
      params.delete("action");
      params.delete("mode");
      router.push(`/tours?${params.toString()}`, { scroll: false });
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

    // Add action to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("action", "new");
    router.push(`/tours?${params.toString()}`, { scroll: false });
  };

  // Open edit form
  const openEditForm = (tour: TourPackage) => {
    setSelectedTour(tour);
    setIsFormOpen(true);

    // Add tourId and mode to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("tourId", tour.id);
    params.set("mode", "edit");
    router.push(`/tours?${params.toString()}`, { scroll: false });
  };

  // Open tour details
  const openTourDetails = (tour: TourPackage) => {
    setSelectedTour(tour);
    setIsDetailsOpen(true);

    // Add tourId to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("tourId", tour.id);
    router.push(`/tours?${params.toString()}`, { scroll: false });
  };

  // Confirm delete
  const confirmDelete = (tour: TourPackage) => {
    setTourToDelete(tour);
    setIsDeleteDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-spring-green/20 text-spring-green border border-spring-green/30";
      case "draft":
        return "bg-sunglow-yellow/20 text-vivid-orange border border-sunglow-yellow/30";
      case "archived":
        return "bg-grey/20 text-grey border border-grey/30";
      default:
        return "bg-grey/20 text-grey border border-grey/30";
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return `${currency} ${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-royal-purple" />
        <span className="ml-2 text-foreground">Loading tours...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground font-hk-grotesk">
          Tour Packages
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage your tour packages and itineraries
        </p>
      </div>

      {/* Statistics Cards with Add Button */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4">
        {/* Total Tours */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Total Tours
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {allTours.length}
                </p>
                {/* Breakdown */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {allTours.filter((tour) => tour.status === "active").length >
                    0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-spring-green"></div>
                      <p className="text-xs text-muted-foreground">
                        Active:{" "}
                        <span className="text-spring-green font-bold">
                          {
                            allTours.filter((tour) => tour.status === "active")
                              .length
                          }
                        </span>
                      </p>
                    </div>
                  )}
                  {allTours.filter((tour) => tour.status === "draft").length >
                    0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-vivid-orange"></div>
                      <p className="text-xs text-muted-foreground">
                        Draft:{" "}
                        <span className="text-vivid-orange font-bold">
                          {
                            allTours.filter((tour) => tour.status === "draft")
                              .length
                          }
                        </span>
                      </p>
                    </div>
                  )}
                  {allTours.filter((tour) => tour.status === "archived")
                    .length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-xs text-muted-foreground">
                        Archived:{" "}
                        <span className="text-blue-500 font-bold">
                          {
                            allTours.filter(
                              (tour) => tour.status === "archived"
                            ).length
                          }
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-full rounded-br-none">
                <MapPin className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Cost */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-vivid-orange">
                  {bookings.length}
                </p>
                {bookings.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-vivid-orange"></div>
                    <p className="text-xs text-muted-foreground">
                      From all tours
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gradient-to-br from-vivid-orange/20 to-vivid-orange/10 rounded-full rounded-br-none">
                <Banknote className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Most Selected Tour */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Most Selected Tour
                </p>
                {(() => {
                  // Calculate actual booking counts from bookings collection
                  const tourBookingCounts: { [tourName: string]: number } = {};
                  bookings.forEach((booking) => {
                    const tourName =
                      booking.tourPackageName ||
                      booking.tourPackage ||
                      booking.tourName ||
                      booking.tour ||
                      booking.package;
                    if (tourName && tourName.trim() !== "") {
                      tourBookingCounts[tourName] =
                        (tourBookingCounts[tourName] || 0) + 1;
                    }
                  });

                  // Sort tours by actual booking count and get top 3
                  const sortedTours = [...allTours]
                    .map((tour) => ({
                      ...tour,
                      actualBookingsCount: tourBookingCounts[tour.name] || 0,
                    }))
                    .sort(
                      (a, b) => b.actualBookingsCount - a.actualBookingsCount
                    )
                    .slice(0, 3);

                  const mostSelectedTour = sortedTours[0] || {
                    name: "No tours",
                    actualBookingsCount: 0,
                  };

                  return (
                    <>
                      <p
                        className="text-lg font-bold text-royal-purple truncate"
                        title={mostSelectedTour.name}
                      >
                        {mostSelectedTour.name}
                      </p>
                      {allTours.length > 0 &&
                        mostSelectedTour.actualBookingsCount > 0 && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-2 h-2 rounded-full bg-royal-purple"></div>
                            <p className="text-xs text-muted-foreground">
                              {mostSelectedTour.actualBookingsCount} bookings
                            </p>
                          </div>
                        )}

                      {/* Show 2nd and 3rd place */}
                      {sortedTours.length > 1 && (
                        <div className="mt-3 space-y-1">
                          {sortedTours.slice(1).map((tour, index) => (
                            <div
                              key={tour.id || index}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  #{index + 2}
                                </span>
                                <p
                                  className="text-xs text-muted-foreground truncate flex-1"
                                  title={tour.name}
                                >
                                  {tour.name}
                                </p>
                              </div>
                              <span className="text-xs font-medium text-royal-purple">
                                {tour.actualBookingsCount}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="p-4 bg-gradient-to-br from-royal-purple/20 to-royal-purple/10 rounded-full rounded-br-none">
                <Star className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Tour Button */}
        <div className="flex items-center justify-center">
          <Button
            onClick={openCreateForm}
            className="group h-20 w-20 rounded-full rounded-br-none bg-crimson-red hover:bg-royal-purple text-white transition-all duration-300 hover:scale-105 shadow-lg relative"
            title="Add New Tour"
          >
            <Plus className="h-10 w-10 absolute group-hover:opacity-0 group-hover:scale-0 transition-all duration-300" />
            <span className="text-[9px] font-medium opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 whitespace-nowrap font-hk-grotesk">
              ADD TOUR
            </span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-royal-purple/20 dark:border-border shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-royal-purple/60 h-4 w-4" />
                <Input
                  placeholder="Search across all fields ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 border-royal-purple/20 focus:border-royal-purple focus:ring-royal-purple/20">
                <Filter className="mr-2 h-4 w-4 text-royal-purple" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={loadTours}
              disabled={loading}
              className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
            >
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
        {filteredTours.map((tour) => {
          const currentPrice = tour.pricing.discounted || tour.pricing.original;
          const hasDiscount =
            tour.pricing.discounted &&
            tour.pricing.discounted < tour.pricing.original;

          return (
            <Card
              key={tour.id}
              className="hover:shadow-lg transition-all duration-200 overflow-hidden border border-royal-purple/20 dark:border-border shadow hover:border-royal-purple/40 dark:hover:border-border flex flex-col h-full"
            >
              {/* Cover Image */}
              <div className="relative w-full h-48 bg-muted">
                {tour.media?.coverImage ? (
                  <Image
                    src={tour.media.coverImage}
                    alt={tour.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/50">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-royal-purple/60" />
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
                    <CardTitle className="text-lg mb-1 text-foreground">
                      {tour.name}
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="h-4 w-4 mr-1 text-royal-purple" />
                      {tour.location}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-royal-purple hover:bg-royal-purple/10 hover:text-royal-purple"
                        >
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
                          className="text-crimson-red focus:text-crimson-red"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 text-muted-foreground">
                  {tour.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                  {/* Tour Details */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-royal-purple" />
                        <span className="text-foreground">
                          {tour.duration} days
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-royal-purple" />
                        <span className="text-foreground">
                          {tour.metadata.bookingsCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-foreground">
                          {formatPrice(currentPrice, tour.pricing.currency)}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(
                              tour.pricing.original,
                              tour.pricing.currency
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
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
                        className="bg-spring-green/20 text-spring-green border border-spring-green/30"
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
                            className="text-xs border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10"
                          >
                            {highlight.length > 15
                              ? `${highlight.slice(0, 15)}...`
                              : highlight}
                          </Badge>
                        ))}
                      {tour.details.highlights.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10"
                        >
                          +{tour.details.highlights.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Fixed at bottom */}
                <div className="flex gap-2 pt-4 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTourDetails(tour)}
                    className="flex-1 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditForm(tour)}
                    className="flex-1 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTours.length === 0 && !loading && (
        <Card className="border border-royal-purple/20 dark:border-border shadow">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4 border border-royal-purple/20 dark:border-border">
              <MapPin className="h-12 w-12 text-royal-purple/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No tours found
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by creating your first tour package"}
            </p>
            <Button
              onClick={openCreateForm}
              className="bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
            >
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

          // Remove URL parameters
          const params = new URLSearchParams(searchParams.toString());
          params.delete("tourId");
          params.delete("action");
          params.delete("mode");
          router.push(`/tours?${params.toString()}`, { scroll: false });
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

          // Remove URL parameters
          const params = new URLSearchParams(searchParams.toString());
          params.delete("tourId");
          params.delete("action");
          params.delete("mode");
          router.push(`/tours?${params.toString()}`, { scroll: false });
        }}
        onEdit={(tour) => {
          setIsDetailsOpen(false);
          openEditForm(tour);
        }}
        onArchive={handleArchiveTour}
        onDelete={confirmDelete}
        router={router}
        searchParams={searchParams}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="border border-royal-purple/20 dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete the
              tour "{tourToDelete?.name}" and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTour}
              className="bg-crimson-red hover:bg-crimson-red/90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
