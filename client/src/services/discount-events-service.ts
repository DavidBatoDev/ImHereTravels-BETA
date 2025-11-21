import {
  addDoc,
  collection,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface DateDiscount {
  date: string; // ISO date string (YYYY-MM-DD)
  discountRate: number; // percent, e.g. 10 = 10%
  discountedCost: number; // derived and stored for quick access
}

export interface DiscountEventItem {
  tourPackageId: string;
  tourPackageName: string;
  originalCost: number;
  dateDiscounts: DateDiscount[]; // Array of dates with their individual discount rates
}

export interface DiscountEvent {
  id: string;
  name: string;
  active: boolean;
  items: DiscountEventItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const COLLECTION = "discountEvents";

export const DiscountEventsService = {
  async list(): Promise<DiscountEvent[]> {
    const snap = await getDocs(collection(db, COLLECTION));
    const events: DiscountEvent[] = [];
    snap.forEach((d) => {
      const data = d.data() as Omit<DiscountEvent, "id">;
      events.push({ id: d.id, ...data });
    });
    return events;
  },

  async create(input: {
    name: string;
    active: boolean;
    items: DiscountEventItem[];
  }): Promise<string> {
    const now = Timestamp.now();
    const ref = await addDoc(collection(db, COLLECTION), {
      name: input.name,
      active: input.active,
      items: input.items,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  },

  async setActive(id: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
      active,
      updatedAt: Timestamp.now(),
    });
  },

  async update(id: string, updates: Partial<Omit<DiscountEvent, "id">>) {
    await updateDoc(doc(db, COLLECTION, id), {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  async remove(id: string) {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};
