"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { MapPin, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";

const PRESET_LOCATIONS = [
  "Philippines", "Maldives", "Sri Lanka", "Argentina", "Brazil",
  "Vietnam", "India", "Tanzania", "New Zealand", "Ecuador",
  "Galapagos", "Amazon", "Andes", "Coast", "Other",
];

interface BasicInfoSectionProps {
   
  form: UseFormReturn<any>;
}

export default function BasicInfoSection({ form }: BasicInfoSectionProps) {
  return (
    <SectionWrapper
      id="basic-info"
      title="Basic Information"
      description="Core details about the tour package — name, location, duration, and publish status."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-sans font-bold text-midnight">Tour Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Argentina's Wonders"
                    {...field}
                    className="border-2 border-border focus:border-crimson-red"
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
                <FormLabel className="font-sans font-bold text-midnight">Tour Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. ARW"
                    {...field}
                    className="border-2 border-border focus:border-crimson-red"
                  />
                </FormControl>
                <FormDescription className="font-body text-b4-desktop text-dark-gray">
                  Short unique identifier (e.g. SIA, PHS, ARW)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-sans font-bold text-midnight">URL Slug</FormLabel>
                <FormControl>
                  <Input
                    placeholder="argentinas-wonders"
                    {...field}
                    className="border-2 border-border focus:border-crimson-red"
                  />
                </FormControl>
                <FormDescription className="font-body text-b4-desktop text-dark-gray">
                  Auto-generated from name. Used in the tour URL.
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
                <FormLabel className="font-sans font-bold text-midnight">Direct URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://imheretravels.com/tours/..."
                    {...field}
                    value={field.value ?? ""}
                    className="border-2 border-border focus:border-crimson-red"
                  />
                </FormControl>
                <FormDescription className="font-body text-b4-desktop text-dark-gray">
                  Full link to tour page (optional — used in admin detail view).
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
              <FormLabel className="font-sans font-bold text-midnight">Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the tour experience…"
                  rows={6}
                  {...field}
                  className="border-2 border-border focus:border-crimson-red resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="sm:col-span-1 space-y-1">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-sans font-bold text-midnight flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-crimson-red" />
                    Location
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-2 border-border focus:border-crimson-red">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRESET_LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-sans font-bold text-midnight flex items-center gap-2">
                  <Clock className="h-4 w-4 text-crimson-red" />
                  Duration
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 11 days"
                    {...field}
                    className="border-2 border-border focus:border-crimson-red"
                  />
                </FormControl>
                <FormDescription className="font-body text-b4-desktop text-dark-gray">
                  Format: "X days" (e.g. "11 days")
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-sans font-bold text-midnight">Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-2 border-border focus:border-crimson-red">
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

        {/* Custom location input */}
        {form.watch("location") === "Other" && (
          <FormField
            control={form.control}
            name="locationOther"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-sans font-bold text-midnight">Custom Location</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter city, country, or region"
                    {...field}
                    className="border-2 border-border focus:border-crimson-red"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </SectionWrapper>
  );
}
