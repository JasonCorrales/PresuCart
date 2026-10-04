import { describe, expect, it } from "vitest";
import { calculateBudgetSummary, getAlertState, itemSubtotal } from "@/domain/budget";
import { extractPriceCandidates } from "@/domain/ocrPrice";
import { formatCRC, formatSignedCRC, parseCRC } from "@/domain/money";
import { adjustQuantityInput, normalizeOptionalText, parsePositiveCRCAmount, parsePositiveQuantity } from "@/domain/purchaseInput";

describe("money utilities", () => {
  it("formats and parses CRC integer amounts", () => {
    expect(formatCRC(150000)).toBe("₡150.000");
    expect(parseCRC("₡4.750")).toBe(4750);
    expect(parseCRC("4,750")).toBe(4750);
    expect(parseCRC("1250")).toBe(1250);
  });

  it("formats signed display amounts and rejects invalid money values", () => {
    expect(formatSignedCRC(-10000)).toBe("-₡10.000");
    expect(parseCRC("abc")).toBeNull();
    expect(parseCRC("12.50")).toBeNull();
    expect(() => formatCRC(-1)).toThrow();
  });
});

describe("budget calculations", () => {
  it("calculates budget 150000 with 5000 x 2", () => {
    const summary = calculateBudgetSummary(150000, [{ unitPrice: 5000, quantity: 2 }]);

    expect(summary.spent).toBe(10000);
    expect(summary.available).toBe(140000);
    expect(summary.alertState).toBe("normal");
  });

  it("recalculates after removing one unit", () => {
    const summary = calculateBudgetSummary(150000, [{ unitPrice: 5000, quantity: 1 }]);

    expect(summary.spent).toBe(5000);
    expect(summary.available).toBe(145000);
  });

  it("recalculates after editing unit price and quantity", () => {
    const summary = calculateBudgetSummary(150000, [{ unitPrice: 7500, quantity: 3 }]);

    expect(itemSubtotal({ unitPrice: 7500, quantity: 3 })).toBe(22500);
    expect(summary.spent).toBe(22500);
    expect(summary.available).toBe(127500);
  });

  it("marks exact budget as exceeded threshold", () => {
    const summary = calculateBudgetSummary(150000, [{ unitPrice: 150000, quantity: 1 }]);

    expect(summary.usedPercent).toBe(100);
    expect(summary.available).toBe(0);
    expect(summary.alertState).toBe("exceeded");
  });

  it("marks exceeded budget", () => {
    const summary = calculateBudgetSummary(150000, [{ unitPrice: 80000, quantity: 2 }]);

    expect(summary.spent).toBe(160000);
    expect(summary.available).toBe(-10000);
    expect(summary.alertState).toBe("exceeded");
  });

  it("applies alert thresholds", () => {
    expect(getAlertState(79)).toBe("normal");
    expect(getAlertState(80)).toBe("warning");
    expect(getAlertState(94)).toBe("warning");
    expect(getAlertState(95)).toBe("danger");
    expect(getAlertState(99)).toBe("danger");
    expect(getAlertState(100)).toBe("exceeded");
  });

  it("rejects invalid budget item values", () => {
    expect(() => calculateBudgetSummary(0, [])).toThrow();
    expect(() => itemSubtotal({ unitPrice: 1000.5, quantity: 1 })).toThrow();
    expect(() => itemSubtotal({ unitPrice: 1000, quantity: 0 })).toThrow();
  });
});

describe("purchase input utilities", () => {
  it("accepts positive CRC amounts for form submissions", () => {
    expect(parsePositiveCRCAmount("₡75.000", "El presupuesto")).toEqual({ ok: true, amount: 75000 });
  });

  it("rejects zero, blank and decimal form amounts", () => {
    expect(parsePositiveCRCAmount("0", "El precio")).toEqual({ ok: false, message: "El precio debe ser mayor que cero." });
    expect(parsePositiveCRCAmount("", "El precio").ok).toBe(false);
    expect(parsePositiveCRCAmount("12.50", "El precio").ok).toBe(false);
  });

  it("validates positive integer quantities for add and edit flows", () => {
    expect(parsePositiveQuantity("3")).toEqual({ ok: true, quantity: 3 });
    expect(parsePositiveQuantity("0")).toEqual({ ok: false, message: "La cantidad debe ser un entero mayor que cero." });
    expect(parsePositiveQuantity("1.5").ok).toBe(false);
  });

  it("adjusts quick quantity controls without dropping below one", () => {
    expect(adjustQuantityInput("2", 1)).toBe("3");
    expect(adjustQuantityInput("2", -1)).toBe("1");
    expect(adjustQuantityInput("1", -1)).toBe("1");
    expect(adjustQuantityInput("", 1)).toBe("2");
  });

  it("normalizes optional text snapshots", () => {
    expect(normalizeOptionalText("  Palí  ")).toBe("Palí");
    expect(normalizeOptionalText("   ")).toBeNull();
  });
});

describe("OCR price extraction", () => {
  it("extracts multiple OCR numbers as price candidates", () => {
    const candidates = extractPriceCandidates("Precio regular ₡5.250 Oferta ₡4.395 Precio por kg ₡2.197");

    expect(candidates.map((candidate) => candidate.amount)).toEqual([5250, 4395, 2197]);
  });

  it("supports examples without currency symbol", () => {
    const candidates = extractPriceCandidates("Etiqueta: 1250 y promo 4,750");

    expect(candidates.map((candidate) => candidate.amount)).toEqual([1250, 4750]);
  });

  it("returns no OCR price when text has no valid amount", () => {
    expect(extractPriceCandidates("sin precio visible")).toEqual([]);
  });
});
