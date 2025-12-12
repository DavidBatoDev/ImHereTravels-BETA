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
  let yPosition = 15;

  // Set font
  pdf.setFont("helvetica", "normal");

  // PAGE 1: BOOKING CONFIRMATION
  // Header: brand logo on the right, title on the left
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Booking Confirmation", 15, yPosition);

  // Try to render brand logo (Digital_Horizontal_Red.svg) top-right
  try {
    // public assets are served under "/" in Next.js
    const logoWidth = 40; // mm
    const logoHeight = 10; // mm (approx for horizontal logo)
    pdf.addImage("/logos/Digital_Horizontal_Red.svg", "SVG", pageWidth - 15 - logoWidth, yPosition - 7, logoWidth, logoHeight);
  } catch {
    // Fallback: brand wordmark in crimson red
    pdf.setTextColor(239, 51, 64);
    pdf.setFontSize(14);
    pdf.text("I'm Here Travels", pageWidth - 15, yPosition, { align: "right" });
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
  }

  // Right-aligned meta
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text("BOOKING CONFIRMATION", pageWidth - 15, yPosition + 8, { align: "right" });

  yPosition += 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text(bookingId, pageWidth - 15, yPosition, { align: "right" });

  yPosition += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(102, 102, 102);
  pdf.text(paymentDate, pageWidth - 15, yPosition, { align: "right" });

  // Divider line
  yPosition += 8;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);

  // Confirmation Message
  yPosition += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(239, 51, 64);
  pdf.text("Reservation Confirmed!", 15, yPosition);

  yPosition += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(51, 51, 51);
  pdf.setTextColor(51, 51, 51);
  pdf.text(`You're all set for ${tourName}`, 15, yPosition);

  // Customer Information Section
  yPosition += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(139, 139, 139);
  pdf.text("Customer Information", 15, yPosition);

  yPosition += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(139, 139, 139);
  pdf.text("Name:", 15, yPosition);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${firstName} ${lastName}`, 50, yPosition);

  yPosition += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(139, 139, 139);
  pdf.text("Email:", 15, yPosition);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(email, 50, yPosition);

  // Reservation Details Section
  yPosition += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(139, 139, 139);
  pdf.text("Reservation Details", 15, yPosition);

  yPosition += 6;
  const details = [
    { label: "Reservation ID", value: bookingId },
    { label: "Tour", value: tourName },
    { label: "Travel Date", value: tourDate },
    { label: "Payment Plan", value: paymentPlan },
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  details.forEach((item) => {
    pdf.setTextColor(139, 139, 139);
    pdf.text(item.label + ":", 15, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.text(item.value, 70, yPosition);
    yPosition += 6;
  });

  // Payment Summary Section
  yPosition += 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(139, 139, 139);
  pdf.text("Payment Summary", 15, yPosition);

  yPosition += 6;
  const summary = [
    { label: "Tour Cost", value: `${currencySymbol}${totalAmount.toFixed(2)}` },
    {
      label: "Reservation Fee Paid",
      value: `-${currencySymbol}${reservationFee.toFixed(2)}`,
    },
  ];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  summary.forEach((item) => {
    pdf.setTextColor(139, 139, 139);
    pdf.text(item.label + ":", 15, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.text(item.value, 70, yPosition);
    yPosition += 6;
  });

  yPosition += 3;
  pdf.setDrawColor(209, 213, 219);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);

  yPosition += 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(239, 51, 64);
  pdf.text("Remaining Balance:", 15, yPosition);
  pdf.text(`${currencySymbol}${remainingBalance.toFixed(2)}`, pageWidth - 15, yPosition, {
    align: "right",
  });

  // Footer
  yPosition = pageHeight - 20;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(102, 102, 102);
  pdf.text("Thank you for choosing I'm Here Travels!", pageWidth / 2, yPosition, { align: "center" });

  yPosition += 5;
  pdf.text("Questions? Contact us at support@imheretravels.com", pageWidth / 2, yPosition, { align: "center" });

  // PAGE 2: RECEIPT
  pdf.addPage();
  yPosition = 15;

  // Header: brand logo on the right, title on the left
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Payment Receipt", 15, yPosition);
  try {
    const logoWidth2 = 40;
    const logoHeight2 = 10;
    pdf.addImage("/logos/Digital_Horizontal_Red.svg", "SVG", pageWidth - 15 - logoWidth2, yPosition - 7, logoWidth2, logoHeight2);
  } catch {
    pdf.setTextColor(239, 51, 64);
    pdf.setFontSize(14);
    pdf.text("I'm Here Travels", pageWidth - 15, yPosition, { align: "right" });
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
  }

  // Right-aligned header info
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text("RECEIPT", pageWidth - 15, yPosition + 8, { align: "right" });

  yPosition += 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.text(bookingId, pageWidth - 15, yPosition, { align: "right" });

  yPosition += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(102, 102, 102);
  pdf.text(paymentDate, pageWidth - 15, yPosition, { align: "right" });

  // Divider line
  yPosition += 8;
  pdf.setDrawColor(229, 231, 235);
  pdf.line(15, yPosition, pageWidth - 15, yPosition);

  // Receipt Banner
  yPosition += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(239, 51, 64);
  pdf.text("Receipt", 15, yPosition);

  yPosition += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text("from I'm Here Travels", 15, yPosition);

  yPosition += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(102, 102, 102);
  pdf.text("Receipt #: " + bookingId, pageWidth - 15, yPosition - 5, { align: "right" });

  // Amount Paid Section
  yPosition += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(102, 102, 102);
  pdf.text("AMOUNT PAID", 15, yPosition);

  yPosition += 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    `${currencySymbol}${reservationFee.toFixed(2)}`,
    15,
    yPosition
  );

  yPosition += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(102, 102, 102);
  pdf.text("Date Paid:", 15, yPosition);
  pdf.setTextColor(0, 0, 0);
  pdf.text(paymentDate, 70, yPosition);

  // Summary Section
  yPosition += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(102, 102, 102);
  pdf.text("SUMMARY", 15, yPosition);

  yPosition += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(102, 102, 102);
  pdf.text("Pay Balance Instalment:", 15, yPosition);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${currencySymbol}${reservationFee.toFixed(2)}`, 70, yPosition);

  // Reservation Details Section
  yPosition += 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(139, 139, 139);
  pdf.text("Reservation Details", 15, yPosition);

  yPosition += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  details.forEach((item) => {
    pdf.setTextColor(102, 102, 102);
    pdf.text(item.label + ":", 15, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.text(item.value, 70, yPosition);
    yPosition += 6;
  });

  // Footer
  yPosition = pageHeight - 20;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(102, 102, 102);
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
