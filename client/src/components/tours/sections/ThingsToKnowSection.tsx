"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, X, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface ThingsToKnowSectionProps {
   
  form: UseFormReturn<any>;
}

export default function ThingsToKnowSection({ form }: ThingsToKnowSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details.thingsToKnow",
  });

  return (
    <SectionWrapper
      id="things-to-know"
      title="Things to Know"
      description="Cards with practical information and CTAs. Leave empty to show the default global cards."
    >
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-[16px] border border-light-grey bg-light-grey/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-midnight text-sm">Card {index + 1}</span>
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
                name={`details.thingsToKnow.${index}.icon`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray">Icon</FormLabel>
                    <FormControl>
                      <IconPicker value={f.value ?? "info"} onChange={f.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.thingsToKnow.${index}.title`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Travel Information" {...f} className="border-2 border-border focus:border-crimson-red" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name={`details.thingsToKnow.${index}.description`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-dark-gray">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description…"
                      rows={2}
                      {...f}
                      className="border-2 border-border focus:border-crimson-red resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name={`details.thingsToKnow.${index}.ctaLabel`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray">CTA Label</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Learn More" {...f} className="border-2 border-border focus:border-crimson-red" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`details.thingsToKnow.${index}.ctaHref`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> CTA Link
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...f} className="border-2 border-border focus:border-crimson-red" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <p className="font-body text-b4-desktop text-dark-gray italic">
            No custom cards — the global default cards will be shown on www.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ icon: "info", title: "", description: "", ctaLabel: "", ctaHref: "" })}
          className="border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Card
        </Button>
      </div>
    </SectionWrapper>
  );
}
