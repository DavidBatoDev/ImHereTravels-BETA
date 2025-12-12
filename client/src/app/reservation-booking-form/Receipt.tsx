"use client";

import React from "react";

interface ReceiptProps {
  bookingId: string;
  tourName: string;
  reservationFee: number;
  currency?: string;
  email: string;
  travelDate: string;
  paymentDate: string;
}

export default function Receipt({
  bookingId,
  tourName,
  reservationFee,
  currency = "GBP",
  email,
  travelDate,
  paymentDate,
}: ReceiptProps) {
  const currencySymbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";

  return (
    <div className="receipt-container">
      {/* Header with brand color - matching Booking Details card style */}
      <div className="receipt-header bg-gradient-to-r from-crimson-red to-red-600 text-white p-6 rounded-lg mb-4 print:rounded-lg print:mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">Receipt</h2>
          <p className="text-red-100 text-sm">from I'm Here Travels</p>
        </div>
        <div className="text-right">
          <p className="text-red-100 text-xs mb-1">RECEIPT</p>
          <p className="font-mono text-sm font-semibold">#{bookingId}</p>
        </div>
      </div>

      {/* Receipt Details - same styling as Reservation Details */}
      <div className="bg-muted/30 rounded-lg p-6 print:bg-gray-50 print:rounded-lg">
        {/* Amount Paid Section */}
        <div className="border-b border-border print:border-gray-300 pb-4 mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground print:text-gray-600 mb-3 uppercase tracking-wide">
            Amount Paid
          </h3>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xl font-bold text-foreground print:text-gray-900">
              {currencySymbol}{reservationFee.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground print:text-gray-600">Date Paid</span>
            <span className="font-medium text-foreground print:text-gray-900">{paymentDate}</span>
          </div>
        </div>

        {/* Summary Section */}
        <div className="border-b border-border print:border-gray-300 pb-4 mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground print:text-gray-600 mb-3 uppercase tracking-wide">
            Summary
          </h3>
          <div className="flex justify-between py-2">
            <span className="text-sm text-muted-foreground print:text-gray-600">
              Pay Balance Instalment
            </span>
            <span className="text-sm font-semibold text-foreground print:text-gray-900">
              {currencySymbol}{reservationFee.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Reservation Details */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground print:text-gray-600 mb-3 uppercase tracking-wide">
            Reservation Details
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border print:border-gray-300">
              <span className="text-sm text-muted-foreground print:text-gray-600">Reservation ID</span>
              <span className="text-sm font-mono font-semibold text-foreground print:text-gray-900">
                {bookingId}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border print:border-gray-300">
              <span className="text-sm text-muted-foreground print:text-gray-600">Tour</span>
              <span className="text-sm font-medium text-foreground print:text-gray-900">
                {tourName}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border print:border-gray-300">
              <span className="text-sm text-muted-foreground print:text-gray-600">Travel Date</span>
              <span className="text-sm font-medium text-foreground print:text-gray-900">
                {travelDate}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground print:text-gray-600">Email</span>
              <span className="text-sm font-medium text-foreground print:text-gray-900">
                {email}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
