"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, Minus, Image as ImageIcon, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";
import {
  createBlobUrl,
  validateImageFile,
} from "@/utils/blob-image";
import { useToast } from "@/hooks/use-toast";

interface HighlightsSectionProps {
   
  form: UseFormReturn<any>;
}

export default function HighlightsSection({ form }: HighlightsSectionProps) {
  const { toast } = useToast();
  const {
    fields: highlightFields,
    append: appendHighlight,
    remove: removeHighlight,
  } = useFieldArray({ control: form.control, name: "details.highlights" as any });

  return (
    <SectionWrapper
      id="highlights"
      title="Trip Highlights"
      description="Key experiences shown in a carousel on the tour page. Each highlight can include an optional image and subtitle."
    >
      <div className="space-y-4">
        {highlightFields.map((field, index) => {
          const currentValue = form.watch(`details.highlights.${index}` as any);
          const isObject = typeof currentValue === "object" && currentValue !== null;
          const highlightText = isObject ? currentValue.text : currentValue;
          const highlightImage = isObject ? currentValue.image : undefined;
          const highlightSubtitle = isObject ? currentValue.subtitle : undefined;

          return (
            <div
              key={field.id}
              className="rounded-[16px] border border-light-grey bg-light-grey/30 p-4 space-y-3 group"
            >
              {/* Text + remove */}
              <FormField
                control={form.control}
                name={`details.highlights.${index}`}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-sunglow-yellow rounded-full flex-shrink-0" />
                        <Input
                          placeholder={`Highlight ${index + 1}`}
                          value={highlightText || ""}
                          onChange={(e) => {
                            if (isObject) {
                              formField.onChange({ ...currentValue, text: e.target.value });
                            } else {
                              formField.onChange(e.target.value);
                            }
                          }}
                          className="border-none bg-transparent focus:ring-2 focus:ring-sunglow-yellow rounded px-2 flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHighlight(index)}
                          disabled={highlightFields.length === 1}
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

              {/* Subtitle (new field) */}
              <div className="pl-5">
                <Input
                  placeholder="Optional subtitle (shown below title on www)"
                  value={highlightSubtitle ?? ""}
                  onChange={(e) => {
                    const base = isObject ? currentValue : { text: currentValue ?? "", image: undefined };
                    form.setValue(`details.highlights.${index}` as any, {
                      ...base,
                      subtitle: e.target.value || undefined,
                    });
                  }}
                  className="border-2 border-border focus:border-sunglow-yellow text-sm h-8"
                />
              </div>

              {/* Image section */}
              <div className="pl-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-midnight">Highlight Image</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-gray">Upload</span>
                    <Switch
                      checked={highlightImage === ""}
                      onCheckedChange={(checked) => {
                        const base = isObject ? currentValue : { text: currentValue ?? "" };
                        form.setValue(`details.highlights.${index}` as any, {
                          ...base,
                          image: checked ? "" : undefined,
                        });
                      }}
                    />
                    <span className="text-xs text-dark-gray">URL</span>
                    {highlightImage !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {highlightImage === "" ? "URL Mode" : highlightImage ? "Image Set" : "Upload Mode"}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Image preview */}
                {highlightImage && highlightImage !== "" && (
                  <div className="relative group/image">
                    <img
                      src={highlightImage}
                      alt={`Highlight ${index + 1}`}
                      className="w-full h-32 object-contain rounded-[12px] border border-border bg-light-grey/50"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const base = isObject ? currentValue : { text: currentValue ?? "" };
                        form.setValue(`details.highlights.${index}` as any, { ...base, image: undefined });
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 h-7 w-7 p-0 bg-crimson-red"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* URL input mode */}
                {highlightImage === "" && (
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value=""
                    onChange={(e) => {
                      const base = isObject ? currentValue : { text: currentValue ?? "" };
                      form.setValue(`details.highlights.${index}` as any, { ...base, image: e.target.value });
                    }}
                    className="border-2 border-border focus:border-sunglow-yellow"
                  />
                )}

                {/* File upload mode */}
                {highlightImage === undefined && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = async (e: Event) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        const validation = validateImageFile(file);
                        if (!validation.valid) {
                          toast({ title: "Invalid image", description: validation.error, variant: "destructive" });
                          return;
                        }
                        const blobUrl = createBlobUrl(file);
                        const base = isObject ? currentValue : { text: currentValue ?? "" };
                        form.setValue(`details.highlights.${index}` as any, { ...base, image: blobUrl });
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-sunglow-yellow text-sunglow-yellow hover:bg-sunglow-yellow/10"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={() => (appendHighlight as any)({ text: "", image: undefined, subtitle: undefined })}
          className="w-full border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Highlight
        </Button>
      </div>
    </SectionWrapper>
  );
}
