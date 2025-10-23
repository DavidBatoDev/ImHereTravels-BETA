import { db } from "@/lib/firebase";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";

type PendingDocUpdates = Record<string, any>; // fieldPath -> value

class BatchedWriter {
  private queue: Map<string, PendingDocUpdates> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private readonly debounceMs = 100; // Reduced from 200ms
  private readonly maxDocsPerFlush = 400; // Increased from 50 to handle more docs per batch
  private readonly maxBatchSize = 500; // Firestore batch limit

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

    const entries = Array.from(this.queue.entries());
    this.queue.clear();

    // Process in chunks to respect Firestore batch limits
    const chunkSize = this.maxBatchSize;
    const chunks = [];
    for (let i = 0; i < entries.length; i += chunkSize) {
      chunks.push(entries.slice(i, i + chunkSize));
    }

    console.log(
      `📦 [BATCHED WRITER] Flushing ${entries.length} documents in ${chunks.length} chunks`
    );

    // Process chunks in parallel for better performance
    const chunkPromises = chunks.map(async (chunk, chunkIndex) => {
      const batch = writeBatch(db);

      // Pre-fetch all documents in this chunk to avoid individual getDoc calls
      const docRefs = chunk.map(([docId]) => doc(db, "bookings", docId));
      const docSnaps = await Promise.all(
        docRefs.map((ref) => getDoc(ref).catch(() => null))
      );

      for (let i = 0; i < chunk.length; i++) {
        const [docId, updates] = chunk[i];
        const ref = docRefs[i];
        const snap = docSnaps[i];

        // Ensure updatedAt is set once for the update
        const payload: Record<string, any> = {
          ...updates,
          updatedAt: serverTimestamp(),
        };

        if (snap && snap.exists()) {
          batch.update(ref, payload);
        } else {
          // Create minimal doc
          batch.set(ref, {
            id: docId,
            createdAt: serverTimestamp(),
            ...payload,
          });
        }
      }

      try {
        await batch.commit();
        console.log(
          `✅ [BATCHED WRITER] Chunk ${chunkIndex + 1}/${
            chunks.length
          } committed successfully`
        );
      } catch (err) {
        console.error(
          `❌ [BATCHED WRITER] Chunk ${chunkIndex + 1}/${
            chunks.length
          } failed:`,
          err
        );
        throw err;
      }
    });

    try {
      await Promise.all(chunkPromises);
      console.log(
        `✅ [BATCHED WRITER] All ${chunks.length} chunks committed successfully`
      );
    } catch (err) {
      console.error("❌ [BATCHED WRITER] One or more chunks failed:", err);
    }
  }
}

export const batchedWriter = new BatchedWriter();
export default batchedWriter;
