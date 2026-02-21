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
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

export const DiscountEventsService = {
  async list(): Promise<DiscountEvent[]> {
    const res = await fetch("/api/discount-events");
    if (!res.ok) {
      throw new Error(`Failed to list discount events: ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to fetch discount events");
    }
    return data.events;
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
    const res = await fetch("/api/discount-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new Error(`Failed to create discount event: ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to create discount event");
    }
    return data.id;
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const res = await fetch(`/api/discount-events/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      throw new Error(`Failed to set active state: ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to set active state");
    }
  },

  async update(id: string, updates: Partial<Omit<DiscountEvent, "id">>) {
    const res = await fetch(`/api/discount-events/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error(`Failed to update discount event: ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to update discount event");
    }
  },

  async remove(id: string) {
    const res = await fetch(`/api/discount-events/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(`Failed to remove discount event: ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to remove discount event");
    }
  },
};
