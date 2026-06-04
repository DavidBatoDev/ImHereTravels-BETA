"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, X, Hotel } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";

interface AccommodationsSectionProps {
   
  form: UseFormReturn<any>;
}

export default function AccommodationsSection({ form }: AccommodationsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details.accommodations",
  });

  return (
    <SectionWrapper
      id="accommodations"
      title="Where We Stay"
      description="Hotels and lodging for the tour — shown in a carousel on the tour page."
    >
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-[16px] border border-light-grey bg-light-grey/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-midnight text-sm flex items-center gap-2">
                <Hotel className="h-4 w-4 text-crimson-red" />
                Accommodation {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="h-8 w-8 text-crimson-red hover:bg-crimson-red/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name={`details.accommodations.${index}.name`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray">Hotel / Lodge Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Hotel Fasano" {...f} className="border-2 border-border focus:border-crimson-red" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.accommodations.${index}.nights`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray">Nights</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2 nights in Buenos Aires" {...f} className="border-2 border-border focus:border-crimson-red" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name={`details.accommodations.${index}.image`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-dark-gray">Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...f} className="border-2 border-border focus:border-crimson-red" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image preview */}
            {form.watch(`details.accommodations.${index}.image`) && (
              <div className="aspect-[4/3] overflow-hidden rounded-[12px] w-40">
                <img
                  src={form.watch(`details.accommodations.${index}.image`)}
                  alt="Accommodation preview"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: "", nights: "", image: "" })}
          className="border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Accommodation
        </Button>
      </div>
    </SectionWrapper>
  );
}
