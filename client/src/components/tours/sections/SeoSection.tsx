"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Globe, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";

interface SeoSectionProps {
   
  form: UseFormReturn<any>;
}

export default function SeoSection({ form }: SeoSectionProps) {
  return (
    <SectionWrapper
      id="seo"
      title="SEO & Publishing"
      description="Control how this tour appears in search results and on the website."
    >
      <div className="space-y-6">
        {/* comingSoon toggle */}
        <FormField
          control={form.control}
          name="comingSoon"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between rounded-[16px] border border-light-grey bg-light-grey/40 px-5 py-4">
                <div className="space-y-0.5">
                  <FormLabel className="font-sans text-h6-mobile font-bold text-midnight">
                    Coming Soon
                  </FormLabel>
                  <FormDescription className="font-body text-b4-desktop text-dark-gray">
                    Hide full tour content on www — shows a Coming Soon placeholder instead.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-crimson-red"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-5">
          {/* SEO Title */}
          <FormField
            control={form.control}
            name="seo.title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-sans font-bold text-midnight flex items-center gap-2">
                  <Globe className="h-4 w-4 text-crimson-red" />
                  SEO Title
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Leave blank to use tour name"
                    {...field}
                    value={field.value ?? ""}
                    className="border-2 border-border focus:border-crimson-red"
                  />
                </FormControl>
                <FormDescription className="font-body text-b4-desktop text-dark-gray">
                  Overrides the &lt;title&gt; tag on the tour page.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* SEO Description */}
          <FormField
            control={form.control}
            name="seo.description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-sans font-bold text-midnight">
                  SEO Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Leave blank to use tour description"
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                    className="border-2 border-border focus:border-crimson-red resize-none"
                  />
                </FormControl>
                <FormDescription className="font-body text-b4-desktop text-dark-gray">
                  Overrides the meta description and Open Graph description.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Booking Slug */}
          <FormField
            control={form.control}
            name="bookingSlug"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-sans font-bold text-midnight flex items-center gap-2">
                  <Settings className="h-4 w-4 text-crimson-red" />
                  Booking Slug Override
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Leave blank to use tour slug"
                    {...field}
                    value={field.value ?? ""}
                    className="border-2 border-border focus:border-crimson-red"
                  />
                </FormControl>
                <FormDescription className="font-body text-b4-desktop text-dark-gray">
                  Use a different ID for booking/reservation URLs (e.g. when a private tour shares an admin tour ID).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
