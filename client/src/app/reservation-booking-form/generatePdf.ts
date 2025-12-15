import jsPDF from "jspdf";

export function generateBookingConfirmationPDF(
  bookingId: string,
  tourName: string,
  tourDate: string,
  email: string,
  firstName: string,
  lastName: string,
  paymentPlan: string,
  reservationFee: number,
  totalAmount: number,
  remainingBalance: number,
  paymentDate: string,
  currency: string = "GBP"
) {
  const currencySymbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Set font
  pdf.setFont("helvetica", "normal");

  // PAGE 1: RESERVATION CONFIRMATION
  // Header: Logo at top-right only
  try {
    const logoWidth = 45;
    const logoHeight = 11;
    pdf.addImage("/logos/Digital_Horizontal_Red.svg", "SVG", pageWidth - 15 - logoWidth, yPosition - 5, logoWidth, logoHeight);
    yPosition += 8;
  } catch {
    // Fallback: brand wordmark in crimson red
    pdf.setTextColor(239, 51, 64);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("I'm Here Travels", pageWidth - 15, yPosition, { align: "right" });
    yPosition += 8;
  }

  // Reservation ID and date - right aligned
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(bookingId, pageWidth - 15, yPosition, { align: "right" });

  yPosition += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(paymentDate, pageWidth - 15, yPosition, { align: "right" });

  // Divider line
  yPosition += 10;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);

  // Confirmation Message - using brand typography (Heading style)
  yPosition += 15;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(32);
  pdf.setTextColor(239, 51, 64);
  pdf.text("Reservation Confirmed!", 15, yPosition);

  yPosition += 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(51, 51, 51);
  pdf.text(`You're all set for ${tourName}`, 15, yPosition);

  // Customer Information Section - using brand typography
  yPosition += 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("CUSTOMER INFORMATION", 15, yPosition);

  yPosition += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Name:", 15, yPosition);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${firstName} ${lastName}`, 60, yPosition);

  yPosition += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  pdf.text("Email:", 15, yPosition);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(email, 60, yPosition);

  // Reservation Details Section
  yPosition += 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("RESERVATION DETAILS", 15, yPosition);

  yPosition += 8;
  const details = [
    { label: "Reservation ID", value: bookingId },
    { label: "Tour Name", value: tourName },
    { label: "Tour Date", value: tourDate },
    { label: "Payment Plan", value: paymentPlan },
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  details.forEach((item) => {
    pdf.setTextColor(80, 80, 80);
    pdf.text(item.label + ":", 15, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.text(item.value, 70, yPosition);
    pdf.setFont("helvetica", "normal");
    yPosition += 7;
  });

  // Payment Summary Section
  yPosition += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("PAYMENT SUMMARY", 15, yPosition);

  yPosition += 8;
  const summary = [
    { label: "Tour Cost", value: `${currencySymbol}${totalAmount.toFixed(2)}` },
    {
      label: "Reservation Fee Paid",
      value: `-${currencySymbol}${reservationFee.toFixed(2)}`,
    },
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  summary.forEach((item) => {
    pdf.setTextColor(80, 80, 80);
    pdf.text(item.label + ":", 15, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.text(item.value, 70, yPosition);
    pdf.setFont("helvetica", "normal");
    yPosition += 7;
  });

  yPosition += 5;
  pdf.setDrawColor(209, 213, 219);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);

  yPosition += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(239, 51, 64);
  pdf.text("Remaining Balance:", 15, yPosition);
  pdf.text(`${currencySymbol}${remainingBalance.toFixed(2)}`, pageWidth - 15, yPosition, {
    align: "right",
  });

  // Footer
  yPosition = pageHeight - 20;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Thank you for choosing I'm Here Travels!", pageWidth / 2, yPosition, { align: "center" });

  yPosition += 5;
  pdf.text("Questions? Contact us at support@imheretravels.com", pageWidth / 2, yPosition, { align: "center" });

  // PAGE 2: RECEIPT
  pdf.addPage();
  yPosition = 20;

  // Header: Logo at top-right only
  try {
    const logoWidth = 45;
    const logoHeight = 11;
    pdf.addImage("/logos/Digital_Horizontal_Red.svg", "SVG", pageWidth - 15 - logoWidth, yPosition - 5, logoWidth, logoHeight);
    yPosition += 8;
  } catch {
    pdf.setTextColor(239, 51, 64);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("I'm Here Travels", pageWidth - 15, yPosition, { align: "right" });
    yPosition += 8;
  }

  // Reservation ID and date - right aligned
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text(bookingId, pageWidth - 15, yPosition, { align: "right" });

  yPosition += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(paymentDate, pageWidth - 15, yPosition, { align: "right" });

  // Divider line
  yPosition += 10;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);

  // Receipt Banner - using brand typography (Subhead style)
  yPosition += 15;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(239, 51, 64);
  pdf.text("Payment Receipt", 15, yPosition);

  // Amount Paid Section
  yPosition += 20;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("AMOUNT PAID", 15, yPosition);

  yPosition += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    `${currencySymbol}${reservationFee.toFixed(2)}`,
    15,
    yPosition
  );

  yPosition += 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Date Paid:", 15, yPosition);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(paymentDate, 70, yPosition);

  // Summary Section
  yPosition += 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("SUMMARY", 15, yPosition);

  yPosition += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Reservation Fee:", 15, yPosition);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${currencySymbol}${reservationFee.toFixed(2)}`, 70, yPosition);

  // Reservation Details Section
  yPosition += 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("RESERVATION DETAILS", 15, yPosition);

  yPosition += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  details.forEach((item) => {
    pdf.setTextColor(80, 80, 80);
    pdf.text(item.label + ":", 15, yPosition);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text(item.value, 70, yPosition);
    pdf.setFont("helvetica", "normal");
    yPosition += 7;
  });

  // Footer
  yPosition = pageHeight - 20;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    "This receipt confirms your payment for the reservation fee.",
    pageWidth / 2,
    yPosition,
    { align: "center" }
  );

  yPosition += 4;
  pdf.text("Please keep this for your records.", pageWidth / 2, yPosition, {
    align: "center",
  });

  yPosition += 4;
  pdf.text("Questions? Contact us at support@imheretravels.com", pageWidth / 2, yPosition, {
    align: "center",
  });

  return pdf;
}
