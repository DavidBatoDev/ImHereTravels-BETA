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
    data: Omit<RevolutPaymentDocument, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const bookingRef = doc(db, "bookings", data.bookingDocumentId);
    const bookingSnap = await getDoc(bookingRef);
    const bookingData = bookingSnap.exists() ? (bookingSnap.data() as any) : null;

    const bookingEmail =
      bookingData?.emailAddress ||
      bookingData?.email ||
      data.customer?.email ||
      data.userId ||
      "";

    const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
      ...data,
      userId: bookingEmail,
      customer: {
        ...(data.customer || {
          firstName: "",
          lastName: "",
        }),
        email: bookingEmail,
      },
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
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
      orderBy("createdAt", "desc")
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
    // Update revolut payment status
    const paymentRef = doc(db, this.COLLECTION_NAME, paymentId);
    await updateDoc(paymentRef, {
      status: "approved",
      updatedAt: serverTimestamp(),
    });

    // Update booking — mark installment as paid
    const bookingRef = doc(db, "bookings", bookingDocumentId);
    const updateData: Record<string, any> = {
      [`revolutPayments.${installmentTerm}.status`]: "approved",
      [`revolutPayments.${installmentTerm}.approvedAt`]: serverTimestamp(),
    };

    // Set the datePaid field for the installment
    const prefix =
      installmentTerm === "full_payment" ? "fullPayment" : installmentTerm;
    updateData[`${prefix}DatePaid`] = serverTimestamp();

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
      status: "rejected",
      updatedAt: serverTimestamp(),
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
