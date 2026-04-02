import type { Dispatch, SetStateAction } from "react";
import BookingTypeGuestTabsSection from "./BookingTypeGuestTabsSection";
import MainBookerFormSection from "./MainBookerFormSection";
import GuestFormsSection from "./GuestFormsSection";
import type { Option } from "./Select";
import type { ReservationGuestDetail } from "../hooks/state/useReservationCustomerState";
import type { ReservationTourPackage } from "../hooks/state/useReservationCatalogState";

export type Step1PersonalReservationSectionProps = {
  step: number;
  paymentConfirmed: boolean;
  clearing: boolean;
  selectedPackage?: ReservationTourPackage;
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
  selectedPackage,
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
  bookingTypeOptions,
  nationalityOptions,
  fieldBase,
  fieldWithIcon,
  fieldFocus,
  fieldBorder,
  isFieldValid,
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
      {step === 1 && (
        <div>
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
            className={`space-y-6 transition-all duration-300 ${
              clearing ? "opacity-0" : "opacity-100"
            }`}
          >
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

            <GuestFormsSection
              bookingType={bookingType}
              activeGuestTab={activeGuestTab}
              guestDetails={guestDetails}
              errors={errors}
              paymentConfirmed={paymentConfirmed}
              onGuestDetailsUpdate={handleGuestDetailsUpdate}
            />
          </div>
        </div>
      )}
    </>
  );
}
