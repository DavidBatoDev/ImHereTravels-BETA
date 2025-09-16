"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  MapPin,
  Clock,
  Banknote,
  Star,
  Calendar,
  Plus,
  Minus,
  Save,
  Image as ImageIcon,
  FolderOpen,
  Upload,
  X,
  Globe,
  CreditCard,
  Package,
  Plane,
  CheckCircle,
  AlertCircle,
  Hash,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import {
  TourPackage,
  TourPackageFormData,
  TourFormDataWithStringDates,
  TravelDate,
} from "@/types/tours";
import { Timestamp } from "firebase/firestore";
import {
  createBlobUrl,
  revokeBlobUrl,
  cleanupBlobUrls,
  uploadAllBlobsToStorage,
  generateImagePreview,
  validateImageFile,
} from "@/utils/blob-image";
import { formatFileSize, generateSlug } from "@/utils";
import {
  updateTourMedia,
  cleanupRemovedGalleryImages,
} from "@/services/tours-service";
import { testSupabaseStorageConnection } from "@/utils/file-upload";

// Form validation schema
const tourFormSchema = z.object({
  name: z.string().min(3, "Tour name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tourCode: z.string().min(2, "Tour code must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(2, "Location is required"),
  duration: z.number().min(1, "Duration must be at least 1 day"),
  travelDates: z
    .array(
      z.object({
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().min(1, "End date is required"),
        isAvailable: z.boolean(),
        maxCapacity: z.number().optional(),
        currentBookings: z.number().optional(),
      })
    )
    .min(1, "At least one travel date is required"),
  pricing: z.object({
    original: z.number().min(1, "Original price must be greater than 0"),
    discounted: z.number().optional(),
    deposit: z.number().min(1, "Deposit is required"),
    currency: z.enum(["USD", "EUR", "GBP"]),
  }),
  details: z.object({
    highlights: z.array(z.string().min(1, "Highlight cannot be empty")),
    itinerary: z.array(
      z.object({
        day: z.number(),
        title: z.string().min(1, "Day title is required"),
        description: z.string().min(1, "Day description is required"),
      })
    ),
    requirements: z.array(z.string()),
  }),
  status: z.enum(["active", "draft", "archived"]),
  brochureLink: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  stripePaymentLink: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  preDeparturePack: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

type TourFormData = z.infer<typeof tourFormSchema>;

interface TourFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TourFormDataWithStringDates) => Promise<void | string>;
  tour?: TourPackage | null;
  isLoading?: boolean;
}

export default function TourForm({
  isOpen,
  onClose,
  onSubmit,
  tour,
  isLoading = false,
}: TourFormProps) {
  console.log("TourForm rendered with props:", {
    isOpen,
    tour: tour?.id,
    isLoading,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedCover, setUploadedCover] = useState<string | null>(null);
  const [uploadedGallery, setUploadedGallery] = useState<string[]>([]);
  // For new tours: store actual File objects as blobs
  const [coverBlob, setCoverBlob] = useState<File | null>(null);
  const [galleryBlobs, setGalleryBlobs] = useState<File[]>([]);
  // Track original gallery for cleanup when updating
  const [originalGallery, setOriginalGallery] = useState<string[]>([]);
  // Cover image toggle state
  const [useCoverUrl, setUseCoverUrl] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const { toast } = useToast();

  const form = useForm<TourFormData>({
    resolver: zodResolver(tourFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      url: "",
      tourCode: "",
      description: "",
      location: "",
      duration: 1,
      travelDates: [
        {
          startDate: "",
          endDate: "",
          isAvailable: true,
          maxCapacity: 0,
          currentBookings: 0,
        },
      ],
      pricing: {
        original: 0,
        discounted: 0,
        deposit: 0,
        currency: "USD",
      },
      details: {
        highlights: [""],
        itinerary: [{ day: 1, title: "", description: "" }],
        requirements: [""],
      },
      status: "draft",
      brochureLink: "",
      stripePaymentLink: "",
      preDeparturePack: "",
    },
  });

  const {
    fields: highlightFields,
    append: appendHighlight,
    remove: removeHighlight,
  } = useFieldArray({
    control: form.control,
    name: "details.highlights" as any,
  });

  const {
    fields: itineraryFields,
    append: appendItinerary,
    remove: removeItinerary,
  } = useFieldArray({
    control: form.control,
    name: "details.itinerary",
  });

  const {
    fields: requirementFields,
    append: appendRequirement,
    remove: removeRequirement,
  } = useFieldArray({
    control: form.control,
    name: "details.requirements" as any,
  });

  const {
    fields: travelDateFields,
    append: appendTravelDate,
    remove: removeTravelDate,
  } = useFieldArray({
    control: form.control,
    name: "travelDates",
  });

  // Helper function to handle null values in form fields
  const handleNullValue = (value: string | null | undefined): string => {
    return value === null || value === undefined ? "" : value;
  };

  // Reset form when tour prop changes
  useEffect(() => {
    console.log("Form reset effect triggered, tour:", tour?.id || "new tour");

    if (tour) {
      console.log("Resetting form with existing tour data:", {
        name: tour.name,
        slug: tour.slug,
        status: tour.status,
        media: tour.media,
      });

      // Convert Timestamps to string dates for form
      const travelDates = tour.travelDates?.map((td) => ({
        startDate: td.startDate?.toDate?.()?.toISOString()?.split("T")[0] || "",
        endDate: td.endDate?.toDate?.()?.toISOString()?.split("T")[0] || "",
        isAvailable: td.isAvailable,
        maxCapacity:
          td.maxCapacity === null || td.maxCapacity === undefined
            ? 0
            : td.maxCapacity,
        currentBookings:
          td.currentBookings === null || td.currentBookings === undefined
            ? 0
            : td.currentBookings,
      })) || [
        {
          startDate: "",
          endDate: "",
          isAvailable: true,
          maxCapacity: 0,
          currentBookings: 0,
        },
      ];

      form.reset({
        name: tour.name || "",
        slug: tour.slug || "",
        url: handleNullValue(tour.url),
        tourCode: handleNullValue(tour.tourCode),
        description: tour.description || "",
        location: tour.location || "",
        duration: tour.duration || 1,
        travelDates: travelDates,
        pricing: tour.pricing
          ? {
              original: tour.pricing.original || 0,
              discounted:
                tour.pricing.discounted === null ||
                tour.pricing.discounted === undefined
                  ? 0
                  : tour.pricing.discounted,
              deposit: tour.pricing.deposit || 0,
              currency: tour.pricing.currency || "USD",
            }
          : {
              original: 0,
              discounted: 0,
              deposit: 0,
              currency: "USD",
            },
        details: tour.details
          ? {
              highlights: tour.details.highlights?.filter(
                (h) => h !== null
              ) || [""],
              itinerary: tour.details.itinerary?.filter((i) => i !== null) || [
                { day: 1, title: "", description: "" },
              ],
              requirements: tour.details.requirements?.filter(
                (r) => r !== null
              ) || [""],
            }
          : {
              highlights: [""],
              itinerary: [{ day: 1, title: "", description: "" }],
              requirements: [""],
            },
        status: tour.status || "draft",
        brochureLink: handleNullValue(tour.brochureLink),
        stripePaymentLink: handleNullValue(tour.stripePaymentLink),
        preDeparturePack: handleNullValue(tour.preDeparturePack),
      });

      // Initialize uploaded images from existing tour
      setUploadedCover(tour.media?.coverImage || null);
      setUploadedGallery(tour.media?.gallery || []);
      // Store original gallery for cleanup comparison
      setOriginalGallery(tour.media?.gallery || []);
      // Clear blobs for existing tours (they use direct uploads)
      setCoverBlob(null);
      setGalleryBlobs([]);
      // Initialize cover image URL state
      setUseCoverUrl(false);
      setCoverImageUrl("");
    } else {
      console.log("Resetting form for new tour");

      form.reset({
        name: "",
        slug: "",
        url: "",
        tourCode: "",
        description: "",
        location: "",
        duration: 1,
        travelDates: [
          {
            startDate: "",
            endDate: "",
            isAvailable: true,
            maxCapacity: 0,
            currentBookings: 0,
          },
        ],
        pricing: {
          original: 0,
          discounted: 0,
          deposit: 0,
          currency: "USD",
        },
        details: {
          highlights: [""],
          itinerary: [{ day: 1, title: "", description: "" }],
          requirements: [""],
        },
        status: "draft",
        brochureLink: "",
        stripePaymentLink: "",
        preDeparturePack: "",
      });

      // Reset uploaded images for new tour
      setUploadedCover(null);
      setUploadedGallery([]);
      // Reset original gallery for new tours
      setOriginalGallery([]);
      // Reset blobs for new tours
      setCoverBlob(null);
      setGalleryBlobs([]);
      // Reset cover image URL state for new tours
      setUseCoverUrl(false);
      setCoverImageUrl("");
    }
  }, [tour, form]);

  // Auto-generate slug from name
  const watchedName = form.watch("name");
  useEffect(() => {
    if (watchedName && !tour) {
      const slug = generateSlug(watchedName);
      console.log("Auto-generating slug:", { watchedName, slug });
      form.setValue("slug", slug);
    }
  }, [watchedName, form, tour]);

  // Cover image upload handler
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Cover upload handler triggered");

    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No files selected for cover upload");
      return;
    }

    const file = files[0];
    console.log("Cover file selected:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const validation = validateImageFile(file);
    console.log("Cover file validation result:", validation);

    if (!validation.valid) {
      console.error("Cover file validation failed:", validation.error);
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Store the blob for both new and existing tours
    setCoverBlob(file);
    const blobUrl = createBlobUrl(file);
    setUploadedCover(blobUrl);

    toast({
      title: "Cover image selected",
      description: "Image ready for upload",
    });
  };

  // Gallery images upload handler
  const handleGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    const fileArray = Array.from(files);

    const validFiles: File[] = [];

    for (const file of fileArray) {
      const validation = validateImageFile(file);

      if (validation.valid) {
        validFiles.push(file);
      } else {
        console.error(
          `Gallery file validation failed for ${file.name}:`,
          validation.error
        );
        toast({
          title: "Invalid file",
          description: `${file.name}: ${validation.error}`,
          variant: "destructive",
        });
      }
    }

    if (validFiles.length === 0) return;

    // Store the blobs for both new and existing tours
    setGalleryBlobs((prev) => {
      const newBlobs = [...prev, ...validFiles];
      console.log("Updated gallery blobs count:", newBlobs.length);
      return newBlobs;
    });
    const blobUrls = validFiles.map((file) => createBlobUrl(file));
    setUploadedGallery((prev) => [...prev, ...blobUrls]);

    toast({
      title: "Gallery images selected",
      description: `${validFiles.length} image(s) ready for upload`,
    });
  };

  // Remove cover image
  const removeCoverImage = () => {
    if (uploadedCover?.startsWith("blob:")) {
      revokeBlobUrl(uploadedCover);
    }
    setUploadedCover(null);
    setCoverBlob(null);
    setCoverImageUrl("");
  };

  // Handle cover image URL input
  const handleCoverImageUrlChange = (url: string) => {
    setCoverImageUrl(url);
    if (url.trim()) {
      setUploadedCover(url);
      setCoverBlob(null); // Clear blob when using URL
    } else {
      setUploadedCover(null);
    }
  };

  // Handle toggle between upload and URL
  const handleCoverToggle = (useUrl: boolean) => {
    setUseCoverUrl(useUrl);
    if (useUrl) {
      // Switch to URL mode - clear blob and set URL if available
      if (coverImageUrl.trim()) {
        setUploadedCover(coverImageUrl);
      } else {
        setUploadedCover(null);
      }
      setCoverBlob(null);
    } else {
      // Switch to upload mode - clear URL and keep existing blob if any
      setCoverImageUrl("");
      if (!coverBlob) {
        setUploadedCover(null);
      }
    }
  };

  // Remove gallery image
  const removeGalleryImage = (index: number) => {
    const imageUrl = uploadedGallery[index];
    if (imageUrl?.startsWith("blob:")) {
      revokeBlobUrl(imageUrl);
    }

    setUploadedGallery((prev) => prev.filter((_, i) => i !== index));
    setGalleryBlobs((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleFormSubmit = async (data: TourFormDataWithStringDates) => {
    if (tour) {
      await handleUpdateTour(data);
    } else {
      return await handleCreateTour(data);
    }
  };

  // Create tour with blob upload handling
  const handleCreateTour = async (data: TourFormDataWithStringDates) => {
    try {
      // First create the tour without images
      const tourId = await onSubmit(data);

      // If we have blobs to upload and tour creation was successful
      if ((coverBlob || galleryBlobs.length > 0) && tourId && !useCoverUrl) {
        toast({
          title: "Tour created",
          description: "Now uploading images...",
        });

        // Upload all blobs to storage
        const uploadResults = await uploadAllBlobsToStorage(
          coverBlob,
          galleryBlobs,
          typeof tourId === "string" ? tourId : ""
        );

        if (uploadResults.allSuccessful) {
          // Update the tour with real image URLs
          try {
            const mediaUpdate: { coverImage?: string; gallery?: string[] } = {};

            if (
              uploadResults.coverResult?.success &&
              uploadResults.coverResult.url
            ) {
              mediaUpdate.coverImage = uploadResults.coverResult.url;
            }

            if (
              uploadResults.galleryResults &&
              uploadResults.galleryResults.length > 0
            ) {
              const galleryUrls = uploadResults.galleryResults
                .filter((result) => result.success && result.url)
                .map((result) => result.url!);

              if (galleryUrls.length > 0) {
                mediaUpdate.gallery = galleryUrls;
              }
            }

            // Update the tour document with real URLs
            if (Object.keys(mediaUpdate).length > 0) {
              await updateTourMedia(
                typeof tourId === "string" ? tourId : "",
                mediaUpdate
              );
            }
          } catch (updateError) {
            console.error(
              "Failed to update tour with image URLs:",
              updateError
            );
          }

          toast({
            title: "Success",
            description: "Tour created and all images uploaded successfully!",
          });
        } else {
          console.warn("Some images failed to upload:", uploadResults);

          // Even if some uploads failed, try to update with successful ones
          try {
            const mediaUpdate: { coverImage?: string; gallery?: string[] } = {};

            if (
              uploadResults.coverResult?.success &&
              uploadResults.coverResult.url
            ) {
              mediaUpdate.coverImage = uploadResults.coverResult.url;
            }

            if (
              uploadResults.galleryResults &&
              uploadResults.galleryResults.length > 0
            ) {
              const galleryUrls = uploadResults.galleryResults
                .filter((result) => result.success && result.url)
                .map((result) => result.url!);

              if (galleryUrls.length > 0) {
                mediaUpdate.gallery = galleryUrls;
              }
            }

            // Update the tour document with any successful URLs
            if (Object.keys(mediaUpdate).length > 0) {
              await updateTourMedia(
                typeof tourId === "string" ? tourId : "",
                mediaUpdate
              );
            }
          } catch (updateError) {
            console.error(
              "Failed to update tour with successful image URLs:",
              updateError
            );
          }

          toast({
            title: "Partial success",
            description:
              "Tour created but some images failed to upload. Check console for troubleshooting help.",
            variant: "destructive",
          });
        }

        // Cleanup blob URLs
        const allUrls = [...uploadedGallery];
        if (uploadedCover) allUrls.push(uploadedCover);
        cleanupBlobUrls(allUrls);
      } else {
        toast({
          title: "Success",
          description: "Tour created successfully!",
        });
      }
    } catch (error) {
      console.error("Error creating tour:", error);
      // If tour creation fails, cleanup blob URLs
      const allUrls = [...uploadedGallery];
      if (uploadedCover) allUrls.push(uploadedCover);
      cleanupBlobUrls(allUrls);
      throw error;
    }
  };

  // Update existing tour
  const handleUpdateTour = async (data: TourFormDataWithStringDates) => {
    console.log("Updating existing tour with data:", data);
    console.log("Blobs to upload:", {
      coverBlob: coverBlob?.name,
      galleryBlobsCount: galleryBlobs.length,
    });

    try {
      // First update the tour with the basic data
      await onSubmit(data);
      console.log("Tour updated successfully");

      // Check for gallery cleanup even if no new uploads
      const currentGallery = uploadedGallery.filter(
        (url) => !url.startsWith("blob:")
      );
      const hasGalleryChanges =
        currentGallery.length !== originalGallery.length ||
        !currentGallery.every((url) => originalGallery.includes(url));

      // If we have blobs to upload (and not using URL mode)
      if ((coverBlob || galleryBlobs.length > 0) && tour?.id && !useCoverUrl) {
        console.log("Starting image upload process for update...");

        toast({
          title: "Tour updated",
          description: "Now uploading new images...",
        });

        // Upload all blobs to storage
        const uploadResults = await uploadAllBlobsToStorage(
          coverBlob,
          galleryBlobs,
          tour.id
        );

        console.log("Upload results:", uploadResults);

        if (uploadResults.allSuccessful) {
          console.log("All uploads successful, updating tour media...");

          // Update the tour with real image URLs
          try {
            const mediaUpdate: { coverImage?: string; gallery?: string[] } = {};

            // If we uploaded a new cover image, use the new URL
            if (
              uploadResults.coverResult?.success &&
              uploadResults.coverResult.url
            ) {
              mediaUpdate.coverImage = uploadResults.coverResult.url;
              setUploadedCover(uploadResults.coverResult.url);
            }

            // If we uploaded new gallery images, append them to existing gallery
            if (
              uploadResults.galleryResults &&
              uploadResults.galleryResults.length > 0
            ) {
              const newGalleryUrls = uploadResults.galleryResults
                .filter((result) => result.success && result.url)
                .map((result) => result.url!);

              if (newGalleryUrls.length > 0) {
                // Combine existing gallery with new images
                const existingGallery = uploadedGallery.filter(
                  (url) => !url.startsWith("blob:")
                );
                const finalGallery = [...existingGallery, ...newGalleryUrls];
                mediaUpdate.gallery = finalGallery;
                setUploadedGallery(finalGallery);

                // Clean up removed images from storage
                await cleanupRemovedGalleryImages(
                  originalGallery,
                  finalGallery
                );
              }
            } else {
              // No new uploads, but check if any existing images were removed
              const currentGallery = uploadedGallery.filter(
                (url) => !url.startsWith("blob:")
              );
              if (
                currentGallery.length !== originalGallery.length ||
                !currentGallery.every((url) => originalGallery.includes(url))
              ) {
                mediaUpdate.gallery = currentGallery;
                // Clean up removed images from storage
                await cleanupRemovedGalleryImages(
                  originalGallery,
                  currentGallery
                );
              }
            }

            // Update the tour document with real URLs
            if (Object.keys(mediaUpdate).length > 0) {
              await updateTourMedia(tour.id, mediaUpdate);
              console.log("Tour media updated successfully:", mediaUpdate);
            }
          } catch (updateError) {
            console.error(
              "Failed to update tour with image URLs:",
              updateError
            );
          }

          toast({
            title: "Success",
            description: "Tour updated and all images uploaded successfully!",
          });
        } else {
          console.warn("Some images failed to upload:", uploadResults);
          toast({
            title: "Partial Success",
            description: "Tour updated, but some images failed to upload.",
            variant: "destructive",
          });
        }

        // Clear blob states after upload
        setCoverBlob(null);
        setGalleryBlobs([]);
      } else if (hasGalleryChanges && tour?.id) {
        // No new uploads but gallery has changes (removals)
        console.log(
          "No new uploads but gallery has changes, cleaning up removed images..."
        );

        const currentGallery = uploadedGallery.filter(
          (url) => !url.startsWith("blob:")
        );

        // Clean up removed images from storage
        await cleanupRemovedGalleryImages(originalGallery, currentGallery);

        // Update the tour document with the new gallery
        await updateTourMedia(tour.id, { gallery: currentGallery });

        toast({
          title: "Success",
          description: "Tour updated and removed images cleaned up!",
        });
      }
    } catch (error) {
      console.error("Error in handleUpdateTour:", error);
      throw error;
    }
  };

  const handleSubmit = async (data: TourFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Current state:", {
      isSubmitting,
      uploadedCover,
      uploadedGalleryCount: uploadedGallery.length,
      coverBlob: coverBlob?.name,
      galleryBlobsCount: galleryBlobs.length,
      useCoverUrl,
      coverImageUrl,
    });

    // Validate cover image URL if using URL mode
    if (useCoverUrl && coverImageUrl.trim()) {
      try {
        new URL(coverImageUrl.trim());
      } catch (error) {
        toast({
          title: "Invalid Image URL",
          description: "Please enter a valid image URL",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Filter out empty strings from arrays
      const cleanedData: TourFormDataWithStringDates = {
        ...data,
        details: {
          highlights: data.details.highlights.filter((h) => h.trim() !== ""),
          itinerary: data.details.itinerary,
          requirements: data.details.requirements.filter(
            (r) => r.trim() !== ""
          ),
        },
        // Include uploaded images in media field
        media: {
          // For cover image: use uploaded cover if available, otherwise keep existing
          coverImage: (() => {
            if (useCoverUrl && coverImageUrl.trim()) {
              // If using URL mode and URL is provided, use the URL
              return coverImageUrl.trim();
            } else if (uploadedCover && !uploadedCover.startsWith("blob:")) {
              // If not using URL mode and we have a non-blob URL, use it
              return uploadedCover;
            } else if (tour?.media?.coverImage) {
              // Otherwise, keep existing cover image
              return tour.media.coverImage;
            }
            return "";
          })(),
          // For gallery: merge existing non-blob URLs with uploaded URLs
          gallery: (() => {
            const existingGallery = tour?.media?.gallery || [];
            const currentUploadedGallery = uploadedGallery || [];

            // If we have uploaded gallery items, use them
            if (currentUploadedGallery.length > 0) {
              // Filter out blob URLs from uploaded gallery (they'll be handled by blob upload process)
              const realUrls = currentUploadedGallery.filter(
                (url) => !url.startsWith("blob:")
              );
              return realUrls.length > 0 ? realUrls : existingGallery;
            }

            // Otherwise, keep existing gallery
            return existingGallery;
          })(),
        },
      };

      console.log("Cleaned form data:", cleanedData);

      await handleFormSubmit(cleanedData);

      console.log("Form submission completed successfully");
      onClose();
    } catch (error) {
      console.error("Error submitting tour:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      console.log("Form submission finished, isSubmitting set to false");
    }
  };

  // Test Supabase storage connection
  const testStorageConnection = async () => {
    try {
      console.log("Testing storage connection...");
      const result = await testSupabaseStorageConnection();

      if (result.success) {
        toast({
          title: "Storage Test Successful",
          description: "Supabase storage is working correctly!",
        });
      } else {
        toast({
          title: "Storage Test Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }

      console.log("Storage test result:", result);
    } catch (error) {
      console.error("Error testing storage:", error);
      toast({
        title: "Storage Test Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 bg-background">
        <DialogHeader className="px-8 pt-8 pb-6 bg-gradient-to-r from-crimson-red to-light-red text-white rounded-t-lg">
          <DialogTitle className="text-3xl font-bold text-white mb-2">
            {tour ? "Edit Tour Package" : "Create New Tour Package"}
          </DialogTitle>
          <DialogDescription className="text-white/90 text-lg">
            {tour
              ? "Update the tour package details below."
              : "Fill in the details to create a new tour package."}
          </DialogDescription>
          <div className="flex items-center gap-4 mt-4 text-white/80">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-white" />
              <span className="font-medium">Tour Management</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-white" />
              <span className="font-medium">
                {tour?.tourCode || "New Tour"}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto h-[calc(95vh-200px)]">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="p-8 space-y-8"
            >
              {/* Cover Image Section */}
              <Card className="bg-background border-2 border-border hover:border-crimson-red transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-crimson-red/10 rounded-full">
                      <ImageIcon className="h-5 w-5 text-crimson-red" />
                    </div>
                    Cover Image
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Upload a high-quality cover image for this tour
                    (recommended: 1200x800px) or use an image URL
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Test Storage Connection Button */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={testStorageConnection}
                        className="text-xs border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
                      >
                        Test Firebase Storage
                      </Button>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border-2 border-border">
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="cover-toggle"
                          checked={useCoverUrl}
                          onCheckedChange={handleCoverToggle}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor="cover-toggle"
                          className="text-sm font-medium text-foreground"
                        >
                          {useCoverUrl ? "Use Image URL" : "Upload Image File"}
                        </Label>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-crimson-red text-crimson-red"
                      >
                        {useCoverUrl ? "URL Mode" : "Upload Mode"}
                      </Badge>
                    </div>

                    {/* Upload Mode */}
                    {!useCoverUrl && (
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          disabled={isSubmitting}
                          className="hidden"
                          id="cover-upload"
                        />
                        <Label
                          htmlFor="cover-upload"
                          className={`flex items-center gap-3 px-6 py-4 border-2 border-dashed border-crimson-red/30 rounded-lg cursor-pointer hover:bg-crimson-red/5 transition-colors duration-200 ${
                            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Upload className="h-5 w-5 text-crimson-red" />
                          <span className="font-medium text-foreground">
                            Choose Cover Image
                          </span>
                        </Label>
                      </div>
                    )}

                    {/* URL Mode */}
                    {useCoverUrl && (
                      <div className="space-y-3">
                        <Label
                          htmlFor="cover-url"
                          className="text-sm font-medium text-foreground"
                        >
                          Image URL
                        </Label>
                        <Input
                          id="cover-url"
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={coverImageUrl}
                          onChange={(e) =>
                            handleCoverImageUrlChange(e.target.value)
                          }
                          disabled={isSubmitting}
                          className="w-full border-2 border-border focus:border-crimson-red"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter a direct link to an image (JPG, PNG, WebP, etc.)
                        </p>
                      </div>
                    )}

                    {/* Cover Image Preview */}
                    {uploadedCover && (
                      <div className="relative">
                        <img
                          src={uploadedCover}
                          alt="Cover preview"
                          className="w-full h-48 object-cover rounded-lg border-2 border-border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeCoverImage}
                          className="absolute top-3 right-3 bg-crimson-red hover:bg-light-red"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Basic Information */}
              <Card className="bg-background border-2 border-border hover:border-royal-purple transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-royal-purple/10 rounded-full">
                      <FileText className="h-5 w-5 text-royal-purple" />
                    </div>
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            Tour Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter tour name"
                              {...field}
                              className="border-2 border-border focus:border-royal-purple"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tourCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            Tour Code
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-2 border-border focus:border-royal-purple">
                                <SelectValue placeholder="Select tour code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="SIA">
                                SIA - Siargao Island Adventure
                              </SelectItem>
                              <SelectItem value="PHS">
                                PHS - Philippine Sunrise
                              </SelectItem>
                              <SelectItem value="PSS">
                                PSS - Philippines Sunset
                              </SelectItem>
                              <SelectItem value="MLB">
                                MLB - Maldives Bucketlist
                              </SelectItem>
                              <SelectItem value="SLW">
                                SLW - Sri Lanka Wander Tour
                              </SelectItem>
                              <SelectItem value="ARW">
                                ARW - Argentina's Wonders
                              </SelectItem>
                              <SelectItem value="BZT">
                                BZT - Brazil's Treasures
                              </SelectItem>
                              <SelectItem value="VNE">
                                VNE - Vietnam Expedition
                              </SelectItem>
                              <SelectItem value="IDD">
                                IDD - India Discovery Tour
                              </SelectItem>
                              <SelectItem value="IHF">
                                IHF - India Holi Festival Tour
                              </SelectItem>
                              <SelectItem value="TXP">
                                TXP - Tanzania Exploration
                              </SelectItem>
                              <SelectItem value="NZE">
                                NZE - New Zealand Expedition
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-muted-foreground">
                            Unique identifier for the tour package
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            URL Slug
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="tour-url-slug"
                              {...field}
                              className="border-2 border-border focus:border-royal-purple"
                            />
                          </FormControl>
                          <FormDescription className="text-muted-foreground">
                            URL-friendly identifier for the tour
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            Direct URL
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://imheretravels.com/tour-name"
                              {...field}
                              className="border-2 border-border focus:border-royal-purple"
                            />
                          </FormControl>
                          <FormDescription className="text-muted-foreground">
                            Direct link to tour page (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the tour package..."
                            rows={4}
                            {...field}
                            className="border-2 border-border focus:border-royal-purple resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-foreground font-medium">
                            <MapPin className="h-4 w-4 text-royal-purple" />
                            Location
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-2 border-border focus:border-royal-purple">
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Philippines">
                                Philippines
                              </SelectItem>
                              <SelectItem value="Maldives">Maldives</SelectItem>
                              <SelectItem value="Sri Lanka">
                                Sri Lanka
                              </SelectItem>
                              <SelectItem value="Argentina">
                                Argentina
                              </SelectItem>
                              <SelectItem value="Brazil">Brazil</SelectItem>
                              <SelectItem value="Vietnam">Vietnam</SelectItem>
                              <SelectItem value="India">India</SelectItem>
                              <SelectItem value="Tanzania">Tanzania</SelectItem>
                              <SelectItem value="New Zealand">
                                New Zealand
                              </SelectItem>
                              <SelectItem value="Ecuador">Ecuador</SelectItem>
                              <SelectItem value="Galapagos">
                                Galapagos
                              </SelectItem>
                              <SelectItem value="Amazon">Amazon</SelectItem>
                              <SelectItem value="Andes">Andes</SelectItem>
                              <SelectItem value="Coast">Coast</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-foreground font-medium">
                            <Clock className="h-4 w-4 text-spring-green" />
                            Duration (Days)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 1)
                              }
                              className="border-2 border-border focus:border-spring-green"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            Status
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-2 border-border focus:border-vivid-orange">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Travel Dates */}
              <Card className="bg-background border-2 border-border hover:border-spring-green transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-spring-green/10 rounded-full">
                      <Calendar className="h-5 w-5 text-spring-green" />
                    </div>
                    Travel Dates
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Add available travel dates for this tour package
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {travelDateFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border-2 border-border rounded-lg p-6 space-y-4 bg-muted/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-spring-green text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <h4 className="font-medium text-foreground">
                            Travel Date {index + 1}
                          </h4>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeTravelDate(index)}
                          disabled={travelDateFields.length === 1}
                          className="border-vivid-orange text-vivid-orange hover:bg-vivid-orange hover:text-white"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`travelDates.${index}.startDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-medium">
                                Start Date
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  className="border-2 border-border focus:border-spring-green"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`travelDates.${index}.endDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-medium">
                                End Date
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  className="border-2 border-border focus:border-spring-green"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`travelDates.${index}.isAvailable`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="rounded border-2 border-border focus:border-spring-green"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal text-foreground">
                                Available for booking
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`travelDates.${index}.maxCapacity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-medium">
                                Max Capacity (Optional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Maximum number of travelers"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : 0
                                    )
                                  }
                                  className="border-2 border-border focus:border-spring-green"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`travelDates.${index}.currentBookings`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-medium">
                                Current Bookings (Optional)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Number of current bookings"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : 0
                                    )
                                  }
                                  className="border-2 border-border focus:border-spring-green"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendTravelDate({
                        startDate: "",
                        endDate: "",
                        isAvailable: true,
                        maxCapacity: 0,
                        currentBookings: 0,
                      })
                    }
                    className="w-full border-2 border-spring-green text-spring-green hover:bg-spring-green hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Travel Date
                  </Button>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card className="bg-background border-2 border-border hover:border-vivid-orange transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-vivid-orange/10 rounded-full">
                      <Banknote className="h-5 w-5 text-vivid-orange" />
                    </div>
                    Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <FormField
                      control={form.control}
                      name="pricing.original"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            Original Price
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                              className="border-2 border-border focus:border-vivid-orange"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricing.discounted"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            Discounted Price
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                              className="border-2 border-border focus:border-vivid-orange"
                            />
                          </FormControl>
                          <FormDescription className="text-muted-foreground">
                            Optional
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricing.deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            Deposit
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                              className="border-2 border-border focus:border-vivid-orange"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricing.currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-medium">
                            Currency
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="border-2 border-border focus:border-vivid-orange">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* External Links */}
              <Card className="bg-background border-2 border-border hover:border-royal-purple transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-royal-purple/10 rounded-full">
                      <FolderOpen className="h-5 w-5 text-royal-purple" />
                    </div>
                    External Links
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Add links to brochures, payment pages, and pre-departure
                    materials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="brochureLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">
                          Brochure Link
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://drive.google.com/file/d/..."
                            {...field}
                            className="border-2 border-border focus:border-royal-purple"
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground">
                          Link to tour brochure (Google Drive, PDF, etc.)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stripePaymentLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">
                          Stripe Payment Link
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://book.stripe.com/..."
                            {...field}
                            className="border-2 border-border focus:border-royal-purple"
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground">
                          Stripe checkout link for tour bookings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preDeparturePack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-medium">
                          Pre-Departure Pack
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://drive.google.com/file/d/..."
                            {...field}
                            className="border-2 border-border focus:border-royal-purple"
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground">
                          Link to pre-departure information pack
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Highlights */}
              <Card className="bg-background border-2 border-border hover:border-sunglow-yellow transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-sunglow-yellow/10 rounded-full">
                      <Star className="h-5 w-5 text-sunglow-yellow" />
                    </div>
                    Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {highlightFields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`details.highlights.${index}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-3 group">
                              <div className="w-2 h-2 bg-sunglow-yellow rounded-full flex-shrink-0"></div>
                              <Input
                                placeholder={`Highlight ${index + 1}`}
                                {...field}
                                className="border-none bg-transparent group-hover:bg-background transition-colors duration-200 focus:ring-2 focus:ring-sunglow-yellow focus:ring-opacity-50 rounded px-2"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeHighlight(index)}
                                disabled={highlightFields.length === 1}
                                className="h-6 w-6 p-0 border-vivid-orange text-vivid-orange hover:bg-vivid-orange hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => (appendHighlight as any)("")}
                    className="w-full border-2 border-sunglow-yellow text-sunglow-yellow hover:bg-sunglow-yellow hover:text-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Highlight
                  </Button>
                </CardContent>
              </Card>

              {/* Itinerary */}
              <Card className="bg-background border-2 border-border hover:border-royal-purple transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-royal-purple/10 rounded-full">
                      <Plane className="h-5 w-5 text-royal-purple" />
                    </div>
                    Itinerary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {itineraryFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="border-2 border-border rounded-lg p-4 bg-muted/20 hover:border-royal-purple transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-royal-purple text-white rounded-full flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </div>
                            <h4 className="font-medium text-foreground text-sm">
                              Day {index + 1}
                            </h4>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItinerary(index)}
                            disabled={itineraryFields.length === 1}
                            className="h-6 w-6 p-0 border-vivid-orange text-vivid-orange hover:bg-vivid-orange hover:text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={`details.itinerary.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium text-xs">
                                  Title
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Day title"
                                    {...field}
                                    className="h-8 text-sm border-2 border-border focus:border-royal-purple"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`details.itinerary.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground font-medium text-xs">
                                  Description
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Activities for this day"
                                    rows={2}
                                    {...field}
                                    className="text-sm border-2 border-border focus:border-royal-purple resize-none"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendItinerary({
                        day: itineraryFields.length + 1,
                        title: "",
                        description: "",
                      })
                    }
                    className="w-full border-2 border-royal-purple text-royal-purple hover:bg-royal-purple hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Day
                  </Button>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card className="bg-background border-2 border-border hover:border-vivid-orange transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-vivid-orange/10 rounded-full">
                      <AlertCircle className="h-5 w-5 text-vivid-orange" />
                    </div>
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {requirementFields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`details.requirements.${index}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-3 group">
                              <div className="w-2 h-2 bg-vivid-orange rounded-full flex-shrink-0"></div>
                              <Input
                                placeholder={`Requirement ${index + 1}`}
                                {...field}
                                className="border-none bg-transparent group-hover:bg-background transition-colors duration-200 focus:ring-2 focus:ring-vivid-orange focus:ring-opacity-50 rounded px-2"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeRequirement(index)}
                                disabled={requirementFields.length === 1}
                                className="h-6 w-6 p-0 border-vivid-orange text-vivid-orange hover:bg-vivid-orange hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => (appendRequirement as any)("")}
                    className="w-full border-2 border-vivid-orange text-vivid-orange hover:bg-vivid-orange hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Requirement
                  </Button>
                </CardContent>
              </Card>

              {/* Gallery Images */}
              <Card className="bg-background border-2 border-border hover:border-royal-purple transition-colors duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <div className="p-2 bg-royal-purple/10 rounded-full">
                      <FolderOpen className="h-5 w-5 text-royal-purple" />
                    </div>
                    Gallery Images
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Upload multiple images to showcase your tour (up to 10
                    images)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryUpload}
                        disabled={isSubmitting}
                        className="hidden"
                        id="gallery-upload"
                      />
                      <Label
                        htmlFor="gallery-upload"
                        className={`flex items-center gap-3 px-6 py-4 border-2 border-dashed border-royal-purple/30 rounded-lg cursor-pointer hover:bg-royal-purple/5 transition-colors duration-200 ${
                          isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <Upload className="h-5 w-5 text-royal-purple" />
                        <span className="font-medium text-foreground">
                          Choose Gallery Images
                        </span>
                      </Label>
                    </div>

                    {uploadedGallery.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {uploadedGallery.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={image}
                              alt={`Gallery ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeGalleryImage(index)}
                              className="absolute top-2 right-2 bg-crimson-red hover:bg-light-red"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <DialogFooter className="pt-6 border-t-2 border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="flex items-center gap-2 bg-crimson-red hover:bg-light-red text-white"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting
                    ? "Saving..."
                    : tour
                    ? "Update Tour"
                    : "Create Tour"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
