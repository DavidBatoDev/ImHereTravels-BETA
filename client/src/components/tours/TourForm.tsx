"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Calendar,
  Plus,
  Minus,
  Save,
  Image as ImageIcon,
  FolderOpen,
  Upload,
  X,
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
        maxCapacity: td.maxCapacity || 0,
        currentBookings: td.currentBookings || 0,
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
        name: tour.name,
        slug: tour.slug,
        url: tour.url || "",
        tourCode: tour.tourCode || "",
        description: tour.description,
        location: tour.location,
        duration: tour.duration,
        travelDates: travelDates,
        pricing: tour.pricing,
        details: tour.details,
        status: tour.status,
        brochureLink: tour.brochureLink || "",
        stripePaymentLink: tour.stripePaymentLink || "",
        preDeparturePack: tour.preDeparturePack || "",
      });

      // Initialize uploaded images from existing tour
      setUploadedCover(tour.media?.coverImage || null);
      setUploadedGallery(tour.media?.gallery || []);
      // Store original gallery for cleanup comparison
      setOriginalGallery(tour.media?.gallery || []);
      // Clear blobs for existing tours (they use direct uploads)
      setCoverBlob(null);
      setGalleryBlobs([]);
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
      if ((coverBlob || galleryBlobs.length > 0) && tourId) {
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

      // If we have blobs to upload
      if ((coverBlob || galleryBlobs.length > 0) && tour?.id) {
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
    });

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
          coverImage: uploadedCover || tour?.media?.coverImage || "",
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tour ? "Edit Tour Package" : "Create New Tour Package"}
          </DialogTitle>
          <DialogDescription>
            {tour
              ? "Update the tour package details below."
              : "Fill in the details to create a new tour package."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter tour name" {...field} />
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
                        <FormLabel>Tour Code</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                        <FormDescription>
                          Unique identifier for the tour package
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="tour-url-slug" {...field} />
                        </FormControl>
                        <FormDescription>
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
                        <FormLabel>Direct URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://imheretravels.com/tour-name"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the tour package..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Philippines">
                              Philippines
                            </SelectItem>
                            <SelectItem value="Maldives">Maldives</SelectItem>
                            <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                            <SelectItem value="Argentina">Argentina</SelectItem>
                            <SelectItem value="Brazil">Brazil</SelectItem>
                            <SelectItem value="Vietnam">Vietnam</SelectItem>
                            <SelectItem value="India">India</SelectItem>
                            <SelectItem value="Tanzania">Tanzania</SelectItem>
                            <SelectItem value="New Zealand">
                              New Zealand
                            </SelectItem>
                            <SelectItem value="Ecuador">Ecuador</SelectItem>
                            <SelectItem value="Galapagos">Galapagos</SelectItem>
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
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
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
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Travel Dates
                </CardTitle>
                <CardDescription>
                  Add available travel dates for this tour package
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {travelDateFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Travel Date {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTravelDate(index)}
                        disabled={travelDateFields.length === 1}
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
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
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
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`travelDates.${index}.isAvailable`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
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
                            <FormLabel>Max Capacity (Optional)</FormLabel>
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
                            <FormLabel>Current Bookings (Optional)</FormLabel>
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
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Travel Date
                </Button>
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Cover Image
                </CardTitle>
                <CardDescription>
                  Upload a high-quality cover image for this tour (recommended:
                  1200x800px)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Test Storage Connection Button */}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={testStorageConnection}
                      className="text-xs"
                    >
                      Test Firebase Storage
                    </Button>
                  </div>

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
                      className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${
                        isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      Choose Cover Image
                    </Label>
                  </div>

                  {uploadedCover && (
                    <div className="relative">
                      <img
                        src={uploadedCover}
                        alt="Cover preview"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeCoverImage}
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="pricing.original"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
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
                        <FormLabel>Discounted Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormDescription>Optional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pricing.deposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
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
                        <FormLabel>Currency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  External Links
                </CardTitle>
                <CardDescription>
                  Add links to brochures, payment pages, and pre-departure
                  materials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="brochureLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brochure Link</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://drive.google.com/file/d/..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
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
                      <FormLabel>Stripe Payment Link</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://book.stripe.com/..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
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
                      <FormLabel>Pre-Departure Pack</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://drive.google.com/file/d/..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Link to pre-departure information pack
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {highlightFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`details.highlights.${index}`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={`Highlight ${index + 1}`}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeHighlight(index)}
                      disabled={highlightFields.length === 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (appendHighlight as any)("")}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Highlight
                </Button>
              </CardContent>
            </Card>

            {/* Itinerary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Itinerary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {itineraryFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Day {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItinerary(index)}
                        disabled={itineraryFields.length === 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name={`details.itinerary.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter day title" {...field} />
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
                          <FormLabel>Day Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe activities for this day"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
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
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Day
                </Button>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requirementFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`details.requirements.${index}`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={`Requirement ${index + 1}`}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeRequirement(index)}
                      disabled={requirementFields.length === 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (appendRequirement as any)("")}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Requirement
                </Button>
              </CardContent>
            </Card>

            {/* Gallery Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Gallery Images
                </CardTitle>
                <CardDescription>
                  Upload multiple images to showcase your tour (up to 10 images)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
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
                      className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${
                        isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      Choose Gallery Images
                    </Label>
                  </div>

                  {uploadedGallery.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {uploadedGallery.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute top-1 right-1"
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="flex items-center gap-2"
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
      </DialogContent>
    </Dialog>
  );
}
