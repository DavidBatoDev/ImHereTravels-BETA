"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin,
  Clock,
  Banknote,
  Users,
  Star,
  Calendar,
  FileText,
  Edit,
  Archive,
  Trash2,
  Hash,
  Globe,
  Link,
  ExternalLink,
  BookOpen,
  CreditCard,
  Package,
  Plane,
  Camera,
  Heart,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { TourPackage } from "@/types/tours";
import { format } from "date-fns";

interface TourDetailsProps {
  tour: TourPackage | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tour: TourPackage) => void;
  onArchive?: (tour: TourPackage) => void;
  onDelete?: (tour: TourPackage) => void;
  router?: ReturnType<typeof useRouter>;
  searchParams?: ReturnType<typeof useSearchParams>;
}

export default function TourDetails({
  tour,
  isOpen,
  onClose,
  onEdit,
  onArchive,
  onDelete,
  router,
  searchParams,
}: TourDetailsProps) {
  if (!tour) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-spring-green text-white border-spring-green";
      case "draft":
        return "bg-sunglow-yellow text-foreground border-sunglow-yellow";
      case "archived":
        return "bg-grey text-white border-grey";
      default:
        return "bg-grey text-white border-grey";
    }
  };

  const currentPrice = tour.pricing.discounted || tour.pricing.original;
  const hasDiscount =
    tour.pricing.discounted && tour.pricing.discounted < tour.pricing.original;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] p-0 bg-background flex flex-col">
        <DialogHeader className="relative px-8 pt-8 pb-6 text-white rounded-t-lg overflow-hidden flex-shrink-0">
          {/* Blurred Background Image */}
          {tour.media?.coverImage && (
            <div className="absolute inset-0 z-0">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
                style={{
                  backgroundImage: `url(${tour.media.coverImage})`,
                  filter: "blur(20px)",
                }}
              />
              <div className="absolute inset-0 bg-black/60" />
            </div>
          )}

          {/* Fallback gradient background when no cover image */}
          {!tour.media?.coverImage && (
            <div className="absolute inset-0 bg-gradient-to-r from-crimson-red to-light-red" />
          )}

          {/* Content with proper z-index */}
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                  {tour.name}
                </DialogTitle>
                <DialogDescription className="text-white/90 text-lg drop-shadow-md">
                  {tour.description}
                </DialogDescription>
                <div className="flex items-center gap-4 mt-4 text-white/90">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-white drop-shadow-sm" />
                    <span className="font-medium">{tour.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-white drop-shadow-sm" />
                    <span className="font-medium">{tour.tourCode}</span>
                  </div>
                </div>
              </div>
              <Badge
                className={`${getStatusColor(tour.status)} drop-shadow-sm`}
              >
                {tour.status.charAt(0).toUpperCase() + tour.status.slice(1)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-background border-2 border-border hover:border-crimson-red transition-colors duration-200">
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-crimson-red rounded-full">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        Duration
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {tour.duration}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background border-2 border-border hover:border-royal-purple transition-colors duration-200">
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-royal-purple rounded-full">
                      <Banknote className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        Price
                      </p>
                      <div className="flex flex-col items-center">
                        {hasDiscount &&
                          tour.pricing.original &&
                          tour.pricing.original > 0 && (
                            <p className="text-sm text-muted-foreground line-through">
                              {tour.pricing.currency}{" "}
                              {tour.pricing.original.toLocaleString()}
                            </p>
                          )}
                        <p className="text-xl font-bold text-foreground">
                          {tour.pricing.currency}{" "}
                          {currentPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background border-2 border-border hover:border-spring-green transition-colors duration-200">
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-spring-green rounded-full">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        Deposit
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {tour.pricing.currency}{" "}
                        {tour.pricing.deposit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background border-2 border-border hover:border-vivid-orange transition-colors duration-200">
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-vivid-orange rounded-full">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        Available Dates
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {tour.travelDates.filter((d) => d.isAvailable).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Highlights & Requirements */}
              <div className="lg:col-span-2 space-y-6">
                {/* Highlights */}
                <Card className="bg-background border-2 border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Star className="w-5 h-5 text-sunglow-yellow" />
                      Tour Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tour.details.highlights.map((highlight, index) => {
                        const highlightText =
                          typeof highlight === "string"
                            ? highlight
                            : highlight.text;
                        const highlightImage =
                          typeof highlight === "object" && highlight.image
                            ? highlight.image
                            : null;

                        return (
                          <div key={index} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-spring-green mt-0.5 flex-shrink-0" />
                            <span className="text-foreground">
                              {highlightText}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing History */}
                {tour.pricingHistory && tour.pricingHistory.length > 0 && (
                  <Card className="bg-background border-2 border-border">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Banknote className="w-5 h-5 text-royal-purple" />
                        Pricing History
                        <Badge variant="outline" className="ml-2">
                          {tour.pricingHistory.length + 1} Version
                          {tour.pricingHistory.length + 1 > 1 ? "s" : ""}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Current Version */}
                        <div className="p-4 bg-spring-green/10 border-2 border-spring-green rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                Version {tour.currentVersion || 1}
                              </span>
                              <Badge className="bg-spring-green text-white">
                                Current
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(), "MMM dd, yyyy")}
                            </span>
                          </div>
                          {tour.travelDates.some(
                            (td) =>
                              td.customOriginal ||
                              td.customDiscounted ||
                              td.customDeposit,
                          ) && (
                            <div className="mt-3 pt-3 border-t border-spring-green/30">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">
                                Custom Date Pricing:
                              </p>
                              <div className="space-y-1">
                                {tour.travelDates
                                  .filter(
                                    (td) =>
                                      td.customOriginal ||
                                      td.customDiscounted ||
                                      td.customDeposit,
                                  )
                                  .map((td, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs text-muted-foreground flex items-center gap-2"
                                    >
                                      <span className="font-medium min-w-[100px]">
                                        {td.startDate &&
                                        typeof td.startDate === "object" &&
                                        "toDate" in td.startDate
                                          ? format(
                                              td.startDate.toDate(),
                                              "dd MMM yyyy",
                                            )
                                          : "Date"}
                                      </span>
                                      <span className="font-semibold">
                                        {tour.pricing.currency}
                                        {(
                                          td.customOriginal ||
                                          tour.pricing.original
                                        ).toLocaleString()}
                                      </span>
                                      <span className="text-muted-foreground">
                                        ResFee
                                      </span>
                                      <span className="font-semibold">
                                        {tour.pricing.currency}
                                        {(
                                          td.customDeposit ||
                                          tour.pricing.deposit
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Historical Versions */}
                        {tour.pricingHistory
                          .slice()
                          .sort((a, b) => b.version - a.version)
                          .map((history) => (
                            <div
                              key={history.version}
                              className="p-4 bg-muted/30 border border-border rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-foreground">
                                  Version {history.version}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {history.effectiveDate &&
                                  typeof history.effectiveDate === "object" &&
                                  "toDate" in history.effectiveDate
                                    ? format(
                                        history.effectiveDate.toDate(),
                                        "MMM dd, yyyy",
                                      )
                                    : "Historical"}
                                </span>
                              </div>
                              {history.travelDates &&
                                history.travelDates.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                                      Custom Date Pricing:
                                    </p>
                                    <div className="space-y-1">
                                      {history.travelDates.map((td, idx) => (
                                        <div
                                          key={idx}
                                          className="text-xs text-muted-foreground flex items-center gap-2"
                                        >
                                          <span className="font-medium min-w-[100px]">
                                            {td.date
                                              ? format(
                                                  new Date(td.date),
                                                  "dd MMM yyyy",
                                                )
                                              : "Date"}
                                          </span>
                                          <span className="font-semibold">
                                            {history.pricing.currency}
                                            {(
                                              td.customOriginal ||
                                              history.pricing.original
                                            ).toLocaleString()}
                                          </span>
                                          <span className="text-muted-foreground">
                                            ResFee
                                          </span>
                                          <span className="font-semibold">
                                            {history.pricing.currency}
                                            {(
                                              td.customDeposit ||
                                              history.pricing.deposit
                                            ).toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Itinerary */}
                <Card className="bg-background border-2 border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Plane className="w-5 h-5 text-royal-purple" />
                      Daily Itinerary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    {/* Continuous timeline line */}
                    <div
                      className="absolute left-[3.90rem] top-12 w-1 bg-crimson-red/40"
                      style={{
                        height: `calc(100% - 7rem)`,
                      }}
                    ></div>

                    <div className="space-y-4">
                      {tour.details.itinerary.map((day, index) => (
                        <div
                          key={day.day}
                          className="flex gap-4 p-4 bg-muted/30 rounded-lg relative"
                        >
                          <div className="flex-shrink-0 relative z-10">
                            <div className="w-12 h-12 bg-crimson-red text-white rounded-full flex items-center justify-center font-bold text-lg">
                              {day.day}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-2">
                              {day.title}
                            </h4>
                            <p className="text-muted-foreground leading-relaxed">
                              {day.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Requirements - Only show if there are requirements */}
                {tour.details.requirements &&
                  tour.details.requirements.length > 0 && (
                    <Card className="bg-background border-2 border-border">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <AlertCircle className="w-5 h-5 text-vivid-orange" />
                          Requirements & Important Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {tour.details.requirements.map(
                            (requirement, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-vivid-orange/5 rounded-lg border-l-4 border-vivid-orange"
                              >
                                <AlertCircle className="w-5 h-5 text-vivid-orange mt-0.5 flex-shrink-0" />
                                <span className="text-foreground">
                                  {requirement}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </div>

              {/* Right Column - Travel Dates & Actions */}
              <div className="space-y-6">
                {/* Travel Dates */}
                <Card className="bg-background border-2 border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Calendar className="w-5 h-5 text-spring-green" />
                      Available Travel Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {tour.travelDates
                        .filter((date) => date.isAvailable)
                        .slice(0, 5)
                        .map((date, index) => {
                          // Handle both Timestamp and string/number dates
                          let startDate: Date;
                          let endDate: Date;

                          try {
                            if (typeof date.startDate === "string") {
                              startDate = new Date(date.startDate);
                            } else if (
                              typeof date.startDate?.toDate === "function"
                            ) {
                              startDate = date.startDate.toDate();
                            } else if (typeof date.startDate === "number") {
                              startDate = new Date(date.startDate);
                            } else if (
                              date.startDate &&
                              typeof date.startDate === "object" &&
                              "seconds" in date.startDate
                            ) {
                              // Handle Firestore Timestamp with seconds/nanoseconds
                              startDate = new Date(
                                date.startDate.seconds * 1000,
                              );
                            } else {
                              // Fallback
                              startDate = new Date();
                            }

                            if (typeof date.endDate === "string") {
                              endDate = new Date(date.endDate);
                            } else if (
                              typeof date.endDate?.toDate === "function"
                            ) {
                              endDate = date.endDate.toDate();
                            } else if (typeof date.endDate === "number") {
                              endDate = new Date(date.endDate);
                            } else if (
                              date.endDate &&
                              typeof date.endDate === "object" &&
                              "seconds" in date.endDate
                            ) {
                              // Handle Firestore Timestamp with seconds/nanoseconds
                              endDate = new Date(date.endDate.seconds * 1000);
                            } else {
                              // Fallback
                              endDate = new Date();
                            }

                            // Validate dates
                            if (
                              isNaN(startDate.getTime()) ||
                              isNaN(endDate.getTime())
                            ) {
                              return null;
                            }
                          } catch (error) {
                            console.error("Error parsing date:", date, error);
                            return null;
                          }

                          return (
                            <div
                              key={index}
                              className="p-3 bg-spring-green/5 rounded-lg border border-spring-green/20"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-foreground">
                                    {format(startDate, "MMM dd")} -{" "}
                                    {format(endDate, "MMM dd, yyyy")}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {Math.ceil(
                                      (endDate.getTime() -
                                        startDate.getTime()) /
                                        (1000 * 60 * 60 * 24),
                                    )}{" "}
                                    days
                                  </p>
                                </div>
                                {date.maxCapacity && (
                                  <div className="text-right">
                                    <p className="text-sm text-muted-foreground">
                                      Capacity
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {date.currentBookings || 0}/
                                      {date.maxCapacity}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                        .filter(Boolean)}
                      {tour.travelDates.filter((date) => date.isAvailable)
                        .length > 5 && (
                        <p className="text-sm text-muted-foreground text-center">
                          +
                          {tour.travelDates.filter((date) => date.isAvailable)
                            .length - 5}{" "}
                          more dates available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Sticky Actions Container */}
                <div className="sticky top-4 space-y-6">
                  {/* Quick Actions */}
                  <Card className="bg-background border-2 border-border">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-foreground">
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {tour.url && (
                        <Button
                          variant="outline"
                          className="w-full justify-start border-crimson-red text-crimson-red hover:bg-crimson-red hover:text-white"
                          onClick={() => window.open(tour.url, "_blank")}
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          View Tour Page
                        </Button>
                      )}
                      {tour.brochureLink && (
                        <Button
                          variant="outline"
                          className="w-full justify-start border-royal-purple text-royal-purple hover:bg-royal-purple hover:text-white"
                          onClick={() =>
                            window.open(tour.brochureLink, "_blank")
                          }
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Download Brochure
                        </Button>
                      )}
                      {tour.stripePaymentLink && (
                        <Button
                          variant="outline"
                          className="w-full justify-start border-spring-green text-spring-green hover:bg-spring-green hover:text-white"
                          onClick={() =>
                            window.open(tour.stripePaymentLink, "_blank")
                          }
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Book Now
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <Card className="bg-background border-2 border-border">
                    <CardContent className="p-4 space-y-3">
                      {onEdit && (
                        <Button
                          onClick={() => {
                            if (router && searchParams) {
                              // Update URL to include edit mode
                              const params = new URLSearchParams(
                                searchParams.toString(),
                              );
                              params.set("mode", "edit");
                              router.push(`/tours?${params.toString()}`, {
                                scroll: false,
                              });
                            }
                            onEdit(tour);
                          }}
                          className="w-full bg-crimson-red hover:bg-light-red text-white"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Tour
                        </Button>
                      )}
                      {onArchive && (
                        <Button
                          variant="outline"
                          onClick={() => onArchive(tour)}
                          className="w-full border-vivid-orange text-vivid-orange hover:bg-vivid-orange hover:text-white"
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          {tour.status === "archived" ? "Unarchive" : "Archive"}
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="outline"
                          onClick={() => onDelete(tour)}
                          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Tour
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
