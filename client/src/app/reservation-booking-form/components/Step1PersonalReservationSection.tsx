import { motion, AnimatePresence } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import Select, { type Option } from "./Select";
import BookingTypeGuestTabsSection from "./BookingTypeGuestTabsSection";
import MainBookerFormSection from "./MainBookerFormSection";
import GuestFormsSection from "./GuestFormsSection";
import type {
  ReservationGuestDetail,
} from "../hooks/state/useReservationCustomerState";
import type { ReservationTourPackage } from "../hooks/state/useReservationCatalogState";

export type Step1PersonalReservationSectionProps = {
  step: number;
  paymentConfirmed: boolean;
  clearing: boolean;
  isLoadingPackages: boolean;
  selectedPackage?: ReservationTourPackage;
  highlightsExpanded: boolean;
  carouselIndex: number;
  dateVisible: boolean;
  dateMounted: boolean;
  tourPackage: string;
  tourDate: string;
  errors: { [k: string]: string };
  bookingType: string;
  groupSize: number;
  activeGuestTab: number;
  guestDetails: ReservationGuestDetail[];
  email: string;
  birthdate: string;
  firstName: string;
  lastName: string;
  nationality: string;
  whatsAppCountry: string;
  whatsAppNumber: string;

  tourDateOptions: Option[];
  bookingTypeOptions: Array<{
    label: string;
    value: string;
    disabled?: boolean;
    description?: string;
  }>;
  nationalityOptions: Option[];
  fieldBase: string;
  fieldWithIcon: string;
  fieldFocus: string;
  fieldBorder: (err?: boolean) => string;
  isFieldValid: (field: string, value: string) => boolean;

  setShowTourModal: (value: boolean) => void;
  setHighlightsExpanded: (value: boolean) => void;
  setIsCarouselPaused: (value: boolean) => void;
  setCarouselIndex: Dispatch<SetStateAction<number>>;
  setTourDate: (value: string) => void;
  handleBookingTypeChange: (value: string) => void;
  handleGroupSizeChange: (value: number) => void;
  setActiveGuestTab: (value: number) => void;
  setEmail: (value: string) => void;
  setBirthdate: (value: string) => void;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setNationality: (value: string) => void;
  setWhatsAppCountry: (value: string) => void;
  setWhatsAppNumber: (value: string) => void;
  setErrors: Dispatch<SetStateAction<{ [k: string]: string }>>;
  handleGuestDetailsUpdate: (index: number, data: ReservationGuestDetail) => void;

  getCountryData: (countryCode: string) => {
    alpha3: string;
    flag: string;
    maxLength: number;
  };
  safeGetCountryCallingCode: (countryCode: string) => string;
};

export default function Step1PersonalReservationSection({
  step,
  paymentConfirmed,
  clearing,
  isLoadingPackages,
  selectedPackage,
  highlightsExpanded,
  carouselIndex,
  dateVisible,
  dateMounted,
  tourPackage,
  tourDate,
  errors,
  bookingType,
  groupSize,
  activeGuestTab,
  guestDetails,
  email,
  birthdate,
  firstName,
  lastName,
  nationality,
  whatsAppCountry,
  whatsAppNumber,
  tourDateOptions,
  bookingTypeOptions,
  nationalityOptions,
  fieldBase,
  fieldWithIcon,
  fieldFocus,
  fieldBorder,
  isFieldValid,
  setShowTourModal,
  setHighlightsExpanded,
  setIsCarouselPaused,
  setCarouselIndex,
  setTourDate,
  handleBookingTypeChange,
  handleGroupSizeChange,
  setActiveGuestTab,
  setEmail,
  setBirthdate,
  setFirstName,
  setLastName,
  setNationality,
  setWhatsAppCountry,
  setWhatsAppNumber,
  setErrors,
  handleGuestDetailsUpdate,
  getCountryData,
  safeGetCountryCallingCode,
}: Step1PersonalReservationSectionProps) {
  return (
    <>
            {/* STEP 1 - Personal & Reservation Details */}
            {step === 1 && (
              <div className="rounded-2xl bg-card p-6 sm:p-8 border border-sunglow-yellow/20 dark:border-crimson-red/30 shadow-lg dark:shadow-xl transition-all duration-300 hover:border-crimson-red hover:shadow-crimson-red/20 hover:shadow-xl">
                {/* Show locked message if payment confirmed */}
                {paymentConfirmed && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-md mb-4">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-amber-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M12 15v-3m0 0V9m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">
                        Booking details are locked after payment
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className={`space-y-4 transition-all duration-300 ${
                    clearing ? "opacity-0" : "opacity-100"
                  }`}
                >
                  {/* Tour Selection Section - Moved to top */}
                  <div>
                    <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-border/50">
                      <div className="p-4 bg-crimson-red rounded-full rounded-br-none">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-foreground">
                        Tour Selection
                      </h3>
                    </div>

                    {/* Tour Name and Tour Date in same row */}
                    <div className="grid grid-cols-1 md:grid-cols-[70%_30%] gap-4 items-start mb-6">
                      {/* Tour name */}
                      <label
                        className={`block ${
                          !selectedPackage ? "md:col-span-2" : ""
                        }`}
                      >
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          Tour name
                          <span className="text-destructive text-xs">*</span>
                        </span>
                        {isLoadingPackages ? (
                          <div className="mt-1 px-4 py-3 rounded-lg bg-input/50 border-2 border-border backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                              <span className="text-muted-foreground">
                                Loading tour names...
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="tour-selector-trigger mt-1 relative">
                            {selectedPackage ? (
                              <div className="relative">
                                <div
                                  className="selected-tour-mini-card flex items-center gap-4 p-3 border-2 border-border rounded-xl bg-card hover:border-primary/50 transition-all duration-300 cursor-pointer animate-slideInScale"
                                  onClick={() =>
                                    !paymentConfirmed && setShowTourModal(true)
                                  }
                                >
                                  <div className="mini-card-image w-16 h-14 rounded-lg overflow-hidden flex-shrink-0">
                                    {selectedPackage.coverImage ? (
                                      <img
                                        src={selectedPackage.coverImage}
                                        alt={selectedPackage.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                                        <svg
                                          className="w-6 h-6 text-muted-foreground"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mini-card-content flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-foreground truncate">
                                      {selectedPackage.name}
                                    </h4>
                                    {selectedPackage.duration && (
                                      <span className="mini-card-meta flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                        <svg
                                          className="w-3.5 h-3.5"
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
                                        {selectedPackage.duration}
                                      </span>
                                    )}
                                  </div>
                                  {!paymentConfirmed && (
                                    <button
                                      type="button"
                                      className="change-tour-btn px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:brightness-95 transition-all flex-shrink-0 hover:-translate-y-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTourModal(true);
                                      }}
                                    >
                                      Change
                                    </button>
                                  )}
                                </div>

                                {/* Tour Highlights Button - Top Right */}
                                {selectedPackage.highlights &&
                                  selectedPackage.highlights.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setHighlightsExpanded(
                                          !highlightsExpanded,
                                        );
                                      }}
                                      className="absolute -top-2 -right-2 p-2 rounded-full bg-sunglow-yellow text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 z-10"
                                      title="View tour highlights"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    </button>
                                  )}

                                {/* Tour Highlights Popup */}
                                <AnimatePresence>
                                  {highlightsExpanded &&
                                    selectedPackage.highlights &&
                                    selectedPackage.highlights.length > 0 && (
                                      <motion.div
                                        initial={{
                                          opacity: 0,
                                          scale: 0.8,
                                          y: -10,
                                        }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{
                                          opacity: 0,
                                          scale: 0.8,
                                          y: -10,
                                        }}
                                        transition={{
                                          duration: 0.3,
                                          ease: [0.4, 0, 0.2, 1],
                                        }}
                                        className="absolute top-12 right-0 w-96 max-h-[32rem] overflow-hidden bg-card border-2 border-sunglow-yellow/30 rounded-xl shadow-2xl z-20"
                                      >
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                                          <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-sunglow-yellow/20">
                                              <svg
                                                className="w-4 h-4 text-sunglow-yellow"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                              </svg>
                                            </div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                              Tour Highlights
                                            </h3>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setHighlightsExpanded(false);
                                            }}
                                            className="p-1 hover:bg-muted rounded-md transition-colors"
                                          >
                                            <svg
                                              className="w-4 h-4 text-muted-foreground"
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

                                        {/* Image Carousel Section */}
                                        {(() => {
                                          const highlightsWithImages =
                                            selectedPackage.highlights.filter(
                                              (h) =>
                                                typeof h === "object" &&
                                                h.image,
                                            );

                                          if (highlightsWithImages.length > 0) {
                                            const currentImage =
                                              highlightsWithImages[
                                                carouselIndex
                                              ];
                                            return (
                                              <div
                                                className="relative h-48 bg-muted overflow-hidden group"
                                                onMouseEnter={() =>
                                                  setIsCarouselPaused(true)
                                                }
                                                onMouseLeave={() =>
                                                  setIsCarouselPaused(false)
                                                }
                                              >
                                                <AnimatePresence mode="wait">
                                                  <motion.img
                                                    key={carouselIndex}
                                                    src={
                                                      typeof currentImage ===
                                                      "object"
                                                        ? currentImage.image
                                                        : ""
                                                    }
                                                    alt={
                                                      typeof currentImage ===
                                                      "object"
                                                        ? currentImage.text
                                                        : ""
                                                    }
                                                    className="w-full h-full object-cover"
                                                    initial={{
                                                      opacity: 0,
                                                      scale: 1.1,
                                                    }}
                                                    animate={{
                                                      opacity: 1,
                                                      scale: 1,
                                                    }}
                                                    exit={{
                                                      opacity: 0,
                                                      scale: 0.95,
                                                    }}
                                                    transition={{
                                                      duration: 0.5,
                                                    }}
                                                  />
                                                </AnimatePresence>

                                                {/* Navigation Controls */}
                                                {highlightsWithImages.length >
                                                  1 && (
                                                  <>
                                                    {/* Previous Button */}
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCarouselIndex(
                                                          (prev) =>
                                                            prev === 0
                                                              ? highlightsWithImages.length -
                                                                1
                                                              : prev - 1,
                                                        );
                                                      }}
                                                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                      <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                      >
                                                        <path
                                                          strokeLinecap="round"
                                                          strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M15 19l-7-7 7-7"
                                                        />
                                                      </svg>
                                                    </button>

                                                    {/* Next Button */}
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCarouselIndex(
                                                          (prev) =>
                                                            (prev + 1) %
                                                            highlightsWithImages.length,
                                                        );
                                                      }}
                                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                      <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                      >
                                                        <path
                                                          strokeLinecap="round"
                                                          strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M9 5l7 7-7 7"
                                                        />
                                                      </svg>
                                                    </button>

                                                    {/* Indicators */}
                                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                      {highlightsWithImages.map(
                                                        (_, idx) => (
                                                          <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              setCarouselIndex(
                                                                idx,
                                                              );
                                                            }}
                                                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                                                              idx ===
                                                              carouselIndex
                                                                ? "bg-foreground w-4"
                                                                : "bg-muted-foreground/50 hover:bg-muted-foreground/75"
                                                            }`}
                                                          />
                                                        ),
                                                      )}
                                                    </div>
                                                  </>
                                                )}

                                                {/* Image Caption */}
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                                  <p className="text-white text-xs font-medium">
                                                    {typeof currentImage ===
                                                    "object"
                                                      ? currentImage.text
                                                      : ""}
                                                  </p>
                                                </div>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}

                                        {/* Highlights List */}
                                        <div className="space-y-2 p-4 max-h-64 overflow-y-auto">
                                          {selectedPackage.highlights.map(
                                            (highlight, idx) => {
                                              const text =
                                                typeof highlight === "string"
                                                  ? highlight
                                                  : highlight.text;
                                              return (
                                                <motion.div
                                                  key={idx}
                                                  initial={{
                                                    x: -20,
                                                    opacity: 0,
                                                  }}
                                                  animate={{
                                                    x: 0,
                                                    opacity: 1,
                                                  }}
                                                  transition={{
                                                    duration: 0.3,
                                                    delay: idx * 0.05,
                                                  }}
                                                  className="flex items-start gap-2 p-2 rounded-lg"
                                                >
                                                  <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{
                                                      duration: 0.3,
                                                      delay: idx * 0.05 + 0.1,
                                                      ease: [
                                                        0.68, -0.55, 0.265,
                                                        1.55,
                                                      ],
                                                    }}
                                                    className="flex-shrink-0 mt-0.5"
                                                  >
                                                    <svg
                                                      className="w-4 h-4 text-green-500"
                                                      fill="currentColor"
                                                      viewBox="0 0 20 20"
                                                    >
                                                      <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                        clipRule="evenodd"
                                                      />
                                                    </svg>
                                                  </motion.div>
                                                  <p className="text-xs text-foreground/90 leading-relaxed">
                                                    {text}
                                                  </p>
                                                </motion.div>
                                              );
                                            },
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                </AnimatePresence>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="select-package-btn w-full p-4 border-2 border-dashed border-border rounded-xl bg-transparent text-muted-foreground font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300"
                                onClick={() => setShowTourModal(true)}
                                disabled={paymentConfirmed}
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                  />
                                </svg>
                                Select a package
                              </button>
                            )}
                          </div>
                        )}
                        {errors.tourPackage && (
                          <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                            <svg
                              className="w-3.5 h-3.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {errors.tourPackage}
                          </p>
                        )}
                      </label>

                      {/* Tour date */}
                      <div
                        className="overflow-hidden transition-all duration-500 ease-in-out"
                        style={{
                          maxHeight: dateVisible ? 250 : 0,
                          opacity: dateVisible ? 1 : 0,
                        }}
                      >
                        {dateMounted && (
                          <label className="block">
                            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                              Tour date
                              <span className="text-destructive text-xs">
                                *
                              </span>
                            </span>
                            <div className="relative mt-1">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary z-10 pointer-events-none">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <Select
                                value={tourDate || null}
                                onChange={setTourDate}
                                options={tourDateOptions}
                                placeholder={
                                  tourDateOptions.length === 0
                                    ? "No dates"
                                    : "Select date"
                                }
                                ariaLabel="Tour Date"
                                className="[&_button]:h-[86px] [&_button]:pl-12 [&_button]:border-2 [&_button]:border-border [&_button]:rounded-xl [&_button]:bg-card [&_button]:hover:border-primary/50 [&_button]:transition-all [&_button]:duration-300"
                                disabled={!tourPackage || paymentConfirmed}
                              />
                            </div>
                            {errors?.tourDate && (
                              <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {errors.tourDate}
                              </p>
                            )}
                            {tourPackage &&
                              tourDateOptions.length === 0 &&
                              !errors?.tourDate && (
                                <div className="mt-2 p-2 rounded-lg bg-amber-50/10 border border-amber-500/30">
                                  <p className="text-xs text-amber-600 flex items-start gap-2">
                                    <svg
                                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    <span>No available dates</span>
                                  </p>
                                </div>
                              )}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <BookingTypeGuestTabsSection
                  bookingType={bookingType}
                  onBookingTypeChange={handleBookingTypeChange}
                  bookingTypeOptions={bookingTypeOptions}
                  paymentConfirmed={paymentConfirmed}
                  errors={errors}
                  groupSize={groupSize}
                  onGroupSizeChange={handleGroupSizeChange}
                  activeGuestTab={activeGuestTab}
                  onActiveGuestTabChange={setActiveGuestTab}
                  selectedPackageName={selectedPackage?.name}
                  tourDate={tourDate}
                />

                {/* Main Booker Form (always visible or when tab 1 is active) */}
                <MainBookerFormSection
                  bookingType={bookingType}
                  activeGuestTab={activeGuestTab}
                  paymentConfirmed={paymentConfirmed}
                  errors={errors}
                  fieldBase={fieldBase}
                  fieldWithIcon={fieldWithIcon}
                  fieldFocus={fieldFocus}
                  fieldBorder={fieldBorder}
                  isFieldValid={isFieldValid}
                  email={email}
                  setEmail={setEmail}
                  birthdate={birthdate}
                  setBirthdate={setBirthdate}
                  firstName={firstName}
                  setFirstName={setFirstName}
                  lastName={lastName}
                  setLastName={setLastName}
                  nationality={nationality}
                  setNationality={setNationality}
                  nationalityOptions={nationalityOptions}
                  whatsAppCountry={whatsAppCountry}
                  setWhatsAppCountry={setWhatsAppCountry}
                  whatsAppNumber={whatsAppNumber}
                  setWhatsAppNumber={setWhatsAppNumber}
                  setErrors={setErrors}
                  getCountryData={getCountryData}
                  safeGetCountryCallingCode={safeGetCountryCallingCode}
                />

                {/* Guest Forms - Only show for Duo/Group Booking */}
                <GuestFormsSection
                  bookingType={bookingType}
                  activeGuestTab={activeGuestTab}
                  guestDetails={guestDetails}
                  errors={errors}
                  paymentConfirmed={paymentConfirmed}
                  onGuestDetailsUpdate={handleGuestDetailsUpdate}
                />
              </div>
            )}
    </>
  );
}
