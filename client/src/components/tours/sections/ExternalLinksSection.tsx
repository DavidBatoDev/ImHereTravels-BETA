"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
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

interface ExternalLinksSectionProps {
   
  form: UseFormReturn<any>;
}

export default function ExternalLinksSection({ form }: ExternalLinksSectionProps) {
  return (
    <SectionWrapper
      id="external-links"
      title="External Links"
      description="Brochure and pre-departure pack links (Stripe payment link is in the Booking Card section above)."
    >
      <div className="space-y-5">
        <FormField
          control={form.control}
          name="brochureLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-sans font-bold text-midnight">Brochure Link</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  {...field}
                  value={field.value ?? ""}
                  className="border-2 border-border focus:border-crimson-red"
                />
              </FormControl>
              <FormDescription className="font-body text-b4-desktop text-dark-gray">
                Google Drive PDF or brochure URL. Used as the "Download Itinerary" link on www.
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
              <FormLabel className="font-sans font-bold text-midnight">Pre-Departure Pack</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  {...field}
                  value={field.value ?? ""}
                  className="border-2 border-border focus:border-crimson-red"
                />
              </FormControl>
              <FormDescription className="font-body text-b4-desktop text-dark-gray">
                Link to pre-departure information pack for confirmed travellers.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SectionWrapper>
  );
}
