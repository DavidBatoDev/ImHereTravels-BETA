"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Map } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";

interface MapSectionProps {
   
  form: UseFormReturn<any>;
}

export default function MapSection({ form }: MapSectionProps) {
  const mapImage = form.watch("details.map.image") as string | undefined;
  const mapEmbed = form.watch("details.map.embedUrl") as string | undefined;

  return (
    <SectionWrapper
      id="map"
      title="Map"
      description="Show a static map image or an interactive embed on the tour page."
    >
      <div className="space-y-5">
        {/* Preview */}
        {(mapImage || mapEmbed) && (
          <div className="aspect-video w-full overflow-hidden rounded-[16px] bg-light-grey">
            {mapEmbed ? (
              <iframe
                src={mapEmbed}
                className="h-full w-full"
                loading="lazy"
                title="Tour map"
              />
            ) : mapImage ? (
              <img
                src={mapImage}
                alt="Tour map"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        )}

        <FormField
          control={form.control}
          name="details.map.image"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-sans font-bold text-midnight flex items-center gap-2">
                <Map className="h-4 w-4 text-crimson-red" />
                Map Image URL
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://..."
                  {...field}
                  value={field.value ?? ""}
                  className="border-2 border-border focus:border-crimson-red"
                />
              </FormControl>
              <FormDescription className="font-body text-b4-desktop text-dark-gray">
                Used when no embed URL is set. 16:9 ratio recommended.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="details.map.embedUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-sans font-bold text-midnight">
                Map Embed URL
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://www.google.com/maps/embed?..."
                  {...field}
                  value={field.value ?? ""}
                  className="border-2 border-border focus:border-crimson-red"
                />
              </FormControl>
              <FormDescription className="font-body text-b4-desktop text-dark-gray">
                Google Maps embed URL. When set, takes priority over the image.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SectionWrapper>
  );
}
