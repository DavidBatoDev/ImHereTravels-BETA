"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Plus, Minus, Copy, Plane, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import SectionWrapper from "../shared/SectionWrapper";
import TourDatePicker from "../TourDatePicker";

// Helpers (moved from TourForm)
const numberToInputValue = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value);

const isValidIntegerInput = (value: string) => /^\d*$/.test(value);
const isValidDecimalInput = (value: string) => /^\d*\.?\d*$/.test(value);

const handleDecimalInputChange = (
  value: string,
  onChange: (v: string | undefined) => void,
) => {
  if (!isValidDecimalInput(value)) return;
  onChange(value === "" ? undefined : value);
};

const formatDateDisplay = (isoDate: string): string => {
  if (!isoDate) return "";
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

interface TravelDatesSectionProps {
   
  form: UseFormReturn<any>;
}

export default function TravelDatesSection({ form }: TravelDatesSectionProps) {
  const {
    fields: travelDateFields,
    append: appendTravelDate,
    remove: removeTravelDate,
  } = useFieldArray({ control: form.control, name: "travelDates" });

  return (
    <SectionWrapper
      id="travel-dates"
      title="Tour Dates"
      description="Available travel windows for this tour. Each date can have custom pricing overrides."
    >
      <div className="space-y-4">
        {travelDateFields.map((field, index) => {
          const isAvailable = form.watch(`travelDates.${index}.isAvailable`);

          return (
            <div
              key={field.id}
              className={`rounded-[16px] border-2 p-4 space-y-4 transition-colors ${
                isAvailable
                  ? "border-crimson-red/30 bg-crimson-red/5"
                  : "border-border bg-light-grey/30"
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-crimson-red text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-sans font-bold text-midnight text-sm">Tour Date {index + 1}</span>
                </div>

                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`travelDates.${index}.isAvailable`}
                    render={({ field: f }) => (
                      <FormItem>
                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white/60 rounded border border-border">
                          <FormLabel className="text-xs font-medium text-midnight">
                            {f.value ? "Active" : "Inactive"}
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={f.value}
                              onCheckedChange={f.onChange}
                              className="data-[state=checked]:bg-spring-green scale-75 -mx-1"
                            />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Duplicate date"
                    onClick={() => {
                      const values = form.getValues(`travelDates.${index}` as any) as any;
                      appendTravelDate({
                        startDate: values?.startDate || "",
                        endDate: values?.endDate || "",
                        tourDays: values?.tourDays,
                        isAvailable: values?.isAvailable ?? true,
                        customOriginal: values?.customOriginal,
                        customDiscounted: values?.customDiscounted,
                        customDeposit: values?.customDeposit,
                        hasCustomOriginal: !!values?.hasCustomOriginal,
                        hasCustomDiscounted: !!values?.hasCustomDiscounted,
                        hasCustomDeposit: !!values?.hasCustomDeposit,
                      });
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4 text-royal-purple" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTravelDate(index)}
                    disabled={travelDateFields.length === 1}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4 text-vivid-orange" />
                  </Button>
                </div>
              </div>

              {/* Date inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <FormField
                  control={form.control}
                  name={`travelDates.${index}.startDate`}
                  render={({ field: f }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel className="text-sm font-medium text-midnight flex items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5 text-crimson-red" />
                        Start
                      </FormLabel>
                      <FormControl>
                        <TourDatePicker
                          value={f.value || ""}
                          onChange={(iso) => {
                            f.onChange(iso);
                            const days = form.getValues(`travelDates.${index}.tourDays` as any) as number;
                            if (iso && days && days > 0) {
                              const end = new Date(iso);
                              end.setDate(end.getDate() + days - 1);
                              form.setValue(`travelDates.${index}.endDate` as any, end.toISOString().split("T")[0]);
                            }
                          }}
                          label="Tour Start Date"
                          minYear={2000}
                          maxYear={2050}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">&nbsp;</FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`travelDates.${index}.tourDays`}
                  render={({ field: f }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-sm font-medium text-midnight flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-crimson-red" />
                        Days
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 11"
                          value={numberToInputValue(f.value)}
                          onChange={(e) => {
                            if (!isValidIntegerInput(e.target.value)) return;
                            const days = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                            f.onChange(days);
                            const startDate = form.getValues(`travelDates.${index}.startDate` as any) as string;
                            if (startDate && days && days > 0) {
                              const end = new Date(startDate);
                              end.setDate(end.getDate() + days - 1);
                              form.setValue(`travelDates.${index}.endDate` as any, end.toISOString().split("T")[0]);
                            }
                          }}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="pl-8 h-9 text-sm border-2 border-border focus:border-spring-green"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`travelDates.${index}.endDate`}
                  render={({ field: f }) => (
                    <FormItem className="sm:col-span-4">
                      <FormLabel className="text-sm font-medium text-midnight flex items-center gap-1.5">
                        <Plane className="h-3.5 w-3.5 text-crimson-red rotate-180" />
                        End
                      </FormLabel>
                      <FormControl>
                        <div className="mt-1 w-full px-3 py-2 rounded-md bg-muted/50 text-muted-foreground border-2 border-border text-sm h-9 flex items-center cursor-not-allowed">
                          {f.value ? formatDateDisplay(f.value) : "Auto-calculated"}
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">Auto-calculated</FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              {/* Custom pricing per date */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white/60 rounded-lg border border-border">
                  <span className="text-xs font-medium text-midnight whitespace-nowrap">Add fields:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => form.setValue(`travelDates.${index}.hasCustomOriginal` as any, true)}
                    disabled={form.watch(`travelDates.${index}.hasCustomOriginal`) === true}
                  >
                    + Custom Price
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => form.setValue(`travelDates.${index}.hasCustomDeposit` as any, true)}
                    disabled={form.watch(`travelDates.${index}.hasCustomDeposit`) === true}
                  >
                    + ResFee
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground px-1">
                  Override the default pricing for this date only.
                </p>

                {(form.watch(`travelDates.${index}.hasCustomOriginal`) ||
                  form.watch(`travelDates.${index}.hasCustomDiscounted`) ||
                  form.watch(`travelDates.${index}.hasCustomDeposit`)) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white/40 rounded-lg border border-border">
                    {form.watch(`travelDates.${index}.hasCustomOriginal`) && (
                      <FormField
                        control={form.control}
                        name={`travelDates.${index}.customOriginal`}
                        render={({ field: f }) => (
                          <FormItem className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-xs font-medium">
                                Custom Price <Badge variant="outline" className="text-[9px]">Opt</Badge>
                              </FormLabel>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  form.setValue(`travelDates.${index}.hasCustomOriginal` as any, false);
                                  form.setValue(`travelDates.${index}.customOriginal` as any, undefined);
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="e.g. 1999"
                                value={numberToInputValue(f.value)}
                                onChange={(e) => handleDecimalInputChange(e.target.value, f.onChange)}
                                className="h-8 text-sm border-2 border-border focus:border-vivid-orange"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}

                    {form.watch(`travelDates.${index}.hasCustomDeposit`) && (
                      <FormField
                        control={form.control}
                        name={`travelDates.${index}.customDeposit`}
                        render={({ field: f }) => (
                          <FormItem className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-xs font-medium">
                                Reservation Fee <Badge variant="outline" className="text-[9px]">Opt</Badge>
                              </FormLabel>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  form.setValue(`travelDates.${index}.hasCustomDeposit` as any, false);
                                  form.setValue(`travelDates.${index}.customDeposit` as any, undefined);
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="e.g. 300"
                                value={numberToInputValue(f.value)}
                                onChange={(e) => handleDecimalInputChange(e.target.value, f.onChange)}
                                className="h-8 text-sm border-2 border-border focus:border-vivid-orange"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            appendTravelDate({
              startDate: "",
              endDate: "",
              isAvailable: true,
              hasCustomPricing: false,
              customOriginal: undefined,
              customDiscounted: undefined,
              customDeposit: undefined,
              hasCustomOriginal: false,
              hasCustomDiscounted: false,
              hasCustomDeposit: false,
            })
          }
          className="w-full border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tour Date
        </Button>
      </div>
    </SectionWrapper>
  );
}
