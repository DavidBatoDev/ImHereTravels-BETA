import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const paymentsRef = collection(db, "stripePayments");
    const q = query(paymentsRef, orderBy("timestamps.createdAt", "desc"));
    const snapshot = await getDocs(q);

    const payments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate stats
    const stats = {
      all: payments.length,
      reservationFee: payments.filter((p: any) => p.payment?.type === "reservationFee").length,
      installment: payments.filter((p: any) => p.payment?.type === "installment").length,
      pending: payments.filter((p: any) => ["pending", "reserve_pending", "reservation_pending", "installment_pending"].includes(p.payment?.status)).length,
    };

    return NextResponse.json({
      success: true,
      data: payments,
      stats
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
