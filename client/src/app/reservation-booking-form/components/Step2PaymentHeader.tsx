export default function Step2PaymentHeader() {
  return (
    <div className="flex items-center gap-3 pb-3 border-b-2 border-border/50">
      <div className="p-2 rounded-lg bg-green-500/10">
        <svg
          className="w-5 h-5 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-bold text-foreground">
          Pay reservation fee
        </h3>
        <p className="text-xs text-muted-foreground">
          Secure your spot with a deposit
        </p>
      </div>
    </div>
  );
}
