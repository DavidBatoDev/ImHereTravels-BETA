// client/src/app/reservation-booking-form/TourSelectionModal.tsx
"use client";

import React, { useState, useEffect } from "react";

interface TourPackage {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  location?: string;
  travelDates: string[];
  status?: "active" | "inactive";
  stripePaymentLink?: string;
  deposit?: number;
  price: number;
  coverImage?: string;
  duration?: string;
  highlights?: (string | { text: string; image?: string })[];
  destinations?: string[];
  region?: string;
  country?: string;
  rating?: number;
  media?: any;
  pricing?: any;
  details?: any;
}

interface TourSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tourPackages: TourPackage[];
  isLoadingPackages: boolean;
  selectedTourId: string;
  onSelectTour: (tourId: string) => void;
  isTourAllDatesTooSoon: (pkg: TourPackage) => boolean;
}

export default function TourSelectionModal({
  isOpen,
  onClose,
  tourPackages,
  isLoadingPackages,
  selectedTourId,
  onSelectTour,
  isTourAllDatesTooSoon,
}: TourSelectionModalProps) {
  const [modalImagesLoaded, setModalImagesLoaded] = useState<Set<string>>(
    new Set()
  );
  const [allModalImagesLoaded, setAllModalImagesLoaded] = useState(false);

  // Reset image loading state when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalImagesLoaded(new Set());
      setAllModalImagesLoaded(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setModalImagesLoaded(new Set());
    setAllModalImagesLoaded(false);
    onClose();
  };

  const handleSelectTour = (tour: TourPackage) => {
    if (isTourAllDatesTooSoon(tour)) return;
    onSelectTour(tour.id);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl border border-border/50 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-b border-border/50">
          <div className="flex items-center justify-between p-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-1">
                Select Your Adventure
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose from our curated collection of experiences
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2.5 hover:bg-muted/80 rounded-xl transition-all hover:rotate-90 duration-300"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8 h-[calc(85vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {isLoadingPackages ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-muted-foreground">
                Loading amazing tours...
              </p>
            </div>
          ) : tourPackages.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
                <svg
                  className="w-10 h-10 text-muted-foreground/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Tours Available
              </h3>
              <p className="text-muted-foreground">
                Check back soon for exciting new adventures!
              </p>
            </div>
          ) : (
            <>
              {/* Preload images in background */}
              <div className="hidden">
                {tourPackages
                  .filter((pkg) => pkg.status === "active" && pkg.coverImage)
                  .map((pkg) => (
                    <img
                      key={pkg.id}
                      src={pkg.coverImage!}
                      alt={pkg.name}
                      onLoad={() => {
                        setModalImagesLoaded((prev) => {
                          const newSet = new Set(prev);
                          newSet.add(pkg.id);
                          const activeTours = tourPackages.filter(
                            (p) => p.status === "active" && p.coverImage
                          );
                          if (newSet.size === activeTours.length) {
                            setAllModalImagesLoaded(true);
                          }
                          return newSet;
                        });
                      }}
                      loading="eager"
                    />
                  ))}
              </div>

              {/* Loading State - Hide cards until images loaded */}
              {!allModalImagesLoaded ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-6 text-lg font-medium text-muted-foreground">
                    Loading tours...
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {modalImagesLoaded.size} /{" "}
                    {
                      tourPackages.filter(
                        (p) => p.status === "active" && p.coverImage
                      ).length
                    }
                  </p>
                </div>
              ) : (
                /* Tour Grid - Only show when all images loaded */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {tourPackages
                    .filter((pkg) => pkg.status === "active")
                    .map((pkg) => {
                      const isSelected = selectedTourId === pkg.id;
                      const isDisabled = isTourAllDatesTooSoon(pkg);
                      const currentPrice = pkg.price || 0;
                      const currency = "GBP";
                      const currencySymbol = "£";

                      return (
                        <button
                          key={pkg.id}
                          onClick={() => handleSelectTour(pkg)}
                          disabled={isDisabled}
                          aria-disabled={isDisabled}
                          className={`group relative h-full flex flex-col rounded-3xl overflow-hidden bg-card transition-all duration-300 text-left shadow-md ${
                            isDisabled
                              ? "opacity-60 cursor-not-allowed"
                              : "transform hover:scale-[1.02] hover:shadow-xl"
                          } ${
                            isSelected && !isDisabled
                              ? "ring-4 ring-primary ring-offset-2 ring-offset-background shadow-2xl shadow-primary/20"
                              : ""
                          } min-h-[480px]`}
                        >
                          {/* Cover Image */}
                          <div className="relative h-48 overflow-hidden">
                            {pkg.coverImage ? (
                              <img
                                src={pkg.coverImage}
                                alt={pkg.name}
                                className={`block w-full h-full object-cover object-center transition-all duration-500 ${
                                  isSelected
                                    ? "scale-105"
                                    : "group-hover:scale-110"
                                }`}
                                loading="eager"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                <svg
                                  className="w-16 h-16 text-muted-foreground/30"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-2 flex-1 flex flex-col">
                            {/* Title */}
                            <h3 className="font-bold text-lg text-foreground line-clamp-1">
                              {pkg.name}
                            </h3>

                            {/* Description */}
                            {pkg.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                                {pkg.description}
                              </p>
                            )}

                            {/* Location */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <svg
                                className="w-3.5 h-3.5 flex-shrink-0 text-royal-purple"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="line-clamp-1">
                                {pkg.destinations?.[0] ||
                                  pkg.region ||
                                  pkg.country ||
                                  "Location Not Yet Configured"}
                              </span>
                            </div>

                            {/* Duration */}
                            {pkg.duration && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <svg
                                  className="w-3.5 h-3.5 text-royal-purple"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="font-medium text-foreground">
                                  {pkg.duration}
                                </span>
                              </div>
                            )}

                            {/* Price */}
                            <div className="pt-1">
                              <div className="flex items-baseline gap-1.5 mb-0.5">
                                <span className="text-2xl font-bold text-foreground">
                                  {currencySymbol}
                                  {currentPrice.toLocaleString()}
                                </span>
                              </div>
                              {pkg.deposit && (
                                <p className="text-xs text-muted-foreground">
                                  Deposit: {currencySymbol}
                                  {pkg.deposit.toLocaleString()}
                                </p>
                              )}
                            </div>

                            {/* Highlights */}
                            {pkg.highlights && pkg.highlights.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1 mt-auto">
                                {pkg.highlights
                                  .slice(0, 3)
                                  .map((highlight, index) => {
                                    const highlightText =
                                      typeof highlight === "string"
                                        ? highlight
                                        : (highlight as any)?.text ||
                                          String(highlight);

                                    return (
                                      <span
                                        key={index}
                                        className="px-2 py-0.5 rounded-full text-xs font-medium border border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10"
                                      >
                                        {highlightText}
                                      </span>
                                    );
                                  })}
                                {pkg.highlights.length > 3 && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-royal-purple/20 text-royal-purple hover:bg-royal-purple/10">
                                    +{pkg.highlights.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Selected Checkmark Overlay */}
                          {isDisabled && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center text-sm font-semibold text-destructive">
                              All dates are too soon
                            </div>
                          )}

                          {isSelected && !isDisabled && (
                            <div className="absolute inset-0 bg-primary/5 pointer-events-none">
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="bg-primary text-primary-foreground p-4 rounded-full shadow-2xl animate-in zoom-in-50 duration-300">
                                  <svg
                                    className="w-10 h-10"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
