import { describe, expect, it, vi } from "vitest";
import {
  discardExistingPaymentAction,
  reusePendingPaymentAction,
  reuseReservePaidAction,
  reuseTermsSelectedAction,
} from "./reuseExistingPaymentAction";

const createEffects = () => ({
  storage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    getAllKeys: vi.fn(() => []),
  },
  navigation: {
    replaceUrl: vi.fn(),
    replaceWithPaymentId: vi.fn(),
    reloadPage: vi.fn(),
  },
  notification: {
    alert: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  http: {
    getJson: vi.fn(),
    postJson: vi.fn(async () => ({ ok: true, data: {} })),
  },
  firestore: {
    getDocById: vi.fn(),
    updateDocById: vi.fn(),
    deleteDocById: vi.fn(async () => undefined),
  },
});

describe("discardExistingPaymentAction", () => {
  it("blocks discarding paid/confirmed records", async () => {
    const effects = createEffects();

    const result = await discardExistingPaymentAction({
      effects: effects as any,
      recId: "a",
      paymentStatus: "reserve_paid",
      foundStripePayments: [{ id: "a" }],
      createPlaceholder: async () => "new",
      initPaymentPayload: {
        email: "a@x.com",
        tourPackage: "tour-1",
        tourPackageName: "Tour 1",
        amountGBP: 250,
      },
    });

    expect(result.blocked).toBe(true);
    expect(effects.firestore.deleteDocById).not.toHaveBeenCalled();
    expect(effects.notification.alert).toHaveBeenCalled();
  });

  it("deletes a record and keeps modal open when others remain", async () => {
    const effects = createEffects();

    const result = await discardExistingPaymentAction({
      effects: effects as any,
      recId: "a",
      paymentStatus: "reserve_pending",
      foundStripePayments: [{ id: "a" }, { id: "b" }],
      createPlaceholder: async () => "new",
      initPaymentPayload: {
        email: "a@x.com",
        tourPackage: "tour-1",
        tourPackageName: "Tour 1",
        amountGBP: 250,
      },
    });

    expect(effects.firestore.deleteDocById).toHaveBeenCalledWith(
      "stripePayments",
      "a",
    );
    expect(result.updatedRecords).toEqual([{ id: "b" }]);
    expect(result.shouldCloseModal).toBe(false);
    expect(result.nextStep).toBeNull();
  });

  it("creates placeholder and initializes payment when last record is discarded", async () => {
    const effects = createEffects();

    const result = await discardExistingPaymentAction({
      effects: effects as any,
      recId: "a",
      paymentStatus: "reserve_pending",
      foundStripePayments: [{ id: "a" }],
      createPlaceholder: async () => "new-doc",
      initPaymentPayload: {
        email: "a@x.com",
        tourPackage: "tour-1",
        tourPackageName: "Tour 1",
        amountGBP: 250,
      },
    });

    expect(effects.http.postJson).toHaveBeenCalled();
    expect(result.shouldCloseModal).toBe(true);
    expect(result.nextStep).toBe(2);
    expect(result.shouldAddStepOne).toBe(true);
  });
});

describe("reusePendingPaymentAction", () => {
  it("initializes payment and persists navigation/storage side effects", async () => {
    const effects = createEffects();

    const result = await reusePendingPaymentAction({
      effects: effects as any,
      pathname: "/reservation-booking-form",
      rec: { id: "doc-1" },
      initPaymentPayload: {
        email: "a@x.com",
        tourPackage: "tour-1",
        tourPackageName: "Tour 1",
        amountGBP: 250,
      },
      sessionStorageKey: "stripe_payment_doc_a@x.com_tour-1",
    });

    expect(result.succeeded).toBe(true);
    expect(effects.http.postJson).toHaveBeenCalled();
    expect(effects.storage.setItem).toHaveBeenCalledWith(
      "stripe_payment_doc_a@x.com_tour-1",
      "doc-1",
    );
    expect(effects.navigation.replaceWithPaymentId).toHaveBeenCalledWith(
      "/reservation-booking-form",
      "doc-1",
    );
  });

  it("alerts and returns failed on init-payment error", async () => {
    const effects = createEffects();
    effects.http.postJson = vi.fn(async () => ({
      ok: false,
      data: { error: "init failed" },
    }));

    const result = await reusePendingPaymentAction({
      effects: effects as any,
      pathname: "/reservation-booking-form",
      rec: { id: "doc-1" },
      initPaymentPayload: {
        email: "a@x.com",
        tourPackage: "tour-1",
        tourPackageName: "Tour 1",
        amountGBP: 250,
      },
      sessionStorageKey: "stripe_payment_doc_a@x.com_tour-1",
    });

    expect(result.failed).toBe(true);
    expect(effects.notification.alert).toHaveBeenCalled();
  });
});

describe("reuseReservePaidAction", () => {
  it("reloads and returns verification-failed outcome when Stripe verify is not succeeded", async () => {
    const effects = createEffects();
    effects.http.getJson = vi.fn(async () => ({
      ok: true,
      data: { status: "requires_payment_method" },
    }));

    const result = await reuseReservePaidAction({
      effects: effects as any,
      pathname: "/reservation-booking-form",
      rec: {
        id: "doc-1",
        payment: { stripeIntentId: "pi_123" },
        booking: { id: "booking-1" },
      },
      sessionStorageKey: "stripe_payment_doc_a@x.com_tour-1",
    });

    expect(result.outcome).toBe("verification-failed-reload");
    expect(effects.firestore.updateDocById).toHaveBeenCalledWith(
      "stripePayments",
      "doc-1",
      { "payment.status": "reserve_pending" },
    );
    expect(effects.navigation.reloadPage).toHaveBeenCalled();
  });

  it("returns confirmed-with-plan when booking has payment plan", async () => {
    const effects = createEffects();
    effects.http.getJson = vi.fn(async () => ({
      ok: true,
      data: { status: "succeeded" },
    }));
    effects.firestore.getDocById = vi.fn(async () => ({
      exists: true,
      data: { paymentPlan: { plan: "P3" } },
    }));

    const result = await reuseReservePaidAction({
      effects: effects as any,
      pathname: "/reservation-booking-form",
      rec: {
        id: "doc-1",
        payment: {
          stripeIntentId: "pi_123",
          paymentPlanDetails: { label: "P3" },
        },
        booking: { id: "booking-1" },
      },
      sessionStorageKey: "stripe_payment_doc_a@x.com_tour-1",
    });

    expect(result.outcome).toBe("confirmed-with-plan");
    expect(result.selectedPaymentPlan).toEqual({ plan: "P3" });
    expect(effects.storage.setItem).toHaveBeenCalled();
    expect(effects.navigation.replaceWithPaymentId).toHaveBeenCalledWith(
      "/reservation-booking-form",
      "doc-1",
    );
  });
});

describe("reuseTermsSelectedAction", () => {
  it("returns confirmed-with-plan when booking has payment plan", async () => {
    const effects = createEffects();
    effects.firestore.getDocById = vi.fn(async () => ({
      exists: true,
      data: { paymentPlan: { plan: "P6" } },
    }));

    const result = await reuseTermsSelectedAction({
      effects: effects as any,
      pathname: "/reservation-booking-form",
      rec: {
        id: "doc-2",
        payment: { paymentPlanDetails: { label: "P6" } },
        booking: { id: "booking-2" },
      },
      sessionStorageKey: "stripe_payment_doc_a@x.com_tour-1",
    });

    expect(result.outcome).toBe("confirmed-with-plan");
    expect(result.selectedPaymentPlan).toEqual({ plan: "P6" });
    expect(effects.storage.setItem).toHaveBeenCalledWith(
      "stripe_payment_doc_a@x.com_tour-1",
      "doc-2",
    );
    expect(effects.navigation.replaceWithPaymentId).toHaveBeenCalledWith(
      "/reservation-booking-form",
      "doc-2",
    );
  });

  it("returns confirmed-without-plan when booking has no payment plan", async () => {
    const effects = createEffects();
    effects.firestore.getDocById = vi.fn(async () => ({
      exists: true,
      data: {},
    }));

    const result = await reuseTermsSelectedAction({
      effects: effects as any,
      pathname: "/reservation-booking-form",
      rec: {
        id: "doc-3",
        paymentPlanDetails: { label: "P3" },
        booking: { id: "booking-3" },
      },
      sessionStorageKey: "stripe_payment_doc_a@x.com_tour-1",
    });

    expect(result.outcome).toBe("confirmed-without-plan");
    expect(result.selectedPaymentPlan).toBeNull();
  });
});
