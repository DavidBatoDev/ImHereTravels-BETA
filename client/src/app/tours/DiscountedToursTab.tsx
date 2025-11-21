"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DiscountEventsService, type DiscountEvent, type DiscountEventItem, type DateDiscount } from "@/services/discount-events-service";
import { getAllTours } from "@/services/tours-service";
import type { TourPackage } from "@/types/tours";
import { Plus, Trash2, Pencil, X, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DiscountedToursTab() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<DiscountEvent[]>([]);
  const [tours, setTours] = useState<TourPackage[]>([]);

  // Draft event state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventActive, setEventActive] = useState(true);
  const [draftItems, setDraftItems] = useState<DiscountEventItem[]>([]);
  
  // Date discount rate state: Map<itemIndex, Map<dateString, discountRate>>
  const [dateDiscountRates, setDateDiscountRates] = useState<Map<number, Map<string, number>>>(new Map());
  
  // Apply discount checkbox state: Map<itemIndex, Set<dateString>>
  const [applyDiscountChecked, setApplyDiscountChecked] = useState<Map<number, Set<string>>>(new Map());
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [eventToDeleteName, setEventToDeleteName] = useState<string>("");
  
  // Tour package deletion confirmation
  const [deleteTourDialogOpen, setDeleteTourDialogOpen] = useState(false);
  const [tourToDelete, setTourToDelete] = useState<number | null>(null);
  
  // View event details dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<DiscountEvent | null>(null);
  
  // Collapsible state for each tour package
  const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());

  const tourOptions = useMemo(
    () =>
      tours.map((t) => ({
        id: t.id,
        name: t.name,
        originalCost: t.pricing?.original ?? 0,
        dates: (t.travelDates || [])
          .filter(d => d.isAvailable)
          .map(d => {
            // Convert Timestamp to ISO string
            if (typeof d.startDate === 'string') {
              return d.startDate;
            } else if (typeof d.startDate?.toDate === 'function') {
              return d.startDate.toDate().toISOString().split('T')[0];
            } else if (d.startDate instanceof Date) {
              return d.startDate.toISOString().split('T')[0];
            }
            return '';
          })
          .filter(Boolean),
      })),
    [tours]
  );

  const filteredTourOptions = useMemo(() => {
    if (!searchQuery.trim()) return tourOptions;
    const query = searchQuery.toLowerCase();
    return tourOptions.filter((t) => t.name.toLowerCase().includes(query));
  }, [tourOptions, searchQuery]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [evt, allTours] = await Promise.all([
          DiscountEventsService.list(),
          getAllTours(),
        ]);
        if (!mounted) return;
        setEvents(evt);
        setTours(allTours);
      } catch (e: any) {
        toast({ title: "Failed to load", description: e?.message || "Could not load discounts/tours", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  function addDraftItem() {
    // Start with an empty item to be configured below in the transient row editor
    const newIndex = draftItems.length;
    setDraftItems((prev) => [
      ...prev,
      {
        tourPackageId: "",
        tourPackageName: "",
        originalCost: 0,
        dateDiscounts: [],
      },
    ]);
    setDateDiscountRates((prev) => {
      const next = new Map(prev);
      next.set(newIndex, new Map());
      return next;
    });
    setApplyDiscountChecked((prev) => {
      const next = new Map(prev);
      next.set(newIndex, new Set<string>());
      return next;
    });
    setSearchQuery(""); // Reset search when adding new item
  }

  function updateDraftItem(index: number, patch: Partial<DiscountEventItem>) {
    setDraftItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function updateDraftItemTour(index: number, tourId: string) {
    const found = tourOptions.find((t) => t.id === tourId);
    if (!found) return;
    updateDraftItem(index, {
      tourPackageId: found.id,
      tourPackageName: found.name,
      originalCost: found.originalCost,
      dateDiscounts: [], // Reset date discounts when changing tour package
    });
    setDateDiscountRates((prev) => {
      const next = new Map(prev);
      next.set(index, new Map());
      return next;
    });
    setApplyDiscountChecked((prev) => {
      const next = new Map(prev);
      next.set(index, new Set<string>());
      return next;
    });
    setSearchQuery(""); // Reset search after selection
  }

  function calcDiscounted(original: number, rate: number) {
    const n = Number.isFinite(original) ? original : 0;
    const r = Number.isFinite(rate) ? rate : 0;
    const v = n * (1 - r / 100);
    return Math.max(0, Math.round(v * 100) / 100);
  }

  function updateDateDiscountRate(itemIndex: number, dateStr: string, rateStr: string) {
    const rate = Number(rateStr) || 0;
    setDateDiscountRates((prev) => {
      const next = new Map(prev);
      const itemRates = next.get(itemIndex) || new Map();
      itemRates.set(dateStr, rate);
      next.set(itemIndex, itemRates);
      return next;
    });
  }

  function toggleDateSelection(index: number, dateStr: string) {
    const item = draftItems[index];
    const currentDiscounts = item.dateDiscounts || [];
    const existingIndex = currentDiscounts.findIndex(dd => dd.date === dateStr);
    
    if (existingIndex >= 0) {
      // Remove the date but KEEP the rate in tracking for when they re-select it
      const newDiscounts = currentDiscounts.filter(dd => dd.date !== dateStr);
      updateDraftItem(index, { dateDiscounts: newDiscounts });
      // DON'T remove from rate tracking - keep it so the rate persists
    } else {
      // Add the date - use existing rate from tracking or default to 0%
      const rate = dateDiscountRates.get(index)?.get(dateStr) || 0;
      const original = item.originalCost || 0;
      const discountedCost = calcDiscounted(original, rate);
      const newDiscounts = [...currentDiscounts, { date: dateStr, discountRate: rate, discountedCost }];
      updateDraftItem(index, { dateDiscounts: newDiscounts });
    }
  }

  function getAvailableDatesForTour(tourId: string): string[] {
    const tour = tourOptions.find((t) => t.id === tourId);
    return tour?.dates || [];
  }

  function confirmRemoveTourPackage(index: number) {
    setTourToDelete(index);
    setDeleteTourDialogOpen(true);
  }

  function removeDraftItem(index: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
    // Clean up collapsed state
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    // Clean up date discount rates
    setDateDiscountRates((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
    setApplyDiscountChecked((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
    setDeleteTourDialogOpen(false);
    setTourToDelete(null);
    toast({ title: "Tour package removed" });
  }

  function toggleCollapse(index: number) {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function saveEvent() {
    try {
      if (!eventName.trim()) {
        toast({ title: "Event name required", variant: "destructive" });
        return;
      }
      if (draftItems.length === 0) {
        toast({ title: "Add at least one tour", variant: "destructive" });
        return;
      }
      // Basic validation per item
      for (const it of draftItems) {
        if (!it.tourPackageId) throw new Error("Each item must select a tour package");
        if (!it.dateDiscounts || it.dateDiscounts.length === 0) throw new Error("Each item must include at least one tour date");
      }

      const cleanedItems = draftItems;

      if (editingEventId) {
        // Update existing event
        await DiscountEventsService.update(editingEventId, {
          name: eventName.trim(),
          active: eventActive,
          items: cleanedItems,
        });
        toast({ title: "Event updated successfully" });
      } else {
        // Create new event
        const id = await DiscountEventsService.create({
          name: eventName.trim(),
          active: eventActive,
          items: cleanedItems,
        });
        toast({ title: "Event created successfully", description: `Event ID: ${id}` });
      }

      // Refresh list and reset draft
      const updated = await DiscountEventsService.list();
      setEvents(updated);
      resetForm();
    } catch (e: any) {
      toast({ title: "Failed to save", description: e?.message || "Unable to save event", variant: "destructive" });
    }
  }

  function resetForm() {
    setEditingEventId(null);
    setEventName("");
    setEventActive(true);
    setDraftItems([]);
    setCollapsedItems(new Set());
    setDateDiscountRates(new Map());
    setApplyDiscountChecked(new Map());
  }

  function editEvent(evt: DiscountEvent) {
    setEditingEventId(evt.id);
    setEventName(evt.name);
    setEventActive(evt.active);
    setDraftItems(evt.items.map(item => ({
      ...item,
      dateDiscounts: item.dateDiscounts || []
    })));
    // Rebuild dateDiscountRates from existing data
    const ratesMap = new Map<number, Map<string, number>>();
    const checkedMap = new Map<number, Set<string>>();
    evt.items.forEach((item, itemIndex) => {
      const itemRates = new Map<string, number>();
      const itemChecked = new Set<string>();
      (item.dateDiscounts || []).forEach(dd => {
        itemRates.set(dd.date, dd.discountRate);
        if (dd.discountRate > 0) {
          itemChecked.add(dd.date);
        }
      });
      ratesMap.set(itemIndex, itemRates);
      checkedMap.set(itemIndex, itemChecked);
    });
    setDateDiscountRates(ratesMap);
    setApplyDiscountChecked(checkedMap);
    setSearchQuery("");
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function confirmDelete(id: string, name: string) {
    setEventToDelete(id);
    setEventToDeleteName(name);
    setDeleteDialogOpen(true);
  }

  async function deleteEvent() {
    if (!eventToDelete) return;
    try {
      await DiscountEventsService.remove(eventToDelete);
      toast({ title: "Event deleted successfully" });
      const updated = await DiscountEventsService.list();
      setEvents(updated);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      
      // If we were editing this event, reset the form
      if (editingEventId === eventToDelete) {
        resetForm();
      }
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
    }
  }

  async function toggleEventActive(id: string, active: boolean) {
    try {
      await DiscountEventsService.setActive(id, active);
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, active } : e)));
    } catch (e: any) {
      toast({ title: "Failed to update", description: e?.message, variant: "destructive" });
    }
  }

  function viewEventDetails(evt: DiscountEvent) {
    setViewingEvent(evt);
    setViewDialogOpen(true);
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{editingEventId ? "Edit Discount Event" : "Create Discount Event"}</CardTitle>
              <CardDescription>
                Define an event with selected tour packages, dates, and discount rates.
              </CardDescription>
            </div>
            {editingEventId && (
              <Button variant="outline" onClick={resetForm}>
                <X className="mr-2 h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Name and Active Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input 
                id="eventName" 
                placeholder="e.g. Black Friday 2025" 
                value={eventName} 
                onChange={(e) => setEventName(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <Switch id="eventActive" checked={eventActive} onCheckedChange={setEventActive} />
              <Label htmlFor="eventActive" className="text-base">Active</Label>
            </div>
          </div>

          {/* Add Tour Button */}
          <div className="flex justify-start">
            <Button type="button" onClick={addDraftItem} size="lg">
              <Plus className="mr-2 h-5 w-5" /> Add Tour Package
            </Button>
          </div>

          {/* Tour Items */}
          {draftItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tour Packages</h3>
              {draftItems.map((item, idx) => {
                const isCollapsed = collapsedItems.has(idx);
                return (
                  <Card key={idx} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 z-10"
                      onClick={() => confirmRemoveTourPackage(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    
                    {/* Collapsible Header */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCollapse(idx)}
                    >
                      <div className="flex items-center gap-3 flex-1 pr-12">
                        <div className="flex-shrink-0">
                          {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">
                            {item.tourPackageName || `Tour Package ${idx + 1}`}
                          </div>
                          {item.tourPackageName && (
                            <div className="text-sm text-muted-foreground">
                              <span>£{item.originalCost} • {item.dateDiscounts?.length || 0} date{(item.dateDiscounts?.length || 0) !== 1 ? 's' : ''} with discounts</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {!isCollapsed && (
                      <CardContent className="pt-0 pb-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tour Package</Label>
                            <Select value={item.tourPackageId} onValueChange={(v) => updateDraftItemTour(idx, v)}>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select tour package" />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                <div className="sticky top-0 z-10 bg-background p-2 border-b">
                                  <Input
                                    type="text"
                                    placeholder="Search tour packages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                  {filteredTourOptions.length === 0 ? (
                                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                      No tour packages found
                                    </div>
                                  ) : (
                                    filteredTourOptions.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))
                                  )}
                                </div>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Original Cost (£)</Label>
                            <Input 
                              type="number" 
                              value={item.originalCost || ""} 
                              placeholder="0.00"
                              readOnly 
                              className="h-11 bg-muted"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Tour Dates</Label>
                            {item.tourPackageId && getAvailableDatesForTour(item.tourPackageId).length > 0 && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  placeholder="Rate %"
                                  className="h-8 w-20 text-sm"
                                  id={`bulk-rate-${idx}`}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.getElementById(`bulk-rate-${idx}`) as HTMLInputElement;
                                    const rate = Number(input?.value) || 0;
                                    if (rate < 0 || rate > 100) {
                                      toast({ title: "Invalid rate", description: "Rate must be between 0-100%", variant: "destructive" });
                                      return;
                                    }
                                    // Apply to dates where "Apply discount" checkbox is checked
                                    const checkedDates = Array.from(applyDiscountChecked.get(idx) || new Set());
                                    if (checkedDates.length === 0) {
                                      toast({ title: "No dates marked", description: "Check 'Apply discount' on dates first", variant: "destructive" });
                                      return;
                                    }
                                    // Update only checked dates
                                    const newDiscounts = (item.dateDiscounts || []).map(dd => 
                                      checkedDates.includes(dd.date)
                                        ? { ...dd, discountRate: rate, discountedCost: calcDiscounted(item.originalCost, rate) }
                                        : dd
                                    );
                                    updateDraftItem(idx, { dateDiscounts: newDiscounts });
                                    // Update rate tracking
                                    setDateDiscountRates((prev) => {
                                      const next = new Map(prev);
                                      const itemRates = next.get(idx) || new Map();
                                      checkedDates.forEach(date => itemRates.set(date, rate));
                                      next.set(idx, itemRates);
                                      return next;
                                    });
                                    toast({ title: "Rates applied", description: `${rate}% applied to ${checkedDates.length} date${checkedDates.length !== 1 ? 's' : ''}` });
                                  }}
                                >
                                  Apply to Selected
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.getElementById(`bulk-rate-${idx}`) as HTMLInputElement;
                                    const rate = Number(input?.value) || 0;
                                    if (rate < 0 || rate > 100) {
                                      toast({ title: "Invalid rate", description: "Rate must be between 0-100%", variant: "destructive" });
                                      return;
                                    }
                                    // Apply to all toggled ON dates (dates in dateDiscounts array)
                                    const toggledOnDates = (item.dateDiscounts || []).map(dd => dd.date);
                                    if (toggledOnDates.length === 0) {
                                      toast({ title: "No dates toggled", description: "Toggle dates ON first", variant: "destructive" });
                                      return;
                                    }
                                    // Update all toggled ON dates
                                    const newDiscounts = (item.dateDiscounts || []).map(dd => ({
                                      ...dd,
                                      discountRate: rate,
                                      discountedCost: calcDiscounted(item.originalCost, rate)
                                    }));
                                    updateDraftItem(idx, { dateDiscounts: newDiscounts });
                                    // Update rate tracking and checkboxes
                                    setDateDiscountRates((prev) => {
                                      const next = new Map(prev);
                                      const itemRates = next.get(idx) || new Map();
                                      toggledOnDates.forEach(date => itemRates.set(date, rate));
                                      next.set(idx, itemRates);
                                      return next;
                                    });
                                    setApplyDiscountChecked((prev) => {
                                      const next = new Map(prev);
                                      const itemChecked = new Set<string>(toggledOnDates);
                                      next.set(idx, itemChecked);
                                      return next;
                                    });
                                    toast({ title: "Rates applied", description: `${rate}% applied to ${toggledOnDates.length} date${toggledOnDates.length !== 1 ? 's' : ''}` });
                                  }}
                                >
                                  Apply to All
                                </Button>
                              </div>
                            )}
                          </div>
                          {!item.tourPackageId ? (
                            <div className="text-sm text-muted-foreground italic p-4 border rounded-md bg-muted/30">
                              Select a tour package first to view available dates
                            </div>
                          ) : (() => {
                            const availableDates = getAvailableDatesForTour(item.tourPackageId);
                            if (availableDates.length === 0) {
                              return (
                                <div className="text-sm text-amber-600 p-4 border border-amber-200 rounded-md bg-amber-50 space-y-3">
                                  <div>
                                    <strong>No dates available.</strong> Please add tour dates in the Tour Packages page first.
                                  </div>
                                  <Link 
                                    href={`/tours?tab=packages&tourId=${item.tourPackageId}&mode=edit`}
                                    className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2"
                                  >
                                    Add dates to {item.tourPackageName} →
                                  </Link>
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-3 border rounded-md p-4 max-h-96 overflow-y-auto">
                                {availableDates.map((dateStr) => {
                                  const isSelected = (item.dateDiscounts || []).some(dd => dd.date === dateStr);
                                  const currentRate = dateDiscountRates.get(idx)?.get(dateStr) || 0;
                                  const discountedCost = calcDiscounted(item.originalCost, currentRate);
                                  const isCheckedForBulk = applyDiscountChecked.get(idx)?.has(dateStr) || false;
                                  
                                  return (
                                    <div
                                      key={dateStr}
                                      className="flex items-center gap-3 p-3 border rounded-md bg-background hover:shadow-sm transition-shadow"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Switch
                                          checked={isSelected}
                                          onCheckedChange={() => toggleDateSelection(idx, dateStr)}
                                          className="flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium">
                                            {new Date(dateStr).toLocaleDateString('en-US', {
                                              weekday: 'short',
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric'
                                            })}
                                          </div>
                                          {isSelected && currentRate > 0 && (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                              <span className="line-through">£{item.originalCost}</span>
                                              {" → "}
                                              <span className="font-semibold text-green-600">£{discountedCost}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={isCheckedForBulk}
                                              onChange={(e) => {
                                                setApplyDiscountChecked((prev) => {
                                                  const next = new Map(prev);
                                                  const itemChecked = new Set<string>(next.get(idx) ?? []);
                                                  if (e.target.checked) {
                                                    itemChecked.add(dateStr);
                                                  } else {
                                                    itemChecked.delete(dateStr);
                                                  }
                                                  next.set(idx, itemChecked);
                                                  return next;
                                                });
                                              }}
                                              className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <span className="text-sm text-muted-foreground">Apply discount</span>
                                          </label>
                                          <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={currentRate || ""}
                                            placeholder="0"
                                            onChange={(e) => {
                                              updateDateDiscountRate(idx, dateStr, e.target.value);
                                              const newDiscounts = (item.dateDiscounts || []).map(dd => 
                                                dd.date === dateStr 
                                                  ? { ...dd, discountRate: Number(e.target.value) || 0, discountedCost: calcDiscounted(item.originalCost, Number(e.target.value) || 0) }
                                                  : dd
                                              );
                                              updateDraftItem(idx, { dateDiscounts: newDiscounts });
                                            }}
                                            className="h-9 w-20 text-sm"
                                          />
                                          <span className="text-sm text-muted-foreground">%</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          {item.tourPackageId && (item.dateDiscounts?.length || 0) > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {item.dateDiscounts?.length || 0} date{(item.dateDiscounts?.length || 0) !== 1 ? 's' : ''} selected
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4">
            {editingEventId && (
              <Button variant="outline" onClick={resetForm} size="lg">
                Cancel
              </Button>
            )}
            <Button 
              onClick={saveEvent} 
              disabled={loading || !eventName.trim() || draftItems.length === 0}
              size="lg"
            >
              {editingEventId ? "Update Event" : "Save Event"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Discount Events</CardTitle>
          <CardDescription>Manage your discount events - edit, delete, or toggle active state.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-2">No discount events yet</p>
              <p className="text-sm">Create your first discount event to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((evt) => (
                <div 
                  key={evt.id} 
                  className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
                    editingEventId === evt.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:shadow-sm'
                  }`}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{evt.name}</span>
                      {evt.active ? (
                        <Badge variant="default" className="px-2.5 py-0.5">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="px-2.5 py-0.5">Inactive</Badge>
                      )}
                      {editingEventId === evt.id && (
                        <Badge variant="outline" className="px-2.5 py-0.5">Editing</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {evt.items.length} tour package{evt.items.length !== 1 ? "s" : ""} • {evt.items.reduce((acc, it) => acc + (it.dateDiscounts?.length || 0), 0)} date{evt.items.reduce((acc, it) => acc + (it.dateDiscounts?.length || 0), 0) !== 1 ? "s" : ""}
                    </div>
                    
                    {/* Show tour packages */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {evt.items.map((item, idx) => {
                        const avgDiscount = item.dateDiscounts && item.dateDiscounts.length > 0
                          ? Math.round(item.dateDiscounts.reduce((sum, dd) => sum + dd.discountRate, 0) / item.dateDiscounts.length)
                          : 0;
                        return (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item.tourPackageName} - {item.dateDiscounts?.length || 0} dates (avg {avgDiscount}% off)
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                      <Switch 
                        checked={evt.active} 
                        onCheckedChange={(v) => toggleEventActive(evt.id, v)}
                        disabled={editingEventId === evt.id}
                      />
                      <span className="text-sm font-medium whitespace-nowrap">
                        {evt.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => viewEventDetails(evt)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => editEvent(evt)}
                      disabled={editingEventId === evt.id}
                      title="Edit event"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => confirmDelete(evt.id, evt.name)}
                      className="text-destructive hover:text-destructive"
                      title="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Event Details Dialog */}
      <AlertDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-3">
              {viewingEvent?.name}
              {viewingEvent?.active ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Detailed view of all tour packages and discounted dates in this event
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {viewingEvent && (
            <div className="space-y-6 py-4">
              {viewingEvent.items.map((item, itemIdx) => (
                <Card key={itemIdx}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.tourPackageName}</CardTitle>
                        <CardDescription>
                          Original Price: £{item.originalCost} • {item.dateDiscounts?.length || 0} discounted date{(item.dateDiscounts?.length || 0) !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      {item.dateDiscounts && item.dateDiscounts.length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          Avg {Math.round(item.dateDiscounts.reduce((sum, dd) => sum + dd.discountRate, 0) / item.dateDiscounts.length)}% off
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!item.dateDiscounts || item.dateDiscounts.length === 0 ? (
                      <div className="text-sm text-muted-foreground italic">
                        No discounted dates configured
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {item.dateDiscounts
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map((dd, dateIdx) => (
                            <div
                              key={dateIdx}
                              className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {new Date(dd.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <span className="line-through">£{item.originalCost}</span>
                                  {" → "}
                                  <span className="font-semibold text-green-600">£{dd.discountedCost}</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="ml-2">
                                {dd.discountRate}% off
                              </Badge>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Event Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Discount Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">"{eventToDeleteName}"</span>? This action cannot be undone and will permanently remove this discount event and all its associated tour packages and dates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tour Package Confirmation Dialog */}
      <AlertDialog open={deleteTourDialogOpen} onOpenChange={setDeleteTourDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tour Package?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">"{tourToDelete !== null && draftItems[tourToDelete]?.tourPackageName ? draftItems[tourToDelete].tourPackageName : "this tour package"}"</span> from the event? All dates associated with this package will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTourToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => tourToDelete !== null && removeDraftItem(tourToDelete)} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Package
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
