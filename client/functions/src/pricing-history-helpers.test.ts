import assert from "node:assert/strict";
import {
  buildNewHistoryEntry,
  hasPricingChanged,
  PricingHistoryEntry,
  TourPackageState,
} from "./pricing-history-helpers";

// Test driver: uses plain Date for effectiveDate and ISO strings for
// travelDates.startDate, since these helpers are time-type-generic.

const toIsoDate = (startDate: any): string =>
  startDate instanceof Date ? startDate.toISOString() : String(startDate);

function simulatePriceUpdate(
  before: TourPackageState<Date>,
  after: TourPackageState<Date>,
  now: Date,
): { pricingHistory: PricingHistoryEntry<Date>[]; currentVersion: number } {
  if (!hasPricingChanged(before, after)) {
    throw new Error("Expected pricing change");
  }
  const currentHistory = after.pricingHistory || [];
  const currentVersion = after.currentVersion || 1;
  const newVersion = currentVersion + 1;
  const entry = buildNewHistoryEntry(after, newVersion, now, toIsoDate);
  return {
    pricingHistory: [...currentHistory, entry],
    currentVersion: newVersion,
  };
}

// ---------------------------------------------------------------------------
// Test 1: hasPricingChanged correctly detects (and ignores) changes.
// ---------------------------------------------------------------------------
{
  const base: TourPackageState<Date> = {
    pricing: { original: 1200, deposit: 200, currency: "GBP" },
    travelDates: [],
  };
  assert.equal(
    hasPricingChanged(base, { ...base, pricing: { ...base.pricing } }),
    false,
    "identical pricing should not be a change",
  );
  assert.equal(
    hasPricingChanged(base, {
      ...base,
      pricing: { ...base.pricing, original: 1099 },
    }),
    true,
    "original price change should be detected",
  );
  assert.equal(
    hasPricingChanged(
      { ...base, travelDates: [{ customOriginal: 1200 }] },
      { ...base, travelDates: [{ customOriginal: 1000 }] },
    ),
    true,
    "per-date custom price change should be detected",
  );
  console.log("✅ Test 1: hasPricingChanged detects changes correctly");
}

// ---------------------------------------------------------------------------
// Test 2: The bug the user reported — after two sequential price updates,
//   V1's effectiveDate MUST remain at createdAt, V2's at first-update time.
// ---------------------------------------------------------------------------
{
  const createdAt = new Date("2025-01-15T09:00:00Z");
  const firstUpdateAt = new Date("2025-06-10T14:30:00Z");
  const secondUpdateAt = new Date("2026-04-22T10:00:00Z");

  // Seeded by the POST /api/tours route on tour creation
  let state: TourPackageState<Date> = {
    pricing: { original: 1200, deposit: 200, currency: "GBP" },
    travelDates: [],
    currentVersion: 1,
    pricingHistory: [
      {
        version: 1,
        effectiveDate: createdAt,
        pricing: { original: 1200, deposit: 200, currency: "GBP" },
        changedBy: "admin-1",
        reason: "Initial tour package creation",
      },
    ],
  };

  // First price update: GBP 1200 -> GBP 1099
  const beforeFirst = state;
  const afterFirst: TourPackageState<Date> = {
    ...state,
    pricing: { original: 1099, deposit: 200, currency: "GBP" },
    updatedBy: "admin-1",
    priceUpdateReason: "Promotion",
  };
  const result1 = simulatePriceUpdate(beforeFirst, afterFirst, firstUpdateAt);

  assert.equal(result1.currentVersion, 2, "currentVersion should be 2");
  assert.equal(result1.pricingHistory.length, 2, "history should have 2 entries");
  assert.equal(result1.pricingHistory[0].version, 1);
  assert.deepEqual(
    result1.pricingHistory[0].effectiveDate,
    createdAt,
    "V1 effectiveDate must remain at createdAt after first update",
  );
  assert.equal(result1.pricingHistory[1].version, 2);
  assert.deepEqual(
    result1.pricingHistory[1].effectiveDate,
    firstUpdateAt,
    "V2 effectiveDate must equal firstUpdateAt",
  );
  assert.equal(
    result1.pricingHistory[1].pricing.original,
    1099,
    "V2 pricing should be the new (after) pricing",
  );

  console.log("✅ Test 2a: After first update, V1 date preserved, V2 date is update time");

  // Second price update: GBP 1099 -> GBP 999
  state = {
    ...afterFirst,
    pricingHistory: result1.pricingHistory,
    currentVersion: result1.currentVersion,
  };
  const beforeSecond = state;
  const afterSecond: TourPackageState<Date> = {
    ...state,
    pricing: { original: 999, deposit: 200, currency: "GBP" },
    updatedBy: "admin-1",
    priceUpdateReason: "Price reduction",
  };
  const result2 = simulatePriceUpdate(beforeSecond, afterSecond, secondUpdateAt);

  assert.equal(result2.currentVersion, 3, "currentVersion should be 3");
  assert.equal(result2.pricingHistory.length, 3, "history should have 3 entries");
  assert.deepEqual(
    result2.pricingHistory[0].effectiveDate,
    createdAt,
    "V1 effectiveDate STILL at createdAt (NOT overwritten by second update)",
  );
  assert.deepEqual(
    result2.pricingHistory[1].effectiveDate,
    firstUpdateAt,
    "V2 effectiveDate STILL at firstUpdateAt (the user's reported bug)",
  );
  assert.deepEqual(
    result2.pricingHistory[2].effectiveDate,
    secondUpdateAt,
    "V3 effectiveDate equals secondUpdateAt",
  );
  assert.equal(result2.pricingHistory[2].pricing.original, 999);

  console.log(
    "✅ Test 2b: After second update, V1 AND V2 dates preserved (regression bug is fixed)",
  );
}

// ---------------------------------------------------------------------------
// Test 3: No duplicate version numbers in history.
// ---------------------------------------------------------------------------
{
  const state: TourPackageState<Date> = {
    pricing: { original: 1200, deposit: 200, currency: "GBP" },
    currentVersion: 1,
    pricingHistory: [
      {
        version: 1,
        effectiveDate: new Date("2025-01-15"),
        pricing: { original: 1200, deposit: 200, currency: "GBP" },
      },
    ],
  };
  const after: TourPackageState<Date> = {
    ...state,
    pricing: { original: 900, deposit: 200, currency: "GBP" },
  };
  const result = simulatePriceUpdate(state, after, new Date("2025-06-01"));

  const versions = result.pricingHistory.map((h) => h.version);
  const uniqueVersions = new Set(versions);
  assert.equal(
    uniqueVersions.size,
    versions.length,
    `history versions must be unique, got ${JSON.stringify(versions)}`,
  );
  assert.deepEqual(versions, [1, 2], "versions should be sequential [1, 2]");

  console.log("✅ Test 3: No duplicate version numbers produced");
}

// ---------------------------------------------------------------------------
// Test 4: travelDates snapshot in the new entry reflects AFTER state.
// ---------------------------------------------------------------------------
{
  const date1 = new Date("2025-08-05T00:00:00Z");
  const date2 = new Date("2025-09-10T00:00:00Z");

  const before: TourPackageState<Date> = {
    pricing: { original: 1200, deposit: 200, currency: "GBP" },
    travelDates: [
      { startDate: date1 },
      { startDate: date2, customOriginal: 1100 },
    ],
    currentVersion: 1,
    pricingHistory: [],
  };
  const after: TourPackageState<Date> = {
    ...before,
    travelDates: [
      { startDate: date1, customOriginal: 1000 },
      { startDate: date2, customOriginal: 1100 },
    ],
  };

  const result = simulatePriceUpdate(before, after, new Date("2025-07-01"));
  const newEntry = result.pricingHistory[result.pricingHistory.length - 1];
  assert.ok(newEntry.travelDates, "new entry should have travelDates");
  assert.equal(newEntry.travelDates!.length, 2);
  assert.equal(newEntry.travelDates![0].date, date1.toISOString());
  assert.equal(
    newEntry.travelDates![0].customOriginal,
    1000,
    "new entry should snapshot the AFTER custom price",
  );
  assert.equal(newEntry.travelDates![1].customOriginal, 1100);

  console.log("✅ Test 4: travelDates snapshot reflects new (after) state");
}

console.log("\n🎉 All pricing history tests passed.");
