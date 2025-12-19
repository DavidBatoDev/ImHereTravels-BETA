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
  bannerCover?: string; // URL to banner cover image
  activationMode?: "manual" | "scheduled"; // manual toggle or scheduled window
  scheduledStart?: string; // ISO datetime when event becomes active
  scheduledEnd?: string; // ISO datetime when event stops being active
  discountType?: "percent" | "amount"; // whether discounts are percentage or flat amount
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
    bannerCover?: string;
    activationMode?: "manual" | "scheduled";
    scheduledStart?: string;
    scheduledEnd?: string;
    discountType?: "percent" | "amount";
  }): Promise<string> {
    const now = Timestamp.now();
    const activationMode = input.activationMode || "manual";
    const ref = await addDoc(collection(db, COLLECTION), {
      name: input.name,
      active: activationMode === "scheduled" ? true : input.active,
      items: input.items,
      bannerCover: input.bannerCover || "",
      activationMode,
      scheduledStart: input.scheduledStart || "",
      scheduledEnd: input.scheduledEnd || "",
      discountType: input.discountType || "percent",
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
