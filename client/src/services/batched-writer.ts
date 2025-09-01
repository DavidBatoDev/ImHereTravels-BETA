import { db } from "@/lib/firebase";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";

type PendingDocUpdates = Record<string, any>; // fieldPath -> value

class BatchedWriter {
  private queue: Map<string, PendingDocUpdates> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private readonly debounceMs = 200;
  private readonly maxDocsPerFlush = 50;

  queueFieldUpdate(docId: string, fieldPath: string, value: any) {
    const existing = this.queue.get(docId) || {};
    existing[fieldPath] = value;
    this.queue.set(docId, existing);

    // Flush if queue is big
    if (this.queue.size >= this.maxDocsPerFlush) {
      this.flush();
      return;
    }

    // Debounce flush
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.debounceMs);
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.size === 0) return;

    const batch = writeBatch(db);
    const entries = Array.from(this.queue.entries());

    this.queue.clear();

    for (const [docId, updates] of entries) {
      const ref = doc(db, "bookings", docId);

      // Ensure updatedAt is set once for the update
      const payload: Record<string, any> = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // We assume bookings exist; if not, we can fallback to set on missing
      const snap = await getDoc(ref).catch(() => null);
      if (snap && snap.exists()) {
        batch.update(ref, payload);
      } else {
        // Create minimal doc
        batch.set(ref, { id: docId, createdAt: serverTimestamp(), ...payload });
      }
    }

    try {
      await batch.commit();
    } catch (err) {
      console.error("❌ BatchedWriter flush failed", err);
    }
  }
}

export const batchedWriter = new BatchedWriter();
export default batchedWriter;
