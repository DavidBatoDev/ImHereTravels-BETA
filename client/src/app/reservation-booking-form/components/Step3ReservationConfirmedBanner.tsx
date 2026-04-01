type Step3ReservationConfirmedBannerProps = {
  bookingId: string;
};

export default function Step3ReservationConfirmedBanner({
  bookingId,
}: Step3ReservationConfirmedBannerProps) {
  return (
    <div className="bg-gradient-to-r from-spring-green/10 to-green-500/10 border-2 border-spring-green/40 p-5 rounded-xl shadow-lg">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-spring-green to-green-500 text-white shadow-lg animate-bounce">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <div className="font-bold text-lg text-foreground">
            🎉 Reservation confirmed!
          </div>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span>Reservation ID:</span>
            <span className="font-mono font-semibold text-foreground bg-background/50 px-2 py-0.5 rounded">
              {bookingId}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
