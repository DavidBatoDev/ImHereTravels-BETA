"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, X, Route } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";
import IconPicker from "../shared/IconPicker";
import TagChip from "../shared/TagChip";

interface HeaderSectionProps {
   
  form: UseFormReturn<any>;
}

export default function HeaderSection({ form }: HeaderSectionProps) {
  const { fields: tagFields, append: appendTag, remove: removeTag } = useFieldArray({
    control: form.control,
    name: "details.tags",
  });

  const watchedTags = form.watch("details.tags") as Array<{ label: string; icon: string }> | undefined;

  return (
    <SectionWrapper
      id="header"
      title="Header & Tags"
      description="Location/theme tags shown in the tour header, and the route label shown in Key Facts."
    >
      <div className="space-y-8">
        {/* Route field */}
        <FormField
          control={form.control}
          name="details.route"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-sans font-bold text-midnight flex items-center gap-2">
                <Route className="h-4 w-4 text-crimson-red" />
                Route Label
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Punakha → Paro → Thimphu"
                  {...field}
                  value={field.value ?? ""}
                  className="border-2 border-border focus:border-crimson-red"
                />
              </FormControl>
              <FormDescription className="font-body text-b4-desktop text-dark-gray">
                Shown in the Key Facts row and Booking Card as the route label.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <div className="space-y-4">
          <div>
            <p className="font-sans font-bold text-midnight text-sm">Location / Theme Tags</p>
            <p className="font-body text-b4-desktop text-dark-gray mt-0.5">
              Tags shown in the coloured chips below the tour title. Falls back to location + destinations if empty.
            </p>
          </div>

          {/* Live tag preview */}
          {watchedTags && watchedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-[16px] bg-light-grey/60 px-4 py-3">
              {watchedTags.map((tag, i) => (
                <TagChip key={i} label={tag.label || "…"} icon={tag.icon} index={i} />
              ))}
            </div>
          )}

          {/* Tag editors */}
          <div className="space-y-3">
            {tagFields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-[16px] border border-light-grey bg-light-grey/30 px-4 py-3"
              >
                <FormField
                  control={form.control}
                  name={`details.tags.${index}.label`}
                  render={({ field: f }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-medium text-dark-gray">Label</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Buenos Aires"
                          {...f}
                          className="border-2 border-border focus:border-crimson-red h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`details.tags.${index}.icon`}
                  render={({ field: f }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-medium text-dark-gray">Icon</FormLabel>
                      <FormControl>
                        <IconPicker value={f.value ?? "location"} onChange={f.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTag(index)}
                  className="h-9 w-9 text-crimson-red hover:bg-crimson-red/10 mb-0.5"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendTag({ label: "", icon: "location" })}
            className="border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Tag
          </Button>
        </div>
      </div>
    </SectionWrapper>
  );
}
