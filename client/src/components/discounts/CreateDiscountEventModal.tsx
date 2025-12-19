"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
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
import {
  DiscountEventsService,
  type DiscountEvent,
  type DiscountEventItem,
} from "@/services/discount-events-service";
import type { TourPackage } from "@/types/tours";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Upload,
  X,
  FileText,
  Package,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  validateImageFile,
  createBlobUrl,
  revokeBlobUrl,
} from "@/utils/blob-image";
import DateTimePicker from "@/components/DateTimePicker";

interface CreateDiscountEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  tours: TourPackage[];
  onSave: () => void;
}

export default function CreateDiscountEventModal({
  isOpen,
  onClose,
  tours,
  onSave,
}: CreateDiscountEventModalProps) {
  const { toast } = useToast();

  // Sections for navigation
  const sections = [
    { id: "banner-cover", title: "Banner Cover", icon: ImageIcon },
    { id: "event-details", title: "Event Details", icon: FileText },
    { id: "tour-packages", title: "Tour Packages", icon: Package },
  ];

  // Navigation state
  const [activeSection, setActiveSection] = useState("banner-cover");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Draft event state
  const [eventName, setEventName] = useState("");
  const [eventActive, setEventActive] = useState(true);
  const [activationMode, setActivationMode] = useState<"manual" | "scheduled">("manual");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [draftItems, setDraftItems] = useState<DiscountEventItem[]>([]);

  // Banner cover state
  const [uploadedBanner, setUploadedBanner] = useState<string | null>(null);
  const [bannerBlob, setBannerBlob] = useState<File | null>(null);
  const [useBannerUrl, setUseBannerUrl] = useState(false);
  const [bannerImageUrl, setBannerImageUrl] = useState("");

  // Date discount rate state: Map<itemIndex, Map<dateString, discountRate>>
  const [dateDiscountRates, setDateDiscountRates] = useState<
    Map<number, Map<string, number>>
  >(new Map());

  // Apply discount checkbox state: Map<itemIndex, Set<dateString>>
  const [applyDiscountChecked, setApplyDiscountChecked] = useState<
    Map<number, Set<string>>
  >(new Map());

  // Bulk rate input state: Map<itemIndex, rateValue>
  const [bulkRates, setBulkRates] = useState<Map<number, string>>(new Map());

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Global apply state
  const [globalDiscountValue, setGlobalDiscountValue] = useState<string>("300");
  const [globalDiscountType, setGlobalDiscountType] = useState<"percent" | "amount">("amount");
  const [globalDiscountYear, setGlobalDiscountYear] = useState<string>("2026");

  // Tour package deletion confirmation
  const [deleteTourDialogOpen, setDeleteTourDialogOpen] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<number | null>(null);

  // Collapsible state for each tour package
  const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(false);

  const tourOptions = useMemo(
    () =>
      tours.map((t) => ({
        id: t.id,
        name: t.name,
        originalCost: t.pricing?.original ?? 0,
        dates: (t.travelDates || [])
          .filter((d) => d.isAvailable)
          .map((d) => {
            // Convert Timestamp to ISO string
            if (typeof d.startDate === "string") {
              return d.startDate;
            } else if (typeof d.startDate?.toDate === "function") {
              return d.startDate.toDate().toISOString().split("T")[0];
            } else if (d.startDate instanceof Date) {
              return d.startDate.toISOString().split("T")[0];
            }
            return "";
          })
          .filter(Boolean),
      })),
    [tours]
  );

  const filteredTourOptions = useMemo(() => {
    if (!searchQuery.trim()) return tourOptions;
    const query = searchQuery.toLowerCase();
    return tourOptions.filter((t) => t.name.toLowerCase().includes(query));
  }, [tourOptions, searchQuery]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Scroll tracking for active section
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const sections =
        scrollContainerRef.current.querySelectorAll('[id^="section-"]');
      if (sections.length === 0) return;

      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const containerRect = container.getBoundingClientRect();
      const headerHeight = 120;

      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      const isAtTop = scrollTop < 10;

      let mostVisibleSection = "";
      let maxVisibleArea = 0;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();

        if (isAtBottom && index === sections.length - 1) {
          mostVisibleSection = section.id.replace("section-", "");
          maxVisibleArea = 1000;
          return;
        }

        if (isAtTop && index === 0) {
          mostVisibleSection = section.id.replace("section-", "");
          maxVisibleArea = 1000;
          return;
        }

        const visibleTop = Math.max(rect.top, containerRect.top + headerHeight);
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
      scrollContainer.addEventListener("wheel", handleScroll);
      setTimeout(handleScroll, 100);

      return () => {
        scrollContainer.removeEventListener("scroll", handleScroll);
        scrollContainer.removeEventListener("wheel", handleScroll);
      };
    }
  }, [isOpen, activeSection]);

  function scrollToSection(sectionId: string) {
    const element = document.getElementById(`section-${sectionId}`);
    if (element && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elementTop = element.offsetTop;
      container.scrollTo({
        top: elementTop - 16,
        behavior: "smooth",
      });
    }
  }

  function resetForm() {
    setEventName("");
    setEventActive(true);
    setActivationMode("manual");
    setScheduledStart("");
    setScheduledEnd("");
    setDraftItems([]);
    setCollapsedItems(new Set());
    setDateDiscountRates(new Map());
    setApplyDiscountChecked(new Map());
    setSearchQuery("");
    setGlobalDiscountValue("300");
    setGlobalDiscountType("amount");
    setGlobalDiscountYear("2026");
    // Reset banner cover
    if (uploadedBanner?.startsWith("blob:")) {
      revokeBlobUrl(uploadedBanner);
    }
    setUploadedBanner(null);
    setBannerBlob(null);
    setUseBannerUrl(false);
    setBannerImageUrl("");
  }

  function addDraftItem() {
    const newIndex = draftItems.length;
    setDraftItems((prev) => [
      ...prev,
      {
        tourPackageId: "",
        tourPackageName: "",
        originalCost: 0,
        dateDiscounts: [],
      },
    ]);
    setDateDiscountRates((prev) => {
      const next = new Map(prev);
      next.set(newIndex, new Map());
      return next;
    });
    setApplyDiscountChecked((prev) => {
      const next = new Map(prev);
      next.set(newIndex, new Set<string>());
      return next;
    });
    setSearchQuery("");
  }

  function updateDraftItem(index: number, patch: Partial<DiscountEventItem>) {
    setDraftItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  function updateDraftItemTour(index: number, tourId: string) {
    const found = tourOptions.find((t) => t.id === tourId);
    if (!found) return;
    updateDraftItem(index, {
      tourPackageId: found.id,
      tourPackageName: found.name,
      originalCost: found.originalCost,
      dateDiscounts: [],
    });
    setDateDiscountRates((prev) => {
      const next = new Map(prev);
      next.set(index, new Map());
      return next;
    });
    setApplyDiscountChecked((prev) => {
      const next = new Map(prev);
      next.set(index, new Set<string>());
      return next;
    });
    setSearchQuery("");
  }

  function calcDiscounted(original: number, rate: number) {
    const n = Number.isFinite(original) ? original : 0;
    const r = Number.isFinite(rate) ? rate : 0;
    const v = n * (1 - r / 100);
    return Math.max(0, Math.round(v * 100) / 100);
  }

  function calcDiscountedByType(
    original: number,
    value: number,
    type: "percent" | "amount"
  ) {
    const n = Number.isFinite(original) ? original : 0;
    const v = Number.isFinite(value) ? value : 0;
    if (type === "amount") {
      return Math.max(0, Math.round((n - v) * 100) / 100);
    }
    return calcDiscounted(n, v);
  }

  function updateDateDiscountRate(
    itemIndex: number,
    dateStr: string,
    rateStr: string
  ) {
    const rate = Number(rateStr) || 0;
    setDateDiscountRates((prev) => {
      const next = new Map(prev);
      const itemRates = next.get(itemIndex) || new Map();
      itemRates.set(dateStr, rate);
      next.set(itemIndex, itemRates);
      return next;
    });
  }

  function toggleDateSelection(index: number, dateStr: string) {
    const item = draftItems[index];
    const currentDiscounts = item.dateDiscounts || [];
    const existingIndex = currentDiscounts.findIndex(
      (dd) => dd.date === dateStr
    );

    if (existingIndex >= 0) {
      const newDiscounts = currentDiscounts.filter((dd) => dd.date !== dateStr);
      updateDraftItem(index, { dateDiscounts: newDiscounts });
    } else {
      const rate = dateDiscountRates.get(index)?.get(dateStr) || 0;
      const original = item.originalCost || 0;
      const discountedCost = calcDiscounted(original, rate);
      const newDiscounts = [
        ...currentDiscounts,
        { date: dateStr, discountRate: rate, discountedCost },
      ];
      updateDraftItem(index, { dateDiscounts: newDiscounts });
    }
  }

  function getAvailableDatesForTour(tourId: string): string[] {
    const tour = tourOptions.find((t) => t.id === tourId);
    return tour?.dates || [];
  }

  function applyGlobalDiscountToAllTours() {
    const valueNum = Number(globalDiscountValue) || 0;
    if (valueNum <= 0) {
      toast({
        title: "Enter a discount",
        description: "Value must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    const targetYear = Number(globalDiscountYear) || new Date().getFullYear();
    const workingItems = [...draftItems];

    tourOptions.forEach((tour) => {
      const yearDates = (tour.dates || []).filter((d) => {
        const yr = new Date(d).getFullYear();
        return yr === targetYear;
      });
      if (yearDates.length === 0) return;

      let idx = workingItems.findIndex((it) => it.tourPackageId === tour.id);
      if (idx === -1) {
        idx = workingItems.length;
        workingItems.push({
          tourPackageId: tour.id,
          tourPackageName: tour.name,
          originalCost: tour.originalCost,
          dateDiscounts: [],
        });
      }

      const rate =
        globalDiscountType === "amount"
          ? Math.min(
              100,
              Math.round(((valueNum / Math.max(tour.originalCost || 1, 1)) * 100 + Number.EPSILON) * 100) /
                100
            )
          : valueNum;

      const discountedCost =
        globalDiscountType === "amount"
          ? calcDiscountedByType(tour.originalCost, valueNum, "amount")
          : calcDiscounted(tour.originalCost, rate);

      const preservedOtherYears = (workingItems[idx].dateDiscounts || []).filter(
        (dd) => new Date(dd.date).getFullYear() !== targetYear
      );

      const newDiscounts = [
        ...preservedOtherYears,
        ...yearDates.map((dateStr) => ({
          date: dateStr,
          discountRate: rate,
          discountedCost,
        })),
      ];

      workingItems[idx] = {
        ...workingItems[idx],
        tourPackageId: tour.id,
        tourPackageName: tour.name,
        originalCost: tour.originalCost,
        dateDiscounts: newDiscounts,
      };
    });

    const rebuiltRates = new Map<number, Map<string, number>>();
    const rebuiltChecked = new Map<number, Set<string>>();

    workingItems.forEach((item, idx) => {
      const rates = new Map<string, number>();
      const checked = new Set<string>();
      (item.dateDiscounts || []).forEach((dd) => {
        rates.set(dd.date, dd.discountRate);
        checked.add(dd.date);
      });
      rebuiltRates.set(idx, rates);
      rebuiltChecked.set(idx, checked);
    });

    setDraftItems(workingItems);
    setDateDiscountRates(rebuiltRates);
    setApplyDiscountChecked(rebuiltChecked);

    toast({
      title: "Discount applied",
      description: `Applied ${
        globalDiscountType === "amount" ? `£${valueNum}` : `${valueNum}%`
      } to ${targetYear} dates for available tours`,
    });
  }

  function confirmRemoveTourPackage(index: number) {
    setTourToDelete(index);
    setDeleteTourDialogOpen(true);
  }

  function removeDraftItem(index: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    setDateDiscountRates((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
    setApplyDiscountChecked((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
    setDeleteTourDialogOpen(false);
    setTourToDelete(null);
    toast({ title: "Tour package removed" });
  }

  function toggleCollapse(index: number) {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  // Banner cover upload handler
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateImageFile(file);

    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setBannerBlob(file);
    const blobUrl = createBlobUrl(file);
    setUploadedBanner(blobUrl);

    toast({
      title: "Banner image selected",
      description: "Image ready for upload",
    });
  };

  // Remove banner image
  const removeBannerImage = () => {
    if (uploadedBanner?.startsWith("blob:")) {
      revokeBlobUrl(uploadedBanner);
    }
    setUploadedBanner(null);
    setBannerBlob(null);
    setBannerImageUrl("");
  };

  // Handle banner image URL input
  const handleBannerImageUrlChange = (url: string) => {
    setBannerImageUrl(url);
    if (url.trim()) {
      setUploadedBanner(url);
      setBannerBlob(null);
    } else {
      setUploadedBanner(null);
    }
  };

  // Handle toggle between upload and URL
  const handleBannerToggle = (useUrl: boolean) => {
    setUseBannerUrl(useUrl);
    if (useUrl) {
      if (bannerImageUrl.trim()) {
        setUploadedBanner(bannerImageUrl);
      } else {
        setUploadedBanner(null);
      }
      setBannerBlob(null);
    } else {
      setBannerImageUrl("");
      if (!bannerBlob) {
        setUploadedBanner(null);
      }
    }
  };

  async function saveEvent() {
    try {
      if (!eventName.trim()) {
        toast({ title: "Event name required", variant: "destructive" });
        return;
      }
      if (draftItems.length === 0) {
        toast({ title: "Add at least one tour", variant: "destructive" });
        return;
      }
      for (const it of draftItems) {
        if (!it.tourPackageId)
          throw new Error("Each item must select a tour package");
        if (!it.dateDiscounts || it.dateDiscounts.length === 0)
          throw new Error("Each item must include at least one tour date");
      }

      // Validate banner URL if using URL mode
      if (useBannerUrl && bannerImageUrl.trim()) {
        try {
          new URL(bannerImageUrl.trim());
        } catch (error) {
          toast({
            title: "Invalid Image URL",
            description: "Please enter a valid image URL",
            variant: "destructive",
          });
          return;
        }
      }

      if (activationMode === "scheduled") {
        if (!scheduledStart) {
          toast({
            title: "Start time required",
            description: "Provide when the event should start",
            variant: "destructive",
          });
          return;
        }
        if (scheduledEnd && new Date(scheduledEnd) < new Date(scheduledStart)) {
          toast({
            title: "Invalid window",
            description: "End must be after start",
            variant: "destructive",
          });
          return;
        }
      }

      setLoading(true);

      // First create the event without the blob image
      const bannerCover = (() => {
        if (useBannerUrl && bannerImageUrl.trim()) {
          return bannerImageUrl.trim();
        } else if (uploadedBanner && !uploadedBanner.startsWith("blob:")) {
          return uploadedBanner;
        }
        return "";
      })();

      const eventId = await DiscountEventsService.create({
        name: eventName.trim(),
        active: activationMode === "scheduled" ? true : eventActive,
        items: draftItems,
        bannerCover,
        activationMode,
        scheduledStart,
        scheduledEnd,
        discountType: globalDiscountType,
      });

      // If we have a blob to upload and event creation was successful
      if (bannerBlob && eventId && !useBannerUrl) {
        toast({
          title: "Event created",
          description: "Now uploading banner image...",
        });

        try {
          const { uploadDiscountEventBanner } = await import(
            "@/utils/file-upload"
          );
          const uploadResult = await uploadDiscountEventBanner(
            bannerBlob,
            eventId
          );

          if (uploadResult.success && uploadResult.data?.publicUrl) {
            // Update the event with the real image URL
            await DiscountEventsService.update(eventId, {
              bannerCover: uploadResult.data.publicUrl,
            });

            toast({
              title: "Success",
              description: "Event created and banner uploaded successfully!",
            });
          } else {
            toast({
              title: "Partial Success",
              description: "Event created but banner upload failed.",
              variant: "destructive",
            });
          }
        } catch (uploadError) {
          console.error("Failed to upload banner:", uploadError);
          toast({
            title: "Partial Success",
            description: "Event created but banner upload failed.",
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Event created successfully" });
      }

      onSave();
      handleClose();
    } catch (e: any) {
      toast({
        title: "Failed to save",
        description: e?.message || "Unable to save event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="relative px-8 pt-8 pb-6 text-white rounded-t-lg overflow-hidden">
            {/* Blurred Background Image */}
            {(uploadedBanner || bannerImageUrl) && (
              <div className="absolute inset-0 z-0">
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
                  style={{
                    backgroundImage: `url(${uploadedBanner || bannerImageUrl})`,
                    filter: "blur(20px)",
                  }}
                />
                <div className="absolute inset-0 bg-black/60" />
              </div>
            )}

            {/* Fallback gradient background when no banner image */}
            {!uploadedBanner && !bannerImageUrl && (
              <div className="absolute inset-0 bg-gradient-to-r from-crimson-red to-light-red" />
            )}

            {/* Content with proper z-index */}
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                Create Discount Event
              </DialogTitle>
              <DialogDescription className="text-white/90 text-lg drop-shadow-md">
                Define an event with selected tour packages, dates, and discount
                rates.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex overflow-hidden max-h-[calc(90vh-140px)]">
            {/* Main Content Area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto scrollbar-hide p-6"
            >
              <div className="space-y-6">
                {/* Banner Cover Section */}
                <Card
                  id="section-banner-cover"
                  className="bg-background border border-border shadow-md scroll-mt-4"
                >
                  <CardHeader className="pb-2 bg-gray-300 border-b border-border py-2 overflow-hidden rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-foreground text-xl font-bold">
                      <div className="p-1 bg-crimson-red/10 rounded-full rounded-br-none">
                        <ImageIcon className="h-3 w-3 text-crimson-red" />
                      </div>
                      Banner Cover Image
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Upload a banner image or provide an image URL for this
                      discount event
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Upload/URL Toggle and Input */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 mb-4">
                          <button
                            type="button"
                            onClick={() => handleBannerToggle(false)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              !useBannerUrl
                                ? "bg-crimson-red text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            Upload Image
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBannerToggle(true)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              useBannerUrl
                                ? "bg-crimson-red text-white"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            Use Image URL
                          </button>
                        </div>

                        {!useBannerUrl ? (
                          <div>
                            <Label
                              htmlFor="banner-upload"
                              className="cursor-pointer"
                            >
                              <div className="border-2 border-dashed border-border rounded-lg p-8 hover:border-crimson-red transition-colors text-center">
                                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-sm font-medium mb-1">
                                  Click to upload banner image
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Recommended: 800x800px, Max 5MB
                                </p>
                              </div>
                            </Label>
                            <Input
                              id="banner-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleBannerUpload}
                              className="hidden"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="banner-url">Image URL</Label>
                            <Input
                              id="banner-url"
                              type="url"
                              placeholder="https://example.com/image.jpg"
                              value={bannerImageUrl || ""}
                              onChange={(e) =>
                                handleBannerImageUrlChange(e.target.value || "")
                              }
                              className="border-2 border-border focus:border-royal-purple"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter a direct URL to an image
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Preview */}
                      <div className="flex items-center justify-center">
                        {uploadedBanner ? (
                          <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-border">
                            <img
                              src={uploadedBanner}
                              alt="Banner preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={removeBannerImage}
                              className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-48 h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                            <div className="text-center text-muted-foreground">
                              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No banner image</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Event Details Card */}
                <Card
                  id="section-event-details"
                  className="bg-background border border-border shadow-md scroll-mt-4"
                >
                  <CardHeader className="pb-2 bg-gray-300 border-b border-border py-2 overflow-hidden rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-foreground text-xl font-bold">
                      <div className="p-1 bg-crimson-red/10 rounded-full rounded-br-none">
                        <FileText className="h-3 w-3 text-crimson-red" />
                      </div>
                      Event Details
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Enter the basic information for your discount event
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventName">Event Name</Label>
                      <Input
                        id="eventName"
                        placeholder="e.g. Black Friday 2025"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="mt-4 space-y-3">
                      <Label>Activation</Label>
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="activation-manual"
                            checked={activationMode === "manual"}
                            onChange={() => setActivationMode("manual")}
                          />
                          <Label htmlFor="activation-manual" className="font-medium">
                            Manual toggle
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="activation-scheduled"
                            checked={activationMode === "scheduled"}
                            onChange={() => setActivationMode("scheduled")}
                          />
                          <Label htmlFor="activation-scheduled" className="font-medium">
                            Scheduled window
                          </Label>
                        </div>
                      </div>
                      {activationMode === "manual" ? (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={eventActive}
                            onCheckedChange={setEventActive}
                          />
                          <span className="text-sm text-muted-foreground">
                            Toggle to activate immediately
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Start</Label>
                            <DateTimePicker
                              value={scheduledStart}
                              onChange={setScheduledStart}
                              label="Start date & time"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End</Label>
                            <DateTimePicker
                              value={scheduledEnd}
                              onChange={setScheduledEnd}
                              label="End date & time"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground md:col-span-2">
                            Scheduled events auto-activate during the window; manual toggles are disabled.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tour Packages Card */}
                <Card
                  id="section-tour-packages"
                  className="bg-background border border-border shadow-md scroll-mt-4"
                >
                  <CardHeader className="pb-2 bg-gray-300 border-b border-border py-2 overflow-hidden rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-foreground text-xl font-bold">
                      <div className="p-1 bg-crimson-red/10 rounded-full rounded-br-none">
                        <Package className="h-3 w-3 text-crimson-red" />
                      </div>
                      Tour Packages
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Add tour packages with their discount dates and rates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="mb-6 border rounded-md p-4 bg-muted/30 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-end gap-3">
                        <div className="flex-1 space-y-2">
                          <Label>Discount type</Label>
                          <Select
                            value={globalDiscountType}
                            onValueChange={(v) =>
                              setGlobalDiscountType(v as "percent" | "amount")
                            }
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amount">Flat amount</SelectItem>
                              <SelectItem value="percent">Percent (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label>Discount value</Label>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={globalDiscountValue}
                            onChange={(e) => setGlobalDiscountValue(e.target.value)}
                            placeholder="e.g. 300"
                            className="h-10"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label>Year (filter dates)</Label>
                          <Input
                            type="number"
                            value={globalDiscountYear}
                            onChange={(e) => setGlobalDiscountYear(e.target.value)}
                            className="h-10"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={applyGlobalDiscountToAllTours}
                          className="h-10"
                        >
                          Apply to all tours
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Quickly add/update all tours that have dates in the selected year. Flat amount is converted per tour so the discounted cost reflects the amount off.
                      </p>
                    </div>
                    {/* Tour Items */}
                    {draftItems.length > 0 && (
                      <div className="space-y-4">
                        {draftItems.map((item, idx) => {
                          const isCollapsed = collapsedItems.has(idx);
                          return (
                            <Card key={idx} className="relative">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-3 right-3 z-10"
                                onClick={() => confirmRemoveTourPackage(idx)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>

                              {/* Collapsible Header */}
                              <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleCollapse(idx)}
                              >
                                <div className="flex items-center gap-3 flex-1 pr-12">
                                  <div className="flex-shrink-0">
                                    {isCollapsed ? (
                                      <ChevronDown className="h-5 w-5" />
                                    ) : (
                                      <ChevronUp className="h-5 w-5" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-semibold">
                                      {item.tourPackageName ||
                                        `Tour Package ${idx + 1}`}
                                    </div>
                                    {item.tourPackageName && (
                                      <div className="text-sm text-muted-foreground">
                                        <span>
                                          £{item.originalCost} •{" "}
                                          {item.dateDiscounts?.length || 0} date
                                          {(item.dateDiscounts?.length || 0) !==
                                          1
                                            ? "s"
                                            : ""}{" "}
                                          with discounts
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Collapsible Content */}
                              {!isCollapsed && (
                                <CardContent className="pt-0 pb-6 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Tour Package</Label>
                                      <Select
                                        value={item.tourPackageId}
                                        onValueChange={(v) =>
                                          updateDraftItemTour(idx, v)
                                        }
                                      >
                                        <SelectTrigger className="h-11">
                                          <SelectValue placeholder="Select tour package" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-80">
                                          <div className="sticky top-0 z-10 bg-background p-2 border-b">
                                            <Input
                                              type="text"
                                              placeholder="Search tour packages..."
                                              value={searchQuery}
                                              onChange={(e) =>
                                                setSearchQuery(e.target.value)
                                              }
                                              className="h-9"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            />
                                          </div>
                                          <div className="max-h-60 overflow-y-auto">
                                            {filteredTourOptions.length ===
                                            0 ? (
                                              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                                No tour packages found
                                              </div>
                                            ) : (
                                              filteredTourOptions.map((t) => (
                                                <SelectItem
                                                  key={t.id}
                                                  value={t.id}
                                                >
                                                  {t.name}
                                                </SelectItem>
                                              ))
                                            )}
                                          </div>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Original Cost (£)</Label>
                                      <Input
                                        type="number"
                                        value={item.originalCost || ""}
                                        placeholder="0.00"
                                        readOnly
                                        className="h-11 bg-muted"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <Label>Tour Dates</Label>
                                      {item.tourPackageId &&
                                        getAvailableDatesForTour(
                                          item.tourPackageId
                                        ).length > 0 && (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="number"
                                              min={0}
                                              max={100}
                                              step={1}
                                              placeholder="Rate %"
                                              className="h-8 w-20 text-sm"
                                              id={`bulk-rate-${idx}`}
                                              value={bulkRates.get(idx) || ""}
                                              onChange={(e) => {
                                                const next = new Map(bulkRates);
                                                next.set(idx, e.target.value);
                                                setBulkRates(next);
                                              }}
                                            />
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              disabled={
                                                !bulkRates.get(idx) ||
                                                bulkRates.get(idx) === "" ||
                                                Number(bulkRates.get(idx)) ===
                                                  0 ||
                                                (applyDiscountChecked.get(idx)
                                                  ?.size || 0) === 0
                                              }
                                              onClick={() => {
                                                const input =
                                                  document.getElementById(
                                                    `bulk-rate-${idx}`
                                                  ) as HTMLInputElement;
                                                const rate =
                                                  Number(input?.value) || 0;
                                                if (rate < 0 || rate > 100) {
                                                  toast({
                                                    title: "Invalid rate",
                                                    description:
                                                      "Rate must be between 0-100%",
                                                    variant: "destructive",
                                                  });
                                                  return;
                                                }
                                                const checkedDates = Array.from(
                                                  applyDiscountChecked.get(
                                                    idx
                                                  ) || new Set()
                                                );
                                                if (checkedDates.length === 0) {
                                                  toast({
                                                    title: "No dates marked",
                                                    description:
                                                      "Check 'Apply discount' on dates first",
                                                    variant: "destructive",
                                                  });
                                                  return;
                                                }
                                                const newDiscounts = (
                                                  item.dateDiscounts || []
                                                ).map((dd) =>
                                                  checkedDates.includes(dd.date)
                                                    ? {
                                                        ...dd,
                                                        discountRate: rate,
                                                        discountedCost:
                                                          calcDiscounted(
                                                            item.originalCost,
                                                            rate
                                                          ),
                                                      }
                                                    : dd
                                                );
                                                updateDraftItem(idx, {
                                                  dateDiscounts: newDiscounts,
                                                });
                                                setDateDiscountRates((prev) => {
                                                  const next = new Map(prev);
                                                  const itemRates =
                                                    next.get(idx) || new Map();
                                                  checkedDates.forEach((date) =>
                                                    itemRates.set(date, rate)
                                                  );
                                                  next.set(idx, itemRates);
                                                  return next;
                                                });
                                                toast({
                                                  title: "Rates applied",
                                                  description: `${rate}% applied to ${
                                                    checkedDates.length
                                                  } date${
                                                    checkedDates.length !== 1
                                                      ? "s"
                                                      : ""
                                                  }`,
                                                });
                                              }}
                                            >
                                              Apply to Selected (
                                              {applyDiscountChecked.get(idx)
                                                ?.size || 0}
                                              )
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              disabled={
                                                !bulkRates.get(idx) ||
                                                bulkRates.get(idx) === "" ||
                                                Number(bulkRates.get(idx)) === 0
                                              }
                                              onClick={() => {
                                                const input =
                                                  document.getElementById(
                                                    `bulk-rate-${idx}`
                                                  ) as HTMLInputElement;
                                                const rate =
                                                  Number(input?.value) || 0;
                                                if (rate < 0 || rate > 100) {
                                                  toast({
                                                    title: "Invalid rate",
                                                    description:
                                                      "Rate must be between 0-100%",
                                                    variant: "destructive",
                                                  });
                                                  return;
                                                }
                                                const toggledOnDates = (
                                                  item.dateDiscounts || []
                                                ).map((dd) => dd.date);
                                                if (
                                                  toggledOnDates.length === 0
                                                ) {
                                                  toast({
                                                    title: "No dates toggled",
                                                    description:
                                                      "Toggle dates ON first",
                                                    variant: "destructive",
                                                  });
                                                  return;
                                                }
                                                const newDiscounts = (
                                                  item.dateDiscounts || []
                                                ).map((dd) => ({
                                                  ...dd,
                                                  discountRate: rate,
                                                  discountedCost:
                                                    calcDiscounted(
                                                      item.originalCost,
                                                      rate
                                                    ),
                                                }));
                                                updateDraftItem(idx, {
                                                  dateDiscounts: newDiscounts,
                                                });
                                                setDateDiscountRates((prev) => {
                                                  const next = new Map(prev);
                                                  const itemRates =
                                                    next.get(idx) || new Map();
                                                  toggledOnDates.forEach(
                                                    (date) =>
                                                      itemRates.set(date, rate)
                                                  );
                                                  next.set(idx, itemRates);
                                                  return next;
                                                });
                                                setApplyDiscountChecked(
                                                  (prev) => {
                                                    const next = new Map(prev);
                                                    const itemChecked =
                                                      new Set<string>(
                                                        toggledOnDates
                                                      );
                                                    next.set(idx, itemChecked);
                                                    return next;
                                                  }
                                                );
                                                toast({
                                                  title: "Rates applied",
                                                  description: `${rate}% applied to ${
                                                    toggledOnDates.length
                                                  } date${
                                                    toggledOnDates.length !== 1
                                                      ? "s"
                                                      : ""
                                                  }`,
                                                });
                                              }}
                                            >
                                              Apply to All
                                            </Button>
                                          </div>
                                        )}
                                    </div>
                                    {!item.tourPackageId ? (
                                      <div className="text-sm text-muted-foreground italic p-4 border rounded-md bg-muted/30">
                                        Select a tour package first to view
                                        available dates
                                      </div>
                                    ) : (
                                      (() => {
                                        const availableDates =
                                          getAvailableDatesForTour(
                                            item.tourPackageId
                                          );
                                        if (availableDates.length === 0) {
                                          return (
                                            <div className="text-sm text-amber-600 p-4 border border-amber-200 rounded-md bg-amber-50 space-y-3">
                                              <div>
                                                <strong>
                                                  No dates available.
                                                </strong>{" "}
                                                Please add tour dates in the
                                                Tour Packages page first.
                                              </div>
                                              <Link
                                                href={`/tours?tab=packages&tourId=${item.tourPackageId}&mode=edit`}
                                                className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2"
                                              >
                                                Add dates to{" "}
                                                {item.tourPackageName} →
                                              </Link>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div className="space-y-3 border rounded-md p-4 max-h-96 overflow-y-auto">
                                            {availableDates.map((dateStr) => {
                                              const isSelected = (
                                                item.dateDiscounts || []
                                              ).some(
                                                (dd) => dd.date === dateStr
                                              );
                                              const currentRate =
                                                dateDiscountRates
                                                  .get(idx)
                                                  ?.get(dateStr) || 0;
                                              const discountedCost =
                                                globalDiscountType === "amount"
                                                  ? calcDiscountedByType(
                                                      item.originalCost,
                                                      Math.round((item.originalCost * currentRate) / 100),
                                                      "amount"
                                                    )
                                                  : calcDiscounted(
                                                      item.originalCost,
                                                      currentRate
                                                    );
                                              const isCheckedForBulk =
                                                applyDiscountChecked
                                                  .get(idx)
                                                  ?.has(dateStr) || false;

                                              return (
                                                <div
                                                  key={dateStr}
                                                  className={`flex items-center gap-3 p-3 border rounded-md transition-all ${
                                                    isSelected
                                                      ? "bg-background hover:shadow-sm"
                                                      : "bg-muted/30 opacity-60"
                                                  }`}
                                                >
                                                  {/* Active/Inactive toggle with check icon */}
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      toggleDateSelection(
                                                        idx,
                                                        dateStr
                                                      )
                                                    }
                                                    className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                                                      isSelected
                                                        ? "bg-crimson-red border-crimson-red text-white"
                                                        : "border-gray-300 bg-white text-transparent hover:border-crimson-red/50"
                                                    }`}
                                                  >
                                                    <Check className="h-4 w-4" />
                                                  </button>

                                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="flex-1 min-w-0">
                                                      <div className="text-sm font-medium">
                                                        {new Date(
                                                          dateStr
                                                        ).toLocaleDateString(
                                                          "en-US",
                                                          {
                                                            weekday: "short",
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                          }
                                                        )}
                                                      </div>
                                                      {isSelected &&
                                                        currentRate > 0 && (
                                                          <div className="text-xs text-muted-foreground mt-0.5">
                                                            <span className="line-through">
                                                              £
                                                              {
                                                                item.originalCost
                                                              }
                                                            </span>
                                                            {" → "}
                                                            <span className="font-semibold text-green-600">
                                                              £{discountedCost}
                                                            </span>
                                                          </div>
                                                        )}
                                                    </div>
                                                  </div>
                                                  {isSelected && (
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                      {globalDiscountType === "amount" ? (
                                                        <>
                                                          <span className="text-sm text-muted-foreground">£</span>
                                                          <Input
                                                            type="number"
                                                            min={0}
                                                            step={1}
                                                            value={
                                                              Math.round((item.originalCost * currentRate) / 100) || ""
                                                            }
                                                            placeholder="0"
                                                            onChange={(e) => {
                                                              const flatAmount = Number(e.target.value) || 0;
                                                              const percentEquivalent = item.originalCost > 0 ? (flatAmount / item.originalCost) * 100 : 0;
                                                              updateDateDiscountRate(
                                                                idx,
                                                                dateStr,
                                                                percentEquivalent.toString()
                                                              );
                                                              const newDiscounts = (
                                                                item.dateDiscounts ||
                                                                []
                                                              ).map((dd) =>
                                                                dd.date === dateStr
                                                                  ? {
                                                                      ...dd,
                                                                      discountRate: percentEquivalent,
                                                                      discountedCost:
                                                                        calcDiscounted(
                                                                          item.originalCost,
                                                                          percentEquivalent
                                                                        ),
                                                                    }
                                                                  : dd
                                                              );
                                                              updateDraftItem(idx, {
                                                                dateDiscounts:
                                                                  newDiscounts,
                                                              });
                                                            }}
                                                            className="h-9 w-20 text-sm"
                                                          />
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            step={1}
                                                            value={
                                                              currentRate || ""
                                                            }
                                                            placeholder="0"
                                                            onChange={(e) => {
                                                              updateDateDiscountRate(
                                                                idx,
                                                                dateStr,
                                                                e.target.value
                                                              );
                                                              const newDiscounts = (
                                                                item.dateDiscounts ||
                                                                []
                                                              ).map((dd) =>
                                                                dd.date === dateStr
                                                                  ? {
                                                                      ...dd,
                                                                      discountRate:
                                                                        Number(
                                                                          e.target
                                                                            .value
                                                                        ) || 0,
                                                                      discountedCost:
                                                                        calcDiscounted(
                                                                          item.originalCost,
                                                                          Number(
                                                                            e.target
                                                                              .value
                                                                          ) || 0
                                                                        ),
                                                                    }
                                                                  : dd
                                                              );
                                                              updateDraftItem(idx, {
                                                                dateDiscounts:
                                                                  newDiscounts,
                                                              });
                                                            }}
                                                            className="h-9 w-20 text-sm"
                                                          />
                                                          <span className="text-sm text-muted-foreground">
                                                            %
                                                          </span>
                                                        </>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()
                                    )}
                                    {item.tourPackageId &&
                                      (item.dateDiscounts?.length || 0) > 0 && (
                                        <div className="text-sm text-muted-foreground">
                                          {item.dateDiscounts?.length || 0} date
                                          {(item.dateDiscounts?.length || 0) !==
                                          1
                                            ? "s"
                                            : ""}{" "}
                                          active
                                        </div>
                                      )}
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Tour Package Card */}
                    <Card
                      onClick={addDraftItem}
                      className="group border-2 border-dashed border-crimson-red/30 hover:border-crimson-red/50 hover:bg-crimson-red/5 transition-all duration-300 cursor-pointer mt-4"
                    >
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-center justify-center">
                          <div className="p-2 bg-crimson-red/10 rounded-full rounded-br-none">
                            <Plus className="h-5 w-5 text-crimson-red" />
                          </div>
                        </div>
                        <h3 className="font-bold text-lg text-crimson-red text-center mt-2">
                          Add Tour Package
                        </h3>
                        <CardDescription className="text-sm text-center text-muted-foreground">
                          Click to add a tour package to this discount event
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Sidebar Navigation */}
            <div className="w-48 border-l border-border bg-muted/30 flex flex-col overflow-hidden">
              {/* Section Navigation */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                        activeSection === section.id
                          ? "bg-crimson-red text-white"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <section.icon className="h-4 w-4" />
                      {section.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="w-full"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEvent}
                  disabled={
                    loading || !eventName.trim() || draftItems.length === 0
                  }
                  className="w-full"
                  size="sm"
                >
                  Save Event
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Tour Package Confirmation Dialog */}
      <AlertDialog
        open={deleteTourDialogOpen}
        onOpenChange={setDeleteTourDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tour Package?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">
                "
                {tourToDelete !== null &&
                draftItems[tourToDelete]?.tourPackageName
                  ? draftItems[tourToDelete].tourPackageName
                  : "this tour package"}
                "
              </span>{" "}
              from the event? All dates associated with this package will also
              be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTourToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                tourToDelete !== null && removeDraftItem(tourToDelete)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Package
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
