"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, Minus, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";

interface RequirementsSectionProps {
   
  form: UseFormReturn<any>;
}

export default function RequirementsSection({ form }: RequirementsSectionProps) {
  const {
    fields: requirementFields,
    append: appendRequirement,
    remove: removeRequirement,
  } = useFieldArray({ control: form.control, name: "details.requirements" as any });

  return (
    <SectionWrapper
      id="requirements"
      title="Requirements"
      description="What travellers need to prepare or be aware of before joining the tour."
    >
      <div className="space-y-3">
        {requirementFields.map((field, index) => (
          <FormField
            key={field.id}
            control={form.control}
            name={`details.requirements.${index}`}
            render={({ field: f }) => (
              <FormItem>
                <FormControl>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-vivid-orange flex-shrink-0" />
                    <Input
                      placeholder={`Requirement ${index + 1}`}
                      {...f}
                      className="flex-1 border-2 border-border focus:border-vivid-orange"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRequirement(index)}
                      disabled={requirementFields.length === 1}
                      className="h-8 w-8 text-crimson-red hover:bg-crimson-red/10 flex-shrink-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => (appendRequirement as any)("")}
          className="w-full border-vivid-orange text-vivid-orange hover:bg-vivid-orange hover:text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Requirement
        </Button>
      </div>
    </SectionWrapper>
  );
}
