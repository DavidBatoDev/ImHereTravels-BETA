"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { GitBranch, MapPin, Clock, Banknote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TourPackage } from "@/types/tours";
import { createHostedTour } from "@/services/hosted-tours-service";

interface CreateHostedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  tours: TourPackage[];
  onSuccess: (hostedTourId: string) => void;
  preSelectedParentId?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeForComparison(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function getCurrencySymbol(currency: string) {
  switch (currency) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    default: return currency;
  }
}

export default function CreateHostedTourModal({
  isOpen,
  onClose,
  tours,
  onSuccess,
  preSelectedParentId,
}: CreateHostedTourModalProps) {
  const { toast } = useToast();
  const [selectedParentId, setSelectedParentId] = useState<string>(
    preSelectedParentId ?? "",
  );
  const [hostedTourName, setHostedTourName] = useState("");
  const [hostedTourCode, setHostedTourCode] = useState("");
  const [hostedTourUrl, setHostedTourUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [urlError, setUrlError] = useState("");

  const selectableTours = useMemo(
    () => tours.filter((t) => t.status !== "archived"),
    [tours],
  );

  const selectedParent = useMemo(
    () => selectableTours.find((t) => t.id === selectedParentId) ?? null,
    [selectableTours, selectedParentId],
  );

  function validateName(name: string, parent = selectedParent): string {
    if (!name.trim()) return "Hosted tour name is required";
    if (parent && normalizeForComparison(name) === normalizeForComparison(parent.name)) {
      return "Name must be different from the parent tour name";
    }
    return "";
  }

  function validateCode(code: string, parent = selectedParent): string {
    if (!code.trim()) return "Tour code is required";
    if (parent && code.trim().toUpperCase() === parent.tourCode?.trim().toUpperCase()) {
      return "Tour code must be different from the parent tour code";
    }
    return "";
  }

  function validateUrl(url: string, parent = selectedParent): string {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return "Website URL is required";
    if (!isValidUrl(trimmedUrl)) return "Website URL must be a valid URL";
    if (parent?.url && normalizeForComparison(trimmedUrl) === normalizeForComparison(parent.url)) {
      return "Website URL must be different from the parent tour URL";
    }
    return "";
  }

  function handleNameChange(val: string) {
    setHostedTourName(val);
    setNameError(validateName(val));
  }

  function handleCodeChange(val: string) {
    setHostedTourCode(val.toUpperCase());
    setCodeError(validateCode(val));
  }

  function handleUrlChange(val: string) {
    setHostedTourUrl(val);
    setUrlError(validateUrl(val));
  }

  function handleParentChange(val: string) {
    setSelectedParentId(val);
    const parent = selectableTours.find((t) => t.id === val);
    if (hostedTourName) {
      setNameError(validateName(hostedTourName, parent ?? null));
    }
    if (hostedTourCode) {
      setCodeError(validateCode(hostedTourCode, parent ?? null));
    }
    if (hostedTourUrl) {
      setUrlError(validateUrl(hostedTourUrl, parent ?? null));
    }
  }

  async function handleSubmit() {
    const nameErr = validateName(hostedTourName);
    const codeErr = validateCode(hostedTourCode);
    const urlErr = validateUrl(hostedTourUrl);
    if (nameErr) setNameError(nameErr);
    if (codeErr) setCodeError(codeErr);
    if (urlErr) setUrlError(urlErr);
    if (nameErr || codeErr || urlErr || !selectedParentId) return;

    setIsSubmitting(true);
    try {
      const slug = generateSlug(hostedTourName);
      const id = await createHostedTour({
        parentTourId: selectedParentId,
        name: hostedTourName.trim(),
        slug,
        tourCode: hostedTourCode.trim().toUpperCase(),
        url: hostedTourUrl.trim(),
      });
      toast({ title: "Success", description: "Hosted tour created successfully!" });
      onSuccess(id);
      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create hosted tour",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    setSelectedParentId(preSelectedParentId ?? "");
    setHostedTourName("");
    setHostedTourCode("");
    setHostedTourUrl("");
    setNameError("");
    setCodeError("");
    setUrlError("");
    onClose();
  }

  const isValid =
    selectedParentId &&
    hostedTourName.trim().length > 0 &&
    hostedTourCode.trim().length > 0 &&
    hostedTourUrl.trim().length > 0 &&
    !nameError &&
    !codeError &&
    !urlError;

  const basePrice = selectedParent
    ? typeof selectedParent.pricing?.discounted === "number" && selectedParent.pricing.discounted > 0
      ? selectedParent.pricing.discounted
      : selectedParent.pricing?.original ?? 0
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg border border-royal-purple/20 dark:border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-hk-grotesk">
            <GitBranch className="h-5 w-5 text-royal-purple" />
            Create Hosted Tour
          </DialogTitle>
          <DialogDescription>
            Duplicate an existing tour package and personalize it as a hosted experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Parent Tour Select */}
          <div className="space-y-2">
            <Label htmlFor="parent-tour" className="text-sm font-medium">
              Parent Tour <span className="text-crimson-red">*</span>
            </Label>
            <Select value={selectedParentId} onValueChange={handleParentChange}>
              <SelectTrigger
                id="parent-tour"
                className="border-royal-purple/20 focus:ring-royal-purple/30"
              >
                <SelectValue placeholder="Select a tour to duplicate..." />
              </SelectTrigger>
              <SelectContent>
                {selectableTours.map((tour) => (
                  <SelectItem key={tour.id} value={tour.id}>
                    <span className="font-mono text-xs text-muted-foreground mr-2">
                      [{tour.tourCode}]
                    </span>
                    {tour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parent Tour Preview */}
          {selectedParent && (
            <div className="rounded-lg border border-royal-purple/20 bg-muted/30 p-3 flex gap-3">
              <div className="relative h-16 w-24 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                {selectedParent.media?.coverImage ? (
                  <Image
                    src={selectedParent.media.coverImage}
                    alt={selectedParent.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-medium text-sm text-foreground truncate">
                  {selectedParent.name}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedParent.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {selectedParent.duration}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Banknote className="h-3 w-3" />
                  <span className="font-semibold text-foreground">
                    {getCurrencySymbol(selectedParent.pricing?.currency)}{basePrice.toLocaleString()}
                  </span>
                  <span>base price</span>
                </div>
              </div>
            </div>
          )}

          {/* Hosted Tour Name + Tour Code */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hosted-tour-name" className="text-sm font-medium">
                Hosted Tour Name <span className="text-crimson-red">*</span>
              </Label>
              <Input
                id="hosted-tour-name"
                value={hostedTourName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Jolly Popcorn Experience"
                className={`border-royal-purple/20 focus:ring-royal-purple/30 ${
                  nameError ? "border-crimson-red focus:ring-crimson-red/30" : ""
                }`}
              />
              {nameError && (
                <p className="text-xs text-crimson-red">{nameError}</p>
              )}
              {hostedTourName && !nameError && (
                <p className="text-xs text-muted-foreground">
                  Slug: <span className="font-mono">{generateSlug(hostedTourName)}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hosted-tour-code" className="text-sm font-medium">
                Tour Code <span className="text-crimson-red">*</span>
              </Label>
              <Input
                id="hosted-tour-code"
                value={hostedTourCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder={selectedParent ? `≠ ${selectedParent.tourCode}` : "e.g., IHT-001-H"}
                className={`border-royal-purple/20 focus:ring-royal-purple/30 font-mono uppercase ${
                  codeError ? "border-crimson-red focus:ring-crimson-red/30" : ""
                }`}
              />
              {codeError && (
                <p className="text-xs text-crimson-red">{codeError}</p>
              )}
            </div>
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="hosted-tour-url" className="text-sm font-medium">
              Website URL <span className="text-crimson-red">*</span>
            </Label>
            <Input
              id="hosted-tour-url"
              type="url"
              value={hostedTourUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com/hosted-tour-page"
              className={`border-royal-purple/20 focus:ring-royal-purple/30 ${
                urlError ? "border-crimson-red focus:ring-crimson-red/30" : ""
              }`}
            />
            {urlError && (
              <p className="text-xs text-crimson-red">{urlError}</p>
            )}
            {!urlError && selectedParent?.url && (
              <p className="text-xs text-muted-foreground">
                Parent URL: <span className="font-mono">{selectedParent.url}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border-royal-purple/20"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {isSubmitting ? "Creating..." : "Create Hosted Tour"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
