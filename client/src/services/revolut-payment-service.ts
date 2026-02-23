import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { storage, db } from "@/lib/firebase";
import { RevolutPaymentDocument } from "@/types/revolut-payment";

export class RevolutPaymentService {
  private static instance: RevolutPaymentService;
  private readonly COLLECTION_NAME = "revolutPayments";
  private readonly STORAGE_PATH = "revolutPayments";

  private constructor() {}

  public static getInstance(): RevolutPaymentService {
    if (!RevolutPaymentService.instance) {
      RevolutPaymentService.instance = new RevolutPaymentService();
    }
    return RevolutPaymentService.instance;
  }

  /**
   * Upload payment screenshot to Firebase Storage
   */
  async uploadScreenshot(
    file: File,
    bookingId: string
  ): Promise<{
    url: string;
    storagePath: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  }> {
    const timestamp = Date.now();
    const uniqueName = `${timestamp}_${file.name}`;
    const storagePath = `${this.STORAGE_PATH}/${bookingId}/${uniqueName}`;

    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return {
      url,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  }

  /**
   * Create a new Revolut payment document
   */
  async createPayment(
    data: Omit<RevolutPaymentDocument, "id" | "timestamps">
  ): Promise<string> {
    const bookingRef = doc(db, "bookings", data.booking.documentId);
    const bookingSnap = await getDoc(bookingRef);
    const bookingData = bookingSnap.exists() ? (bookingSnap.data() as any) : null;

    const bookingEmail =
      bookingData?.emailAddress ||
      bookingData?.email ||
      data.customer.email;

    const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
      ...data,
      customer: {
        ...data.customer,
        email: bookingEmail,
      },
      payment: {
        ...data.payment,
        status: "pending",
      },
      timestamps: {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    });
    return docRef.id;
  }

  /**
   * Update booking with revolut payment reference and status
   */
  async updateBookingForRevolutPayment(
    bookingDocumentId: string,
    revolutPaymentDocId: string,
    installmentTerm: string
  ): Promise<void> {
    const bookingRef = doc(db, "bookings", bookingDocumentId);
    await updateDoc(bookingRef, {
      revolutPaymentDocId,
      [`revolutPayments.${installmentTerm}`]: {
        revolutPaymentDocId,
        status: "pending",
        submittedAt: serverTimestamp(),
      },
    });
  }

  /**
   * Get a single revolut payment document
   */
  async getPayment(paymentId: string): Promise<RevolutPaymentDocument | null> {
    const docRef = doc(db, this.COLLECTION_NAME, paymentId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as RevolutPaymentDocument;
  }

  /**
   * Get all pending revolut payments for admin verification
   */
  async getPendingPayments(): Promise<RevolutPaymentDocument[]> {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where("payment.status", "==", "pending"),
      orderBy("timestamps.createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as RevolutPaymentDocument[];
  }

  /**
   * Subscribe to all revolut payments in realtime
   */
  subscribeToPayments(
    callback: (payments: RevolutPaymentDocument[]) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      orderBy("timestamps.createdAt", "desc")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const payments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RevolutPaymentDocument[];
        callback(payments);
      },
      (error) => {
        console.error("Error listening to revolut payments:", error);
        errorCallback?.(error);
      }
    );
  }

  /**
   * Approve a revolut payment — updates both revolutPayments and booking docs
   */
  async approvePayment(
    paymentId: string,
    bookingDocumentId: string,
    installmentTerm: string
  ): Promise<void> {
    // 1. Get the booking to recalculate totals
    const bookingRef = doc(db, "bookings", bookingDocumentId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      throw new Error(`Booking ${bookingDocumentId} not found`);
    }

    const booking = bookingSnap.data() as any;

    const paymentRef = doc(db, this.COLLECTION_NAME, paymentId);
    await updateDoc(paymentRef, {
      "payment.status": "approved",
      "timestamps.updatedAt": serverTimestamp(),
      "timestamps.approvedAt": serverTimestamp(),
    });

    // 3. Set the basic status updates for the Revolut payment node
    const updateData: Record<string, any> = {
      [`revolutPayments.${installmentTerm}.status`]: "approved",
      [`revolutPayments.${installmentTerm}.approvedAt`]: serverTimestamp(),
    };

    // 4. Set the datePaid field for the installment
    const prefix =
      installmentTerm === "full_payment" ? "fullPayment" : installmentTerm;
    updateData[`${prefix}DatePaid`] = serverTimestamp();
    
    // Clear scheduled reminder if any
    updateData[`${installmentTerm}ScheduledReminderDate`] = "";

    // 5. Recalculate totals similar to Stripe webhook
    const totalCost = booking.discountedTourCost || booking.originalTourCost || 0;
    
    // Start with reservation fee (always counted in total paid, but not paidTerms)
    let calculatedPaid = booking.reservationFee || 0;
    
    let installmentsPaidCount = 0;
    let totalInstallments = 0;
    let newBookingStatus = "";
    let newPaymentProgress = 0;
    let paidTerms = 0;

    const lastPaidDate = new Date();
    const formatDate = (d: Date): string =>
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    // Handle FULL PAYMENT
    if (installmentTerm === "full_payment") {
      const isAlreadyPaid =
        booking.fullPaymentDatePaid ||
        booking.paymentTokens?.full_payment?.status === "success" ||
        booking.revolutPayments?.full_payment?.status === "approved";

      // Always count this current payment since we are approving it now
      const amount = booking.fullPaymentAmount || 0;
      calculatedPaid += amount;
      paidTerms += amount;

      const newRemainingBalance = totalCost - calculatedPaid;
      newPaymentProgress = 100;

      if (newRemainingBalance <= 0.01) {
        newBookingStatus = `Booking Confirmed — ${formatDate(lastPaidDate)}`;
      } else {
        newBookingStatus = "Waiting for Full Payment";
      }

      updateData.paid = calculatedPaid;
      updateData.paidTerms = paidTerms;
      updateData.remainingBalance = newRemainingBalance;
      updateData.paymentProgress = `${newPaymentProgress}%`;
      updateData.bookingStatus = newBookingStatus;
    } else {
      // Handle INSTALLMENT PAYMENTS (P1, P2, P3, P4)
      const installments = ["p1", "p2", "p3", "p4"];
      totalInstallments = installments.filter(
        (id: string) => booking[`${id}Amount`] > 0
      ).length;

      installments.forEach((id: string) => {
        const isCurrentPayment = id === installmentTerm;
        const isAlreadyPaid =
          booking[`${id}DatePaid`] ||
          booking.paymentTokens?.[id]?.status === "success" ||
          booking.revolutPayments?.[id]?.status === "approved";

        if (isCurrentPayment || isAlreadyPaid) {
          const amount = booking[`${id}Amount`] || 0;
          calculatedPaid += amount;
          paidTerms += amount;
          installmentsPaidCount++;
        }
      });

      const newRemainingBalance = totalCost - calculatedPaid;
      
      const paidFlags = {
        p1: Boolean(
          booking.p1DatePaid ||
          booking.paymentTokens?.p1?.status === "success" ||
          booking.revolutPayments?.p1?.status === "approved" ||
          installmentTerm === "p1"
        ),
        p2: Boolean(
          booking.p2DatePaid ||
          booking.paymentTokens?.p2?.status === "success" ||
          booking.revolutPayments?.p2?.status === "approved" ||
          installmentTerm === "p2"
        ),
        p3: Boolean(
          booking.p3DatePaid ||
          booking.paymentTokens?.p3?.status === "success" ||
          booking.revolutPayments?.p3?.status === "approved" ||
          installmentTerm === "p3"
        ),
        p4: Boolean(
          booking.p4DatePaid ||
          booking.paymentTokens?.p4?.status === "success" ||
          booking.revolutPayments?.p4?.status === "approved" ||
          installmentTerm === "p4"
        ),
      };

      const plan = (booking.paymentPlan || "").trim();
      const planTerms = plan.match(/P(\d)/)
        ? parseInt(plan.match(/P(\d)/)![1], 10)
        : 0;

      newPaymentProgress =
        plan === "P1"
          ? paidFlags.p1
            ? 100
            : 0
          : plan === "P2"
            ? Math.round(
                ((Number(paidFlags.p1) + Number(paidFlags.p2)) / 2) * 100
              )
            : plan === "P3"
              ? Math.round(
                  ((Number(paidFlags.p1) +
                    Number(paidFlags.p2) +
                    Number(paidFlags.p3)) /
                    3) *
                    100
                )
              : plan === "P4"
                ? Math.round(
                    ((Number(paidFlags.p1) +
                      Number(paidFlags.p2) +
                      Number(paidFlags.p3) +
                      Number(paidFlags.p4)) /
                      4) *
                      100
                  )
                : 0;

      if (newRemainingBalance <= 0.01) {
        newBookingStatus = `Booking Confirmed — ${formatDate(lastPaidDate)}`;
      } else if (planTerms > 0) {
        newBookingStatus = `Installment ${installmentsPaidCount}/${totalInstallments} — last paid ${formatDate(lastPaidDate)}`;
      } else {
        newBookingStatus = `Installment ${installmentsPaidCount}/${totalInstallments}`;
      }

      updateData.paid = calculatedPaid;
      updateData.paidTerms = paidTerms;
      updateData.remainingBalance = newRemainingBalance;
      updateData.paymentProgress = `${newPaymentProgress}%`;
      updateData.bookingStatus = newBookingStatus;
    }

    // Include price snapshot updates if missing
    if (!booking.priceSnapshotDate) {
      updateData.priceSnapshotDate = serverTimestamp();
    }
    if (!booking.priceSource) {
      updateData.priceSource = "snapshot";
    }
    if (booking.lockPricing === undefined) {
      updateData.lockPricing = true;
    }

    // Update booking document with all gathered updates
    await updateDoc(bookingRef, updateData);
  }

  /**
   * Reject a revolut payment — updates both revolutPayments and booking docs
   */
  async rejectPayment(
    paymentId: string,
    bookingDocumentId: string,
    installmentTerm: string
  ): Promise<void> {
    // Update revolut payment status
    const paymentRef = doc(db, this.COLLECTION_NAME, paymentId);
    await updateDoc(paymentRef, {
      "payment.status": "rejected",
      "timestamps.updatedAt": serverTimestamp(),
      "timestamps.rejectedAt": serverTimestamp(),
    });

    // Update booking — reset revolut payment info
    const bookingRef = doc(db, "bookings", bookingDocumentId);
    await updateDoc(bookingRef, {
      [`revolutPayments.${installmentTerm}.status`]: "rejected",
      [`revolutPayments.${installmentTerm}.rejectedAt`]: serverTimestamp(),
    });
  }
}

const revolutPaymentService = RevolutPaymentService.getInstance();
export default revolutPaymentService;
