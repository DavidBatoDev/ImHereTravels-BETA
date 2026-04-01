export type AvailablePaymentTerm = {
  term: string;
  isLastMinute: boolean;
  isInvalid: boolean;
};

export type PaymentScheduleItem = {
  date: string;
  amount: number;
};

export type GeneratePaymentScheduleInput = {
  tourDate: string;
  monthsRequired: number;
  totalTourPrice: number;
  depositAmount: number;
  fromDate?: Date;
};

export const calculateDaysBetween = (
  tourDateStr: string,
  fromDate: Date = new Date(),
): number => {
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);

  const tour = new Date(tourDateStr);
  tour.setHours(0, 0, 0, 0);

  const diffTime = tour.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const isTourAllDatesTooSoon = (
  pkg?: { travelDates?: string[] },
  fromDate: Date = new Date(),
): boolean => {
  if (!pkg) return false;
  const validDates = (pkg.travelDates ?? []).filter(Boolean);

  return (
    validDates.length > 0 &&
    validDates.every((date) => calculateDaysBetween(date, fromDate) < 2)
  );
};

export const getAvailablePaymentTermForDate = (
  tourDate: string,
  fromDate: Date = new Date(),
): AvailablePaymentTerm => {
  if (!tourDate) return { term: "", isLastMinute: false, isInvalid: false };

  const daysBetween = calculateDaysBetween(tourDate, fromDate);

  if (daysBetween < 2) {
    return { term: "invalid", isLastMinute: false, isInvalid: true };
  }

  if (daysBetween >= 2 && daysBetween < 30) {
    return { term: "full_payment", isLastMinute: true, isInvalid: false };
  }

  const today = new Date(fromDate);
  const tourDateObj = new Date(tourDate);
  const fullPaymentDue = new Date(tourDateObj);
  fullPaymentDue.setDate(fullPaymentDue.getDate() - 30);

  const yearDiff = fullPaymentDue.getFullYear() - today.getFullYear();
  const monthDiff = fullPaymentDue.getMonth() - today.getMonth();
  const monthCount = Math.max(0, yearDiff * 12 + monthDiff);

  if (monthCount >= 4) {
    return { term: "P4", isLastMinute: false, isInvalid: false };
  }

  if (monthCount === 3) {
    return { term: "P3", isLastMinute: false, isInvalid: false };
  }

  if (monthCount === 2) {
    return { term: "P2", isLastMinute: false, isInvalid: false };
  }

  if (monthCount === 1) {
    return { term: "P1", isLastMinute: false, isInvalid: false };
  }

  return { term: "full_payment", isLastMinute: true, isInvalid: false };
};

export const fixTermName = (name: string): string => {
  return name
    .replace(/Instalment/g, "Installment")
    .replace(/instalments/g, "installments");
};

export const getFriendlyDescription = (monthsRequired: number): string => {
  switch (monthsRequired) {
    case 1:
      return "Ready to pay in full? Pick me.";
    case 2:
      return "Want to split it into two payments? This is it!";
    case 3:
      return "If you like, you can make three equal payments, too!";
    case 4:
      return "Since you're booking early, take advantage of 4 easy payments. No extra charges!";
    default:
      return "";
  }
};

export const generatePaymentScheduleForMonths = ({
  tourDate,
  monthsRequired,
  totalTourPrice,
  depositAmount,
  fromDate = new Date(),
}: GeneratePaymentScheduleInput): PaymentScheduleItem[] => {
  if (!tourDate || monthsRequired <= 0) return [];

  const remainingBalance = totalTourPrice - depositAmount;
  const monthlyAmount = remainingBalance / monthsRequired;
  const schedule: PaymentScheduleItem[] = [];

  const today = new Date(fromDate);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;

  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }

  for (let i = 0; i < monthsRequired; i++) {
    let paymentMonth = nextMonth + i;
    let paymentYear = nextYear;

    while (paymentMonth > 11) {
      paymentMonth -= 12;
      paymentYear++;
    }

    const dateStr = `${paymentYear}-${String(paymentMonth + 1).padStart(2, "0")}-02`;

    schedule.push({
      date: dateStr,
      amount:
        i === monthsRequired - 1
          ? remainingBalance - monthlyAmount * (monthsRequired - 1)
          : monthlyAmount,
    });
  }

  return schedule;
};
