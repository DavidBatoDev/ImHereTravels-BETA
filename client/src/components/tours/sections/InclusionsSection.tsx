"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, X } from "lucide-react";
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
import IconPicker, { ICON_MAP } from "../shared/IconPicker";

interface InclusionsSectionProps {
   
  form: UseFormReturn<any>;
}

export default function InclusionsSection({ form }: InclusionsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details.inclusions",
  });

  const watchedInclusions = form.watch("details.inclusions") as Array<{
    icon?: string;
    label: string;
    value: string;
  }> | undefined;

  return (
    <SectionWrapper
      id="inclusions"
      title="What's Included"
      description="List everything included in the tour price (meals, transport, accommodation, activities, etc.)."
    >
      <div className="space-y-4">
        {/* Live 2-col preview */}
        {watchedInclusions && watchedInclusions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-[16px] bg-light-grey/60 px-4 py-4 mb-2">
            {watchedInclusions.map((inc, i) => {
              const iconEntry = ICON_MAP[inc.icon ?? "plus"];
              const Icon = iconEntry?.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white shadow-xsmall">
                    {Icon && <Icon className="h-4 w-4 text-midnight" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-sans font-bold text-midnight text-sm truncate">{inc.label || "—"}</p>
                    <p className="font-body text-b4-desktop text-dark-gray truncate">{inc.value || "—"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Editors */}
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-end rounded-[16px] border border-light-grey bg-light-grey/30 px-4 py-3"
          >
            {/* Icon picker */}
            <FormField
              control={form.control}
              name={`details.inclusions.${index}.icon`}
              render={({ field: f }) => (
                <FormItem className="w-40 space-y-1">
                  <FormLabel className="text-xs font-medium text-dark-gray">Icon</FormLabel>
                  <FormControl>
                    <IconPicker value={f.value ?? "plus"} onChange={f.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {/* Label */}
            <FormField
              control={form.control}
              name={`details.inclusions.${index}.label`}
              render={({ field: f }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium text-dark-gray">Label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Meals" {...f} className="border-2 border-border focus:border-crimson-red h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Value */}
            <FormField
              control={form.control}
              name={`details.inclusions.${index}.value`}
              render={({ field: f }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs font-medium text-dark-gray">Detail</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Breakfast & dinner daily" {...f} className="border-2 border-border focus:border-crimson-red h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              className="h-9 w-9 text-crimson-red hover:bg-crimson-red/10 mb-0.5"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ icon: "plus", label: "", value: "" })}
          className="border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Inclusion
        </Button>
      </div>
    </SectionWrapper>
  );
}
