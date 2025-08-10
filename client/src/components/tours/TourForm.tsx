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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar
} from "lucide-react";
import { TourPackage, TourPackageFormData } from "@/types/tours";
import { generateSlug, validateTourData } from "@/lib/tours-service";

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
  onSubmit: (data: TourPackageFormData) => Promise<void>;
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
      };

      await onSubmit(cleanedData);
      onClose();
    } catch (error) {
      console.error("Error submitting tour:", error);
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
