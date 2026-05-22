"use client";

import Image from "next/image";
import {
  MapPin,
  Clock,
  Eye,
  Edit,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HostedTour } from "@/types/hosted-tours";

interface HostedTourCardProps {
  tour: HostedTour;
  isSyncing?: boolean;
  onView: () => void;
  onEdit: () => void;
  onSync: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-spring-green/20 text-spring-green border border-spring-green/30";
    case "draft":
      return "bg-sunglow-yellow/20 text-vivid-orange border border-sunglow-yellow/30";
    case "archived":
      return "bg-grey/20 text-grey border border-grey/30";
    default:
      return "bg-grey/20 text-grey border border-grey/30";
  }
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateValue(value?: any) {
  const date = toDate(value);
  if (!date) return "Date TBD";
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

function getCurrencySymbol(currency: string) {
  switch (currency) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    default: return currency;
  }
}

function formatPrice(price: number, currency: string) {
  return `${getCurrencySymbol(currency)}${price.toLocaleString()}`;
}

export default function HostedTourCard({
  tour,
  isSyncing,
  onView,
  onEdit,
  onSync,
  onToggleLock,
  onDelete,
}: HostedTourCardProps) {
  const baseOriginal = tour.pricing?.original || 0;
  const basePrice =
    typeof tour.pricing?.discounted === "number" && tour.pricing.discounted > 0
      ? tour.pricing.discounted
      : baseOriginal;
  const baseDeposit = tour.pricing?.deposit ?? 0;

  const dateRows = (tour.travelDates || []).map((date) => ({
    date: date.startDate,
    price:
      typeof date.customDiscounted === "number" && date.customDiscounted > 0
        ? date.customDiscounted
        : typeof date.customOriginal === "number" && date.customOriginal > 0
          ? date.customOriginal
          : basePrice,
    deposit:
      typeof date.customDeposit === "number" && date.customDeposit > 0
        ? date.customDeposit
        : baseDeposit,
  }));

  const lastSynced = toDate(tour.lastSyncedAt);

  return (
    <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden border border-royal-purple/20 dark:border-border shadow hover:border-royal-purple/40 dark:hover:border-border flex flex-col h-full">
      {/* Cover Image */}
      <div className="relative w-full h-48 bg-muted">
        {tour.media?.coverImage ? (
          <Image
            src={tour.media.coverImage}
            alt={tour.name}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-royal-purple/60" />
              <p className="text-sm">No image</p>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <Badge className={getStatusColor(tour.status)}>
            {tour.status.charAt(0).toUpperCase() + tour.status.slice(1)}
          </Badge>
          <Badge className="bg-vivid-orange/20 text-vivid-orange border border-vivid-orange/30 text-[10px] max-w-[120px] truncate">
            {tour.parentTourName}
          </Badge>
        </div>

        {/* Lock icon overlay */}
        {tour.isLocked && (
          <div className="absolute top-3 left-3">
            <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
              <Lock className="h-3.5 w-3.5 text-crimson-red" />
            </div>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-1 text-foreground truncate">
              {tour.name}
            </CardTitle>
            <div className="flex items-center text-sm text-muted-foreground mb-1">
              <MapPin className="h-4 w-4 mr-1 text-royal-purple flex-shrink-0" />
              <span className="truncate">{tour.location}</span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground/70">
              <Link2 className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">Based on: {tour.parentTourName}</span>
            </div>
          </div>
        </div>
        <CardDescription className="line-clamp-2 text-muted-foreground mt-2">
          {tour.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          {/* Duration */}
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-1 text-royal-purple" />
            <span className="text-foreground">{tour.duration}</span>
          </div>

          {/* Pricing by Date */}
          <div className="pt-1">
            {dateRows.length > 0 ? (
              <div className="space-y-1">
                {dateRows.map((date, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"
                  >
                    <span className="line-clamp-1">{formatDateValue(date.date)}</span>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-sm font-bold text-foreground">
                        {formatPrice(date.price, tour.pricing.currency)}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground">
                        ResFee {formatPrice(date.deposit, tour.pricing.currency)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No dates available</p>
            )}
          </div>

          {/* Last synced */}
          {lastSynced && (
            <p className="text-[10px] text-muted-foreground/60">
              Last synced: {lastSynced.toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Highlights preview */}
        <div className="pt-2">
          <div className="flex flex-wrap gap-1">
            {(tour.details?.highlights ?? []).slice(0, 3).map((highlight, index) => {
              const text =
                typeof highlight === "string"
                  ? highlight
                  : (highlight as any)?.text || String(highlight);
              return (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10"
                >
                  {text.length > 15 ? `${text.slice(0, 15)}...` : text}
                </Badge>
              );
            })}
            {(tour.details?.highlights ?? []).length > 3 && (
              <Badge
                variant="outline"
                className="text-xs border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10"
              >
                +{tour.details.highlights.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1 border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {!tour.isLocked && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              title="Sync from parent tour"
              className="border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleLock}
            title={tour.isLocked ? "Unlock — allow sync from parent" : "Lock — prevent sync from parent"}
            className={`border-royal-purple/20 hover:border-royal-purple transition-all duration-200 px-2 ${
              tour.isLocked
                ? "text-crimson-red hover:bg-crimson-red/10"
                : "text-muted-foreground hover:bg-royal-purple/10 hover:text-royal-purple"
            }`}
          >
            {tour.isLocked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            title="Delete hosted tour"
            className="border-royal-purple/20 text-crimson-red hover:bg-crimson-red/10 hover:border-crimson-red transition-all duration-200 px-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
