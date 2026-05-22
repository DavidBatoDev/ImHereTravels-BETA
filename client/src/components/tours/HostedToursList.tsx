"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Fuse from "fuse.js";
import {
  Card,
  CardContent,
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
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Lock,
  X,
  GitBranch,
  Calendar,
} from "lucide-react";
import { TourPackage, TourFormDataWithStringDates } from "@/types/tours";
import { HostedTour } from "@/types/hosted-tours";
import {
  updateHostedTour,
  deleteHostedTour,
  toggleLock,
  syncFromParent,
} from "@/services/hosted-tours-service";
import { getAllTours } from "@/services/tours-service";
import HostedTourCard from "./HostedTourCard";
import HostedTourForm from "./HostedTourForm";
import TourDetails from "./TourDetails";
import CreateHostedTourModal from "./CreateHostedTourModal";

function toTourPackage(hostedTour: HostedTour): TourPackage {
  return {
    id: hostedTour.id,
    name: hostedTour.name,
    slug: hostedTour.slug,
    url: hostedTour.url,
    tourCode: hostedTour.tourCode,
    description: hostedTour.description,
    location: hostedTour.location,
    duration: hostedTour.duration,
    travelDates: hostedTour.travelDates,
    pricing: hostedTour.pricing,
    details: hostedTour.details,
    media: hostedTour.media,
    status: hostedTour.status,
    brochureLink: hostedTour.brochureLink,
    stripePaymentLink: hostedTour.stripePaymentLink,
    preDeparturePack: hostedTour.preDeparturePack,
    pricingHistory: [],
    currentVersion: 0,
    metadata: {
      createdAt: hostedTour.metadata.createdAt,
      updatedAt: hostedTour.metadata.updatedAt,
      createdBy: hostedTour.metadata.createdBy,
      bookingsCount: 0,
    },
  };
}

export default function HostedToursList() {
  const { toast } = useToast();

  const [allHostedTours, setAllHostedTours] = useState<HostedTour[]>([]);
  const [allParentTours, setAllParentTours] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedTour, setSelectedTour] = useState<HostedTour | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [tourToView, setTourToView] = useState<HostedTour | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<HostedTour | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingId, setIsSyncingId] = useState<string | null>(null);
  const [preSelectedParentId, setPreSelectedParentId] = useState<string | undefined>();
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [tourToSync, setTourToSync] = useState<HostedTour | null>(null);

  const nameCollator = useMemo(
    () => new Intl.Collator(undefined, { sensitivity: "base" }),
    [],
  );

  // Fuse.js search
  const fuse = useMemo(() => {
    if (allHostedTours.length === 0) return null;
    return new Fuse(allHostedTours, {
      keys: [
        { name: "name", weight: 0.5 },
        { name: "description", weight: 0.3 },
        { name: "location", weight: 0.2 },
        { name: "tourCode", weight: 0.5 },
        { name: "parentTourName", weight: 0.3 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [allHostedTours]);

  const filteredTours = useMemo(() => {
    let results = allHostedTours;

    if (fuse && searchTerm) {
      results = fuse.search(searchTerm).map((r) => r.item);
    }

    if (statusFilter !== "all") {
      results = results.filter((t) => t.status === statusFilter);
    }

    return [...results].sort((a, b) => {
      const an = (a?.name || "").trim();
      const bn = (b?.name || "").trim();
      if (!an && !bn) return 0;
      if (!an) return 1;
      if (!bn) return -1;
      return nameCollator.compare(an, bn);
    });
  }, [fuse, searchTerm, statusFilter, allHostedTours, nameCollator]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: allHostedTours.length,
      active: allHostedTours.filter((t) => t.status === "active").length,
      draft: allHostedTours.filter((t) => t.status === "draft").length,
      archived: allHostedTours.filter((t) => t.status === "archived").length,
      locked: allHostedTours.filter((t) => t.isLocked).length,
      syncedToday: allHostedTours.filter((t) => {
        if (!t.lastSyncedAt) return false;
        const d =
          typeof t.lastSyncedAt === "object" && typeof (t.lastSyncedAt as any).toDate === "function"
            ? (t.lastSyncedAt as any).toDate()
            : new Date(t.lastSyncedAt as any);
        return d >= today;
      }).length,
    };
  }, [allHostedTours]);

  // Real-time listener for hostedTours
  const loadHostedTours = () => {
    try {
      setLoading(true);
      const q = query(collection(db, "hostedTours"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as HostedTour[];
          setAllHostedTours(data);
          setLoading(false);
        },
        (error) => {
          console.error("Error loading hosted tours:", error);
          toast({ title: "Error", description: "Failed to load hosted tours.", variant: "destructive" });
          setLoading(false);
        },
      );
      return unsubscribe;
    } catch {
      setLoading(false);
      return () => {};
    }
  };

  useEffect(() => {
    const unsub = loadHostedTours();
    // Fetch parent tours for CreateHostedTourModal
    getAllTours().then(setAllParentTours).catch(() => {});
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  async function handleUpdateHostedTour(data: TourFormDataWithStringDates) {
    if (!selectedTour) return;
    setIsSubmitting(true);
    try {
      await updateHostedTour(selectedTour.id, data as any);
      toast({ title: "Success", description: "Hosted tour updated successfully!" });
      setIsFormOpen(false);
      setSelectedTour(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update hosted tour.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleViewTour(tour: HostedTour) {
    setTourToView(tour);
    setIsDetailsOpen(true);
  }

  function handleEditTour(tour: HostedTour) {
    setSelectedTour(tour);
    setIsFormOpen(true);
  }

  function confirmDelete(tour: HostedTour) {
    setTourToDelete(tour);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteTour() {
    if (!tourToDelete) return;
    try {
      await deleteHostedTour(tourToDelete.id);
      toast({ title: "Success", description: "Hosted tour deleted." });
    } catch {
      toast({ title: "Error", description: "Failed to delete hosted tour.", variant: "destructive" });
    } finally {
      setIsDeleteDialogOpen(false);
      setTourToDelete(null);
    }
  }

  function handleSyncFromParent(tour: HostedTour) {
    setTourToSync(tour);
    setIsSyncDialogOpen(true);
  }

  async function handleConfirmSync() {
    if (!tourToSync) return;
    setIsSyncDialogOpen(false);
    setIsSyncingId(tourToSync.id);
    try {
      await syncFromParent(tourToSync.id);
      toast({ title: "Synced", description: `"${tourToSync.name}" updated from parent tour.` });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync.",
        variant: "destructive",
      });
    } finally {
      setIsSyncingId(null);
      setTourToSync(null);
    }
  }

  async function handleToggleLock(tour: HostedTour) {
    const newLocked = !tour.isLocked;
    try {
      await toggleLock(tour.id, newLocked);
      toast({
        title: newLocked ? "Tour locked" : "Tour unlocked",
        description: newLocked
          ? "Sync from parent is now prevented."
          : "Sync from parent is now allowed.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to update lock.", variant: "destructive" });
    }
  }

  function handleCreateSuccess(_id: string) {
    setIsCreateModalOpen(false);
    setPreSelectedParentId(undefined);
  }

  // Lock state change from within the form
  function handleLockToggled(newLocked: boolean) {
    if (!selectedTour) return;
    setSelectedTour((prev) => prev ? { ...prev, isLocked: newLocked } : prev);
  }

  // After sync from within the form — close the form; list will refresh via onSnapshot
  function handleSynced() {
    setIsFormOpen(false);
    setSelectedTour(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-crimson-red/30 rounded-full" />
            <div className="w-20 h-20 border-4 border-crimson-red border-t-transparent rounded-full animate-spin absolute inset-0" />
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">Loading Hosted Tours...</p>
            <p className="text-sm text-muted-foreground mt-2">Fetching your hosted tour collection</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards + Create Button */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-4">
        {/* Total Hosted Tours */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Total Hosted Tours
                </p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {stats.active > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-spring-green" />
                      <p className="text-xs text-muted-foreground">
                        Active: <span className="text-spring-green font-bold">{stats.active}</span>
                      </p>
                    </div>
                  )}
                  {stats.draft > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-vivid-orange" />
                      <p className="text-xs text-muted-foreground">
                        Draft: <span className="text-vivid-orange font-bold">{stats.draft}</span>
                      </p>
                    </div>
                  )}
                  {stats.archived > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <p className="text-xs text-muted-foreground">
                        Archived: <span className="text-blue-500 font-bold">{stats.archived}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-full rounded-br-none">
                <GitBranch className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locked Tours */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Locked Tours
                </p>
                <p className="text-2xl font-bold text-crimson-red">{stats.locked}</p>
                {stats.locked > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-crimson-red" />
                    <p className="text-xs text-muted-foreground">Sync prevented</p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gradient-to-br from-crimson-red/20 to-crimson-red/10 rounded-full rounded-br-none">
                <Lock className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Synced Today */}
        <Card className="border border-border hover:border-crimson-red transition-all duration-300 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                  Synced Today
                </p>
                <p className="text-2xl font-bold text-royal-purple">{stats.syncedToday}</p>
                {stats.syncedToday > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-royal-purple" />
                    <p className="text-xs text-muted-foreground">Updated from parent today</p>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gradient-to-br from-royal-purple/20 to-royal-purple/10 rounded-full rounded-br-none">
                <Calendar className="h-6 w-6 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Button */}
        <div className="flex items-center justify-center">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="group h-20 w-20 rounded-full rounded-br-none bg-crimson-red hover:bg-royal-purple text-white transition-all duration-300 hover:scale-105 shadow-lg relative"
            title="Create Hosted Tour"
          >
            <Plus className="h-10 w-10 absolute group-hover:opacity-0 group-hover:scale-0 transition-all duration-300" />
            <span className="text-[8px] font-medium opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 whitespace-nowrap font-hk-grotesk text-center leading-tight">
              CREATE HOSTED
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
                  placeholder="Search hosted tours or parent tour name..."
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
              onClick={() => { setLoading(true); loadHostedTours(); }}
              disabled={loading}
              className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-3">
              Showing {filteredTours.length} result{filteredTours.length !== 1 ? "s" : ""} for &quot;{searchTerm}&quot;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tour Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTours.map((tour) => (
          <HostedTourCard
            key={tour.id}
            tour={tour}
            isSyncing={isSyncingId === tour.id}
            onView={() => handleViewTour(tour)}
            onEdit={() => handleEditTour(tour)}
            onSync={() => handleSyncFromParent(tour)}
            onToggleLock={() => handleToggleLock(tour)}
            onDelete={() => confirmDelete(tour)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredTours.length === 0 && !loading && (
        <Card className="border border-royal-purple/20 dark:border-border shadow">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4 border border-royal-purple/20 dark:border-border">
              <GitBranch className="h-12 w-12 text-royal-purple/60" />
            </div>
            <CardTitle className="text-xl mb-2 text-foreground">
              {searchTerm || statusFilter !== "all"
                ? "No hosted tours found"
                : "No hosted tours yet"}
            </CardTitle>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Create your first hosted tour by duplicating an existing tour package and personalizing it."}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-crimson-red hover:bg-royal-purple text-white transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Hosted Tour
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Details */}
      <TourDetails
        tour={tourToView ? toTourPackage(tourToView) : null}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setTourToView(null);
        }}
        onEdit={(pkg) => {
          setIsDetailsOpen(false);
          setTourToView(null);
          const original = allHostedTours.find((t) => t.id === pkg.id);
          if (original) handleEditTour(original);
        }}
      />

      {/* Edit Form */}
      <HostedTourForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedTour(null); }}
        hostedTour={selectedTour}
        onSubmit={handleUpdateHostedTour}
        onSynced={handleSynced}
        onLockToggled={handleLockToggled}
        isLoading={isSubmitting}
      />

      {/* Create Modal */}
      <CreateHostedTourModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setPreSelectedParentId(undefined); }}
        tours={allParentTours}
        onSuccess={handleCreateSuccess}
        preSelectedParentId={preSelectedParentId}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border border-royal-purple/20 dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hosted Tour?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{tourToDelete?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTour}
              className="bg-crimson-red text-white hover:bg-crimson-red/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync Confirmation */}
      <AlertDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <AlertDialogContent className="border border-royal-purple/20 dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Sync from Parent Tour?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current data in &quot;{tourToSync?.name}&quot; with the latest content from &quot;{tourToSync?.parentTourName}&quot;. Your custom changes to this hosted tour will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTourToSync(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSync}
              className="bg-royal-purple text-white hover:bg-royal-purple/90"
            >
              Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
