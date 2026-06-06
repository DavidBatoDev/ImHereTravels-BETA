"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, X, ChevronDown } from "lucide-react";
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

interface FaqsSectionProps {
   
  form: UseFormReturn<any>;
}

export default function FaqsSection({ form }: FaqsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "details.faqs",
  });

  return (
    <SectionWrapper
      id="faqs"
      title="FAQs"
      description="Frequently asked questions shown in an accordion on the tour page."
    >
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-[16px] border border-light-grey bg-light-grey/30 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-crimson-red flex-shrink-0" />
              <span className="font-sans font-bold text-midnight text-sm flex-1">
                FAQ {index + 1}
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

            <FormField
              control={form.control}
              name={`details.faqs.${index}.question`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-dark-gray">Question</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. What's the best time to visit?"
                      {...f}
                      className="border-2 border-border focus:border-crimson-red"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`details.faqs.${index}.answer`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-dark-gray">Answer</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a clear, helpful answer…"
                      rows={3}
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ question: "", answer: "" })}
          className="border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add FAQ
        </Button>
      </div>
    </SectionWrapper>
  );
}
