"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Removed Select dropdown usage in favor of checkbox list
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Trash2,
  Download,
  FileText,
  X,
  Plus,
  RefreshCw,
  Package,
  Save,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  PreDeparturePack,
  TourPackageAssignment,
} from "@/types/pre-departure-pack";
import {
  getAllPreDeparturePacks,
  createPreDeparturePack,
  updatePackTourPackages,
  replacePackFile,
  deletePreDeparturePack,
} from "@/services/pre-departure-pack-service";
import { getTours } from "@/services/tours-service";
import { TourPackage } from "@/types/tours";
import {
  onSnapshot,
  collection,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PreDeparturePackSection() {
  const { toast } = useToast();
  const [packs, setPacks] = useState<PreDeparturePack[]>([]);
  const [tourPackages, setTourPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [automaticSends, setAutomaticSends] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);

  // Carousel state
  const packsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Create pack dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTourPackages, setSelectedTourPackages] = useState<
    TourPackageAssignment[]
  >([]);
  const [packDescription, setPackDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit pack dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<PreDeparturePack | null>(null);
  const [editSelectedTourPackages, setEditSelectedTourPackages] = useState<
    TourPackageAssignment[]
  >([]);
  const [updating, setUpdating] = useState(false);

  // Replace file dialog state
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replacingPack, setReplacingPack] = useState<PreDeparturePack | null>(
    null
  );
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);

  // Section navigation for modal
  const [activeSection, setActiveSection] = useState<string>("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);

  // Define sections for upload modal
  const sections = [
    { id: "file-upload", title: "File Upload", icon: Upload },
    { id: "tour-packages", title: "Tour Packages", icon: Package },
  ];

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      isScrollingProgrammatically.current = true;
      setActiveSection(sectionId);
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 1000);
    }
  };

  // Track active section on scroll
  useEffect(() => {
    if (!createDialogOpen) return;

    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return;
      if (!scrollContainerRef.current) return;

      const sections =
        scrollContainerRef.current.querySelectorAll('[id^="section-"]');
      if (sections.length === 0) return;

      const container = scrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();

      let mostVisibleSection = "";
      let maxVisibleArea = 0;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, containerRect.top);
        const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        if (visibleHeight > maxVisibleArea) {
          maxVisibleArea = visibleHeight;
          mostVisibleSection = section.id.replace("section-", "");
        }
      });

      if (mostVisibleSection && mostVisibleSection !== activeSection) {
        setActiveSection(mostVisibleSection);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      setTimeout(handleScroll, 100);

      return () => {
        scrollContainer.removeEventListener("scroll", handleScroll);
      };
    }
  }, [createDialogOpen, activeSection]);

  // Set first section as active on modal open
  useEffect(() => {
    if (createDialogOpen && sections.length > 0 && !activeSection) {
      setActiveSection(sections[0].id);
    }
  }, [createDialogOpen]);

  // Load tour packages
  useEffect(() => {
    loadTourPackages();
    loadAutomaticSendsConfig();
  }, []);

  // Real-time subscription to pre-departure packs
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "preDeparturePack"),
      (snapshot) => {
        const packsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PreDeparturePack[];

        // Sort by uploadedAt descending
        packsData.sort((a, b) => {
          const aTime = a.uploadedAt?.toMillis() || 0;
          const bTime = b.uploadedAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setPacks(packsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to pre-departure packs:", error);
        toast({
          title: "Error",
          description: "Failed to load pre-departure packs",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const loadTourPackages = async () => {
    try {
      const { tours } = await getTours({}, "name", "asc", 100);
      setTourPackages(tours);
    } catch (error) {
      console.error("Error loading tour packages:", error);
      toast({
        title: "Error",
        description: "Failed to load tour packages",
        variant: "destructive",
      });
    }
  };

  const loadAutomaticSendsConfig = async () => {
    try {
      const configDocRef = doc(db, "config", "pre-departure");
      const configDoc = await getDoc(configDocRef);
      if (configDoc.exists()) {
        const configData = configDoc.data();
        setAutomaticSends(configData?.automaticSends || false);
      }
    } catch (error) {
      console.error("Error loading automatic sends config:", error);
    }
  };

  const handleAutomaticSendsToggle = async (checked: boolean) => {
    setUpdatingConfig(true);
    try {
      const configDocRef = doc(db, "config", "pre-departure");
      await updateDoc(configDocRef, {
        automaticSends: checked,
        lastUpdated: Timestamp.now(),
      });

      setAutomaticSends(checked);

      toast({
        title: "Success",
        description: `Automatic sends ${checked ? "enabled" : "disabled"}`,
      });
    } catch (error: any) {
      console.error("Error updating automatic sends:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update automatic sends",
        variant: "destructive",
      });
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplaceFile(file);
    }
  };

  const addTourPackage = (tourPackageId: string) => {
    const tourPackage = tourPackages.find((tp) => tp.id === tourPackageId);
    if (!tourPackage) return;

    // Check if already added
    if (selectedTourPackages.some((tp) => tp.tourPackageId === tourPackageId)) {
      toast({
        title: "Already Added",
        description: "This tour package is already selected",
        variant: "destructive",
      });
      return;
    }

    setSelectedTourPackages([
      ...selectedTourPackages,
      {
        tourPackageId: tourPackage.id,
        tourPackageName: tourPackage.name,
      },
    ]);
  };

  const removeTourPackage = (tourPackageId: string) => {
    setSelectedTourPackages(
      selectedTourPackages.filter((tp) => tp.tourPackageId !== tourPackageId)
    );
  };

  const handleCreatePack = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (selectedTourPackages.length === 0) {
      toast({
        title: "No Tour Packages",
        description: "Please select at least one tour package",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      await createPreDeparturePack({
        tourPackages: selectedTourPackages,
        file: selectedFile,
        metadata: {
          description: packDescription,
        },
      });

      toast({
        title: "Success",
        description: "Pre-departure pack created successfully",
      });

      // Reset form
      setSelectedFile(null);
      setSelectedTourPackages([]);
      setPackDescription("");
      setCreateDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating pack:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pre-departure pack",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleEditPack = (pack: PreDeparturePack) => {
    setEditingPack(pack);
    setEditSelectedTourPackages([...pack.tourPackages]);
    setEditDialogOpen(true);
  };

  // Toggle selection in edit modal
  const toggleEditTourPackage = (tourPackageId: string) => {
    if (!editingPack) return;
    setEditSelectedTourPackages((prev) => {
      if (prev.some((tp) => tp.tourPackageId === tourPackageId)) {
        return prev.filter((tp) => tp.tourPackageId !== tourPackageId);
      }
      const tourPackage = tourPackages.find((tp) => tp.id === tourPackageId);
      if (!tourPackage) return prev;
      return [
        ...prev,
        { tourPackageId: tourPackage.id, tourPackageName: tourPackage.name },
      ];
    });
  };

  const removeEditTourPackage = (tourPackageId: string) => {
    setEditSelectedTourPackages(
      editSelectedTourPackages.filter(
        (tp) => tp.tourPackageId !== tourPackageId
      )
    );
  };

  const handleUpdatePackTourPackages = async () => {
    if (!editingPack) return;

    if (editSelectedTourPackages.length === 0) {
      toast({
        title: "No Tour Packages",
        description: "Please select at least one tour package",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      await updatePackTourPackages(editingPack.id, editSelectedTourPackages);

      toast({
        title: "Success",
        description: "Tour packages updated successfully",
      });

      setEditDialogOpen(false);
      setEditingPack(null);
    } catch (error: any) {
      console.error("Error updating tour packages:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tour packages",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleReplaceFile = (pack: PreDeparturePack) => {
    setReplacingPack(pack);
    setReplaceFile(null);
    setReplaceDialogOpen(true);
  };

  const handleConfirmReplaceFile = async () => {
    if (!replacingPack || !replaceFile) return;

    setReplacing(true);
    try {
      await replacePackFile(replacingPack.id, replaceFile);

      toast({
        title: "Success",
        description: "File replaced successfully",
      });

      setReplaceDialogOpen(false);
      setReplacingPack(null);
      setReplaceFile(null);
    } catch (error: any) {
      console.error("Error replacing file:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to replace file",
        variant: "destructive",
      });
    } finally {
      setReplacing(false);
    }
  };

  const handleDeletePack = async (pack: PreDeparturePack) => {
    if (!confirm(`Are you sure you want to delete "${pack.fileName}"?`)) {
      return;
    }

    try {
      await deletePreDeparturePack(pack.id);

      toast({
        title: "Success",
        description: "Pre-departure pack deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting pack:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete pre-departure pack",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileType = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || ""))
      return "image";
    return "document";
  };

  // All tour packages that already have at least one pre-departure pack
  const assignedTourPackageIds = useMemo(() => {
    const ids = new Set<string>();
    packs.forEach((p) => {
      p.tourPackages.forEach((tp) => ids.add(tp.tourPackageId));
    });
    return ids;
  }, [packs]);

  // Tour packages assigned to other packs (exclude the one being edited)
  const assignedToOtherPacksIds = useMemo(() => {
    const ids = new Set<string>();
    packs.forEach((p) => {
      if (editingPack && p.id === editingPack.id) return; // exclude current editing pack
      p.tourPackages.forEach((tp) => ids.add(tp.tourPackageId));
    });
    return ids;
  }, [packs, editingPack]);

  // Chunk tour packages into columns with 5 per column for display (upload & edit)
  const tourPackagesInColumns = useMemo(() => {
    const chunks: TourPackage[][] = [];
    for (let i = 0; i < tourPackages.length; i += 5) {
      chunks.push(tourPackages.slice(i, i + 5));
    }
    return chunks;
  }, [tourPackages]);

  // Carousel helpers
  const updateCarouselButtons = () => {
    const el = packsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollCarousel = (direction: "left" | "right") => {
    const el = packsContainerRef.current;
    if (!el) return;
    const scrollAmount = Math.floor(el.clientWidth * 0.8);
    const target = direction === "left" ? -scrollAmount : scrollAmount;
    el.scrollBy({ left: target, behavior: "smooth" });
  };

  useEffect(() => {
    updateCarouselButtons();
    const el = packsContainerRef.current;
    if (!el) return;
    const onScroll = () => updateCarouselButtons();
    window.addEventListener("resize", updateCarouselButtons);
    el.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("resize", updateCarouselButtons);
      el.removeEventListener("scroll", onScroll);
    };
  }, [packs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Pre-departure Packs
          </h2>
          <p className="text-muted-foreground">
            Manage pre-departure pack files for tour packages
          </p>
        </div>
        <TooltipProvider>
          <div className="flex items-center gap-3 bg-muted/50 px-4 py-3 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="automatic-sends"
                className="text-sm font-medium cursor-pointer"
              >
                Automatic Sends
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    When enabled, booking confirmation emails with pre-departure
                    packs will be sent automatically upon payment completion.
                    When disabled, emails must be sent manually from the
                    Confirmed Bookings tab.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              id="automatic-sends"
              checked={automaticSends}
              onCheckedChange={handleAutomaticSendsToggle}
              disabled={updatingConfig}
            />
          </div>
        </TooltipProvider>
      </div>

      {/* Upload Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 bg-background">
          <DialogHeader className="relative px-8 pt-8 pb-6 text-white rounded-t-lg overflow-hidden">
            {/* Branded gradient background using theme colors */}
            <div className="absolute inset-0 bg-gradient-to-r from-crimson-red to-light-red" />

            {/* Content with proper z-index */}
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                Upload Pre-departure Pack
              </DialogTitle>
              <DialogDescription className="text-white/90 text-lg drop-shadow-md">
                Upload a file and assign it to tour packages
              </DialogDescription>
              <div className="flex items-center gap-4 mt-4 text-white/80">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-white drop-shadow-sm" />
                  <span className="font-medium">File Management</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex overflow-hidden max-h-[calc(95vh-200px)]">
            {/* Main Content */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto h-[95%] scrollbar-hide scroll-optimized"
            >
              <div className="p-6 space-y-6">
                {/* File Upload Section */}
                <Card
                  id="section-file-upload"
                  className="bg-background border border-border scroll-mt-4 shadow-md"
                >
                  <CardHeader className="pb-2 bg-gray-300 border-b border-border py-2 overflow-hidden rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-foreground text-xl font-bold">
                      <div className="p-1 bg-crimson-red/10 rounded-full rounded-br-none">
                        <Upload className="h-3 w-3 text-crimson-red" />
                      </div>
                      File Upload
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Select a PDF, DOC, DOCX, or image file to upload
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <Label htmlFor="file" className="text-sm font-medium">
                        File
                      </Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileSelect}
                        className="mt-1"
                        disabled={creating}
                      />
                      {selectedFile && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Selected:{" "}
                          <span className="font-medium">
                            {selectedFile.name}
                          </span>{" "}
                          ({formatFileSize(selectedFile.size)})
                        </p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="description"
                        className="text-sm font-medium"
                      >
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        value={packDescription}
                        onChange={(e) => setPackDescription(e.target.value)}
                        placeholder="Add a description for this pack..."
                        className="mt-1"
                        disabled={creating}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Tour Packages Section (Checkbox List) */}
                <Card
                  id="section-tour-packages"
                  className="bg-background border border-border scroll-mt-4 shadow-md"
                >
                  <CardHeader className="pb-2 bg-gray-300 border-b border-border py-2 overflow-hidden rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-foreground text-xl font-bold">
                      <div className="p-1 bg-crimson-red/10 rounded-full rounded-br-none">
                        <Package className="h-3 w-3 text-crimson-red" />
                      </div>
                      Tour Packages
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Assign this pack to one or more tour packages
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex flex-wrap gap-6">
                      {tourPackagesInColumns.map((column, ci) => (
                        <div
                          key={ci}
                          className="flex flex-col gap-2 min-w-[180px]"
                        >
                          {column.map((tp) => {
                            const alreadyAssigned = assignedTourPackageIds.has(
                              tp.id
                            );
                            const isSelected = selectedTourPackages.some(
                              (sel) => sel.tourPackageId === tp.id
                            );
                            return (
                              <label
                                key={tp.id}
                                className={`flex items-center gap-2 text-xs px-2 py-1 rounded border ${
                                  isSelected
                                    ? "border-crimson-red bg-crimson-red/5"
                                    : "border-border"
                                } ${
                                  alreadyAssigned && !isSelected
                                    ? "opacity-50 cursor-not-allowed"
                                    : "cursor-pointer hover:bg-muted/50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={
                                    creating || (alreadyAssigned && !isSelected)
                                  }
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      removeTourPackage(tp.id);
                                    } else {
                                      if (alreadyAssigned) return;
                                      addTourPackage(tp.id);
                                    }
                                  }}
                                  className="h-3 w-3 accent-crimson-red"
                                />
                                <span className="flex-1 truncate">
                                  {tp.name}
                                  {alreadyAssigned &&
                                    !isSelected &&
                                    " (has pack)"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    {selectedTourPackages.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No tour packages selected yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section Navigator Sidebar */}
            <div className="w-48 border-l border-border/50 p-4 overflow-y-auto scrollbar-hide scroll-optimized flex flex-col">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Sections
              </h3>
              <nav className="space-y-1 flex-1">
                {sections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                        activeSection === section.id
                          ? "bg-crimson-red text-white shadow-sm"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <IconComponent
                        className={`h-3 w-3 flex-shrink-0 ${
                          activeSection === section.id
                            ? "text-white"
                            : "text-crimson-red"
                        }`}
                      />
                      <span className="text-xs font-medium truncate">
                        {section.title}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border/50 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                  className="w-full border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs py-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePack}
                  disabled={creating || !selectedFile}
                  className="w-full flex items-center gap-2 bg-crimson-red hover:bg-light-red text-white text-xs py-2"
                >
                  <Save className="h-3 w-3" />
                  {creating ? "Uploading..." : "Upload Pack"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Packs Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading...
        </div>
      ) : (
        <div className="relative group">
          {/* Left control */}
          <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollCarousel("left")}
              disabled={!canScrollLeft}
              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Scroll container */}
          <div
            ref={packsContainerRef}
            className="flex gap-3 ml-6 overflow-x-auto scrollbar-hide py-2 px-2 snap-x snap-mandatory"
            role="list"
          >
            {/* Upload Card - First */}
            <Card
              className="min-w-[220px] flex-shrink-0 p-6 flex flex-col items-center justify-center border-2 border-dashed border-red-500 hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-all snap-start"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Upload className="h-10 w-10 text-red-500 mb-3" />
              <h3 className="font-semibold text-base mb-1 text-red-600 dark:text-red-500">
                Upload Pack
              </h3>
              <p className="text-xs text-muted-foreground text-center">
                Click to upload a new pre-departure pack
              </p>
            </Card>
            {/* Existing Packs */}
            {packs.map((pack) => {
              const fileType = getFileType(pack.fileName);

              return (
                <Card
                  key={pack.id}
                  className="overflow-hidden flex flex-col min-w-[220px] flex-shrink-0 snap-start"
                  role="listitem"
                >
                  {/* File Preview */}
                  <div className="relative bg-muted/30 flex-1 flex items-center justify-center overflow-hidden">
                    {fileType === "image" ? (
                      <img
                        src={pack.fileDownloadURL}
                        alt={pack.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : fileType === "pdf" ? (
                      <iframe
                        src={`${pack.fileDownloadURL}#page=1&view=FitH`}
                        className="w-full h-full pointer-events-none"
                        title={pack.fileName}
                      />
                    ) : (
                      <FileText className="h-16 w-16 text-muted-foreground" />
                    )}

                    {/* Delete button overlay */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePack(pack)}
                      className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Card Content */}
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="font-medium line-clamp-1 text-xs">
                        {pack.fileName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(pack.size)}
                      </p>
                    </div>

                    <div>
                      <div className="flex flex-wrap gap-1">
                        {pack.tourPackages.map((tp) => (
                          <Badge
                            key={tp.tourPackageId}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tp.tourPackageName}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-[10px]"
                        onClick={() =>
                          window.open(pack.fileDownloadURL, "_blank")
                        }
                      >
                        <FileText className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] px-2"
                        onClick={() => handleEditPack(pack)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleReplaceFile(pack)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Left / Right edge gradients to indicate scrollable content */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none z-10">
              <div className="h-full w-full bg-gradient-to-r from-background to-transparent" />
            </div>
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none z-10">
              <div className="h-full w-full bg-gradient-to-l from-background to-transparent" />
            </div>
          )}

          {/* Right control */}
          <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => scrollCarousel("right")}
              disabled={!canScrollRight}
              className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Tour Packages Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tour Packages</DialogTitle>
            <DialogDescription>
              Update tour package assignments for {editingPack?.fileName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tour Packages</Label>
              <div className="flex flex-wrap gap-6 mt-1">
                {tourPackagesInColumns.map((column, ci) => (
                  <div key={ci} className="flex flex-col gap-2 min-w-[180px]">
                    {column.map((tp) => {
                      const assignedElsewhere = assignedToOtherPacksIds.has(
                        tp.id
                      );
                      const isSelected = editSelectedTourPackages.some(
                        (sel) => sel.tourPackageId === tp.id
                      );
                      return (
                        <label
                          key={tp.id}
                          className={`flex items-center gap-2 text-xs px-2 py-1 rounded border ${
                            isSelected
                              ? "border-crimson-red bg-crimson-red/5"
                              : "border-border"
                          } ${
                            assignedElsewhere && !isSelected
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={
                              updating || (assignedElsewhere && !isSelected)
                            }
                            checked={isSelected}
                            onChange={() => toggleEditTourPackage(tp.id)}
                            className="h-3 w-3 accent-crimson-red"
                          />
                          <span className="flex-1 truncate">
                            {tp.name}
                            {assignedElsewhere &&
                              !isSelected &&
                              " (other pack)"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              {editSelectedTourPackages.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No tour packages selected.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePackTourPackages} disabled={updating}>
              {updating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace File Dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace File</DialogTitle>
            <DialogDescription>
              Upload a new file to replace {replacingPack?.fileName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="replace-file">New File</Label>
              <Input
                id="replace-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                onChange={handleReplaceFileSelect}
                className="mt-1"
              />
              {replaceFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {replaceFile.name} (
                  {formatFileSize(replaceFile.size)})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplaceDialogOpen(false)}
              disabled={replacing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReplaceFile}
              disabled={replacing || !replaceFile}
            >
              {replacing ? "Replacing..." : "Replace File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
