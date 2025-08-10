"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Minus, 
  Save, 
  X, 
  MapPin, 
  Clock, 
  DollarSign,
  FileText,
  Star,
  Calendar,
  Image,
  FolderOpen
} from "lucide-react";
import { TourPackage, TourPackageFormData } from "@/types/tours";
import { generateSlug, validateTourData } from "@/lib/tours-service";
import { FileUpload, TourCoverUpload, TourGalleryUpload } from "@/components/ui/file-upload";
import { BlobFileUpload } from "@/components/ui/blob-file-upload";
import { uploadAllBlobsToStorage, cleanupBlobUrls } from "@/lib/blob-upload-service";
import { useToast } from "@/hooks/use-toast";
import { UploadResult } from "@/hooks/use-file-upload";

// Form validation schema
const tourFormSchema = z.object({
  name: z.string().min(3, "Tour name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(2, "Location is required"),
  duration: z.number().min(1, "Duration must be at least 1 day"),
  pricing: z.object({
    original: z.number().min(1, "Original price must be greater than 0"),
    discounted: z.number().optional(),
    deposit: z.number().min(1, "Deposit is required"),
    currency: z.enum(["USD", "EUR", "GBP"]),
  }),
  details: z.object({
    highlights: z.array(z.string().min(1, "Highlight cannot be empty")),
    itinerary: z.array(z.object({
      day: z.number(),
      title: z.string().min(1, "Day title is required"),
      description: z.string().min(1, "Day description is required"),
    })),
    requirements: z.array(z.string()),
  }),
  status: z.enum(["active", "draft", "archived"]),
});

type TourFormData = z.infer<typeof tourFormSchema>;

interface TourFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TourPackageFormData) => Promise<void | string>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedCover, setUploadedCover] = useState<string | null>(null);
  const [uploadedGallery, setUploadedGallery] = useState<string[]>([]);
  // For new tours: store actual File objects as blobs
  const [coverBlob, setCoverBlob] = useState<File | null>(null);
  const [galleryBlobs, setGalleryBlobs] = useState<File[]>([]);
  const { toast } = useToast();

  const form = useForm<TourFormData>({
    resolver: zodResolver(tourFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      location: "",
      duration: 1,
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

  // Reset form when tour prop changes
  useEffect(() => {
    if (tour) {
      form.reset({
        name: tour.name,
        slug: tour.slug,
        description: tour.description,
        location: tour.location,
        duration: tour.duration,
        pricing: tour.pricing,
        details: tour.details,
        status: tour.status,
      });
      
      // Initialize uploaded images from existing tour
      setUploadedCover(tour.media?.coverImage || null);
      setUploadedGallery(tour.media?.gallery || []);
      // Clear blobs for existing tours (they use direct uploads)
      setCoverBlob(null);
      setGalleryBlobs([]);
    } else {
      form.reset({
        name: "",
        slug: "",
        description: "",
        location: "",
        duration: 1,
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
      });
      
      // Reset uploaded images for new tour
      setUploadedCover(null);
      setUploadedGallery([]);
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
      form.setValue("slug", slug);
    }
  }, [watchedName, form, tour]);

  const handleCoverUpload = (results: UploadResult[]) => {
    if (results.length > 0 && results[0].data?.publicUrl) {
      setUploadedCover(results[0].data.publicUrl);
      toast({
        title: "Cover uploaded",
        description: "Tour cover image uploaded successfully",
      });
    }
  };

  const handleGalleryUpload = (results: UploadResult[]) => {
    const urls = results
      .map(result => result.data?.publicUrl)
      .filter(Boolean) as string[];
    
    setUploadedGallery(prev => [...prev, ...urls]);
    toast({
      title: "Gallery updated",
      description: `${urls.length} image(s) uploaded successfully`,
    });
  };

  // New blob-based handlers for new tours
  const handleCoverBlobUpload = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setCoverBlob(file);
      // Create a blob URL for preview
      const blobUrl = URL.createObjectURL(file);
      setUploadedCover(blobUrl);
      toast({
        title: "Cover selected",
        description: "Cover image ready for upload after tour creation",
      });
    }
  };

  const handleGalleryBlobUpload = (files: File[]) => {
    if (files.length > 0) {
      setGalleryBlobs(prev => [...prev, ...files]);
      // Create blob URLs for preview
      const blobUrls = files.map(file => URL.createObjectURL(file));
      setUploadedGallery(prev => [...prev, ...blobUrls]);
      toast({
        title: "Gallery images selected",
        description: `${files.length} image(s) ready for upload after tour creation`,
      });
    }
  };

  const handleUploadError = (error: string) => {
    toast({
      title: "Upload error",
      description: error,
      variant: "destructive",
    });
  };

  // Handle form submission
  const handleFormSubmit = async (data: TourPackageFormData) => {
    if (tour) {
      await handleUpdateTour(data);
    } else {
      return await handleCreateTour(data);
    }
  };

  // Create tour with blob upload handling
  const handleCreateTour = async (data: TourPackageFormData) => {
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
          typeof tourId === 'string' ? tourId : ''
        );

        if (uploadResults.allSuccessful) {
          toast({
            title: "Success",
            description: "Tour created and all images uploaded successfully!",
          });
        } else {
          toast({
            title: "Partial success",
            description: "Tour created but some images failed to upload. You can re-upload them by editing the tour.",
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
      // If tour creation fails, cleanup blob URLs
      const allUrls = [...uploadedGallery];
      if (uploadedCover) allUrls.push(uploadedCover);
      cleanupBlobUrls(allUrls);
      throw error;
    }
  };

  // Update existing tour
  const handleUpdateTour = async (data: TourPackageFormData) => {
    await onSubmit(data);
  };

  const handleSubmit = async (data: TourFormData) => {
    try {
      setIsSubmitting(true);
      
      // Validate form data
      const errors = validateTourData(data);
      if (errors.length > 0) {
        console.error("Validation errors:", errors);
        return;
      }

      // Filter out empty strings from arrays
      const cleanedData: TourPackageFormData = {
        ...data,
        details: {
          highlights: data.details.highlights.filter(h => h.trim() !== ""),
          itinerary: data.details.itinerary,
          requirements: data.details.requirements.filter(r => r.trim() !== ""),
        },
        // Include uploaded images in media field
        media: {
          coverImage: uploadedCover || tour?.media?.coverImage || "",
          gallery: uploadedGallery.length > 0 ? uploadedGallery : tour?.media?.gallery || [],
        },
      };

      await handleFormSubmit(cleanedData);
      
      onClose();
    } catch (error) {
      console.error("Error submitting tour:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
              : "Fill in the details to create a new tour package."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                        <FormControl>
                          <Input placeholder="Tour location" {...field} />
                        </FormControl>
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
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Cover Image - Primary upload section at the top */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Cover Image
                </CardTitle>
                <CardDescription>
                  Upload a high-quality cover image for this tour (recommended: 1200x800px)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tour ? (
                  <TourCoverUpload
                    tourId={tour.id}
                    onUploadComplete={handleCoverUpload}
                    onUploadError={handleUploadError}
                    disabled={isSubmitting}
                  />
                ) : (
                  <BlobFileUpload
                    accept="image/*"
                    multiple={false}
                    maxFiles={1}
                    maxSize={5 * 1024 * 1024} // 5MB
                    onFilesSelected={handleCoverBlobUpload}
                    disabled={isSubmitting}
                    selectedFiles={coverBlob ? [coverBlob] : []}
                    onRemoveFile={() => {
                      setCoverBlob(null);
                      if (uploadedCover?.startsWith('blob:')) {
                        URL.revokeObjectURL(uploadedCover);
                      }
                      setUploadedCover(null);
                    }}
                  />
                )}
                {uploadedCover && (
                  <div className="mt-4 p-3 border rounded-lg bg-green-50">
                    <p className="text-sm text-green-700 font-medium">
                      {tour ? 'Cover image uploaded' : 'Cover image selected'}
                    </p>
                    <a 
                      href={uploadedCover} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View image
                    </a>
                  </div>
                )}
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
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
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
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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
                            <Input placeholder="Tour highlight" {...field} />
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
                  <div key={field.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Day {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItinerary(index)}
                        disabled={itineraryFields.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`details.itinerary.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Day activity title" {...field} />
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the day's activities"
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
                  onClick={() => appendItinerary({ 
                    day: itineraryFields.length + 1, 
                    title: "", 
                    description: "" 
                  })}
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
                            <Input placeholder="Tour requirement" {...field} />
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

            {/* Gallery Images - Secondary upload section */}
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
                {tour ? (
                  <TourGalleryUpload
                    tourId={tour.id}
                    onUploadComplete={handleGalleryUpload}
                    onUploadError={handleUploadError}
                    disabled={isSubmitting}
                  />
                ) : (
                  <BlobFileUpload
                    accept="image/*"
                    multiple={true}
                    maxFiles={10}
                    maxSize={8 * 1024 * 1024} // 8MB
                    onFilesSelected={handleGalleryBlobUpload}
                    disabled={isSubmitting}
                    selectedFiles={galleryBlobs}
                    onRemoveFile={(index) => {
                      const removedFile = galleryBlobs[index];
                      if (removedFile) {
                        // Cleanup blob URL
                        const blobUrl = uploadedGallery[index];
                        if (blobUrl?.startsWith('blob:')) {
                          URL.revokeObjectURL(blobUrl);
                        }
                      }
                      setGalleryBlobs(prev => prev.filter((_, i) => i !== index));
                      setUploadedGallery(prev => prev.filter((_, i) => i !== index));
                    }}
                  />
                )}
                {uploadedGallery.length > 0 && (
                  <div className="mt-4 p-3 border rounded-lg bg-green-50">
                    <p className="text-sm text-green-700 font-medium">
                      {uploadedGallery.length} gallery image{uploadedGallery.length !== 1 ? 's' : ''} {tour ? 'uploaded' : 'selected'}
                    </p>
                    <div className="mt-2 space-y-1">
                      {uploadedGallery.slice(0, 3).map((url, index) => (
                        <a 
                          key={index}
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-600 hover:underline"
                        >
                          Image {index + 1}
                        </a>
                      ))}
                      {uploadedGallery.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{uploadedGallery.length - 3} more image{uploadedGallery.length - 3 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
                {isSubmitting ? "Saving..." : tour ? "Update Tour" : "Create Tour"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
