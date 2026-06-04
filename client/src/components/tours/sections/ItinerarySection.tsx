"use client";

import React, { useState } from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";

interface ItinerarySectionProps {
   
  form: UseFormReturn<any>;
}

export default function ItinerarySection({ form }: ItinerarySectionProps) {
  const {
    fields: itineraryFields,
    append: appendItinerary,
    remove: removeItinerary,
  } = useFieldArray({ control: form.control, name: "details.itinerary" });

  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const toggleDay = (index: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <SectionWrapper
      id="itinerary"
      title="Itinerary"
      description="Day-by-day schedule. Optionally add per-day images, accommodation, activities, and meals."
    >
      <div className="relative">
        {/* Timeline line */}
        <div
          className="absolute left-5 top-5 bottom-10 w-0.5 bg-crimson-red/30"
          aria-hidden="true"
        />

        <div className="space-y-4">
          {itineraryFields.map((field, index) => {
            const isExpanded = expandedDays.has(index);
            return (
              <div key={field.id} className="flex items-start gap-4">
                {/* Day badge */}
                <div className="flex-shrink-0 relative z-10">
                  <div className="w-10 h-10 bg-crimson-red text-white rounded-full flex items-center justify-center font-bold text-sm shadow-small">
                    {index + 1}
                  </div>
                </div>

                {/* Content card */}
                <div className="flex-1 rounded-[16px] border border-light-grey bg-light-grey/20 overflow-hidden">
                  {/* Day title row */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    <FormField
                      control={form.control}
                      name={`details.itinerary.${index}.title`}
                      render={({ field: f }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={`Day ${index + 1} title`}
                              {...f}
                              className="border-none bg-transparent font-sans font-bold text-midnight focus:ring-2 focus:ring-crimson-red rounded px-1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleDay(index)}
                      className="h-7 w-7 text-dark-gray hover:bg-light-grey"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItinerary(index)}
                      disabled={itineraryFields.length === 1}
                      className="h-7 w-7 text-crimson-red hover:bg-crimson-red/10"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Description */}
                  <div className="px-4 pb-3">
                    <FormField
                      control={form.control}
                      name={`details.itinerary.${index}.description`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the day's activities…"
                              rows={3}
                              {...f}
                              className="border-none bg-transparent resize-none focus:ring-2 focus:ring-crimson-red rounded px-1 text-sm text-dark-gray"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Expanded per-day details */}
                  {isExpanded && (
                    <div className="border-t border-light-grey px-4 py-4 space-y-3 bg-white/60">
                      <p className="text-xs font-medium text-dark-gray uppercase tracking-wide">Per-day details (optional)</p>

                      <FormField
                        control={form.control}
                        name={`details.itinerary.${index}.image`}
                        render={({ field: f }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dark-gray w-24 shrink-0">Day Image</span>
                              <FormControl>
                                <Input
                                  placeholder="https://... or Firebase Storage URL"
                                  {...f}
                                  value={f.value ?? ""}
                                  className="border-2 border-border focus:border-crimson-red text-sm h-8"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`details.itinerary.${index}.accommodation`}
                        render={({ field: f }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dark-gray w-24 shrink-0">Accommodation</span>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Hotel Fasano, Buenos Aires"
                                  {...f}
                                  value={f.value ?? ""}
                                  className="border-2 border-border focus:border-crimson-red text-sm h-8"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`details.itinerary.${index}.activities`}
                        render={({ field: f }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dark-gray w-24 shrink-0">Activity</span>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Tango show, La Boca tour"
                                  {...f}
                                  value={f.value ?? ""}
                                  className="border-2 border-border focus:border-crimson-red text-sm h-8"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`details.itinerary.${index}.meals`}
                        render={({ field: f }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dark-gray w-24 shrink-0">Meals</span>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Breakfast & dinner"
                                  {...f}
                                  value={f.value ?? ""}
                                  className="border-2 border-border focus:border-crimson-red text-sm h-8"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendItinerary({
              day: itineraryFields.length + 1,
              title: "",
              description: "",
              image: undefined,
              accommodation: undefined,
              activities: undefined,
              meals: undefined,
            })
          }
          className="mt-6 w-full border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Day {itineraryFields.length + 1}
        </Button>
      </div>
    </SectionWrapper>
  );
}
