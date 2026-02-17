import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const COLLECTION_NAME = "bookings";

/**
 * GET /api/bookings/next-row - Get the next available row number
 */
export async function GET() {
  try {
    const bookingsCollection = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(bookingsCollection);

    const allBookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (allBookings.length === 0) {
      return NextResponse.json({ success: true, rowNumber: 1 });
    }

    // Find the highest numeric ID
    const numericIds = allBookings
      .map((booking: any) => {
        const id = parseInt(booking.id);
        return isNaN(id) ? 0 : id;
      })
      .filter((id) => id > 0);

    if (numericIds.length === 0) {
      return NextResponse.json({ success: true, rowNumber: 1 });
    }

    const maxId = Math.max(...numericIds);
    const nextRowNumber = maxId + 1;

    return NextResponse.json({ success: true, rowNumber: nextRowNumber });
  } catch (error) {
    console.error("Error getting next row number:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get next row number",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
