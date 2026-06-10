"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";
import IconPicker from "../shared/IconPicker";

interface TipsSectionProps {
   
  form: UseFormReturn<any>;
}

export default function TipsSection({ form }: TipsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details.tips",
  });

  return (
    <SectionWrapper
      id="tips"
      title="Tips"
      description="Practical travel tips shown below the itinerary. Leave empty to show the default global tips."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-2xl border border-light-grey bg-light-grey/30 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans font-bold text-midnight text-xs">Tip {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="h-7 w-7 text-crimson-red hover:bg-crimson-red/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <FormField
                control={form.control}
                name={`details.tips.${index}.icon`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray">Icon</FormLabel>
                    <FormControl>
                      <IconPicker value={f.value ?? "luggage"} onChange={f.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`details.tips.${index}.title`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Pack Smart" {...f} className="border-2 border-border focus:border-crimson-red" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`details.tips.${index}.description`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-dark-gray">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Short tip…"
                        rows={2}
                        {...f}
                        className="border-2 border-border focus:border-crimson-red resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>

        {fields.length === 0 && (
          <p className="font-body text-b4-desktop text-dark-gray italic">
            No custom tips — the global default tips will be shown on www.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ icon: "luggage", title: "", description: "" })}
          className="border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Tip
        </Button>
      </div>
    </SectionWrapper>
  );
}
