type TourPackageSummary = {
  id: string;
  name: string;
};

type Step2ReservationSummaryCardProps = {
  bookingType: string;
  tourPackage: string;
  tourPackages: TourPackageSummary[];
  numberOfPeople: number;
  baseReservationFee: number;
  depositAmount: number;
};

export default function Step2ReservationSummaryCard({
  bookingType,
  tourPackage,
  tourPackages,
  numberOfPeople,
  baseReservationFee,
  depositAmount,
}: Step2ReservationSummaryCardProps) {
  const isMultiGuestBooking =
    bookingType === "Duo Booking" || bookingType === "Group Booking";

  return (
    <div className="bg-muted/10 border-2 border-border rounded-lg p-5 mb-4 shadow-sm">
      <div className="flex justify-between items-center text-sm mt-2">
        <span className="text-foreground/70 font-semibold">Tour name:</span>
        <span className="font-bold text-foreground">
          {tourPackages.find((p) => p.id === tourPackage)?.name}
        </span>
      </div>

      {isMultiGuestBooking && (
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-foreground/70 font-semibold">
            Number of people:
          </span>
          <span className="font-bold text-foreground">{numberOfPeople}</span>
        </div>
      )}

      <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-border/50">
        <span className="text-foreground/70 font-semibold">
          Reservation fee:
        </span>
        <span className="font-bold text-lg text-crimson-red">
          {isMultiGuestBooking ? (
            <span className="flex items-center gap-2">
              <span className="text-sm text-foreground/60 font-normal">
                £{baseReservationFee.toFixed(2)} x {numberOfPeople} =
              </span>
              £{depositAmount.toFixed(2)}
            </span>
          ) : (
            `£${depositAmount.toFixed(2)}`
          )}
        </span>
      </div>
    </div>
  );
}
