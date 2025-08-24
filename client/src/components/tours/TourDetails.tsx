"use client";

import { useState } from "react";
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
  DollarSign,
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
}

export default function TourDetails({
  tour,
  isOpen,
  onClose,
  onEdit,
  onArchive,
  onDelete,
}: TourDetailsProps) {
  if (!tour) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const currentPrice = tour.pricing.discounted || tour.pricing.original;
  const hasDiscount =
    tour.pricing.discounted && tour.pricing.discounted < tour.pricing.original;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{tour.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="font-mono">
                  {tour.tourCode}
                </Badge>
                <Badge className={getStatusColor(tour.status)}>
                  {tour.status.charAt(0).toUpperCase() + tour.status.slice(1)}
                </Badge>
              </div>
              <DialogDescription className="mt-2 text-base">
                {tour.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Hash className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Tour Code</p>
                      <p className="text-lg font-bold font-mono">
                        {tour.tourCode}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-lg font-bold">{tour.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-lg font-bold">{tour.duration} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">Price</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold">
                          {tour.pricing.currency} {currentPrice}
                        </p>
                        {hasDiscount && (
                          <span className="text-sm text-gray-500 line-through">
                            {tour.pricing.currency} {tour.pricing.original}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Bookings</p>
                      <p className="text-lg font-bold">
                        {tour.metadata.bookingsCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Travel Dates */}
            {tour.travelDates && tour.travelDates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Available Travel Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tour.travelDates.map((travelDate, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${
                          travelDate.isAvailable
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              travelDate.isAvailable ? "default" : "secondary"
                            }
                            className={
                              travelDate.isAvailable ? "bg-green-600" : ""
                            }
                          >
                            {travelDate.isAvailable
                              ? "Available"
                              : "Unavailable"}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Date {index + 1}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-gray-600">
                              Start Date
                            </p>
                            <p className="text-sm font-semibold">
                              {format(
                                new Date(travelDate.startDate.seconds * 1000),
                                "MMM dd, yyyy"
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600">
                              End Date
                            </p>
                            <p className="text-sm font-semibold">
                              {format(
                                new Date(travelDate.endDate.seconds * 1000),
                                "MMM dd, yyyy"
                              )}
                            </p>
                          </div>
                          {travelDate.maxCapacity && (
                            <div>
                              <p className="text-xs font-medium text-gray-600">
                                Max Capacity
                              </p>
                              <p className="text-sm">
                                {travelDate.maxCapacity} travelers
                              </p>
                            </div>
                          )}
                          {travelDate.currentBookings !== undefined && (
                            <div>
                              <p className="text-xs font-medium text-gray-600">
                                Current Bookings
                              </p>
                              <p className="text-sm">
                                {travelDate.currentBookings} booked
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* External Links */}
            {(tour.brochureLink ||
              tour.stripePaymentLink ||
              tour.preDeparturePack) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    External Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {tour.brochureLink && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Brochure</p>
                          <a
                            href={tour.brochureLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View Brochure
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {tour.stripePaymentLink && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <CreditCard className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Payment</p>
                          <a
                            href={tour.stripePaymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-green-600 hover:underline flex items-center gap-1"
                          >
                            Book Now
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {tour.preDeparturePack && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Package className="h-5 w-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Pre-Departure</p>
                          <a
                            href={tour.preDeparturePack}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 hover:underline flex items-center gap-1"
                          >
                            View Pack
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Original Price
                    </p>
                    <p className="text-lg font-bold">
                      {tour.pricing.currency} {tour.pricing.original}
                    </p>
                  </div>
                  {tour.pricing.discounted && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Discounted Price
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {tour.pricing.currency} {tour.pricing.discounted}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Deposit Required
                    </p>
                    <p className="text-lg font-bold">
                      {tour.pricing.currency} {tour.pricing.deposit}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Tour Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tour.details.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      <span className="text-sm">{highlight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Itinerary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Itinerary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tour.details.itinerary.map((day, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="font-semibold">
                        Day {day.day}
                      </Badge>
                      <h4 className="font-semibold text-lg">{day.title}</h4>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {day.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Requirements */}
            {tour.details.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {tour.details.requirements.map((requirement, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        <span className="text-sm">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing History */}
            {tour.pricingHistory.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tour.pricingHistory
                      .sort((a, b) => b.date.seconds - a.date.seconds)
                      .map((entry, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center py-2 border-b last:border-b-0"
                        >
                          <div>
                            <p className="font-semibold">
                              {tour.pricing.currency} {entry.price}
                            </p>
                            <p className="text-xs text-gray-500">
                              Changed by: {entry.changedBy}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">
                            {format(
                              new Date(entry.date.seconds * 1000),
                              "MMM dd, yyyy"
                            )}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Tour Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created</p>
                    <p className="text-sm">
                      {format(
                        new Date(tour.metadata.createdAt.seconds * 1000),
                        "PPP"
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      by {tour.metadata.createdBy}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Last Updated
                    </p>
                    <p className="text-sm">
                      {format(
                        new Date(tour.metadata.updatedAt.seconds * 1000),
                        "PPP"
                      )}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tour ID</p>
                    <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {tour.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      URL Slug
                    </p>
                    <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {tour.slug}
                    </p>
                  </div>
                  {tour.url && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Direct URL
                      </p>
                      <a
                        href={tour.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {tour.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>

          <div className="flex gap-2">
            {onEdit && (
              <Button
                onClick={() => onEdit(tour)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}

            {onArchive && tour.status !== "archived" && (
              <Button
                variant="outline"
                onClick={() => onArchive(tour)}
                className="flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}

            {onDelete && (
              <Button
                variant="destructive"
                onClick={() => onDelete(tour)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
