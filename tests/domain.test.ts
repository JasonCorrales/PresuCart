import { describe, expect, it } from "vitest";
import { getBarcodeFormatLabel, normalizeBarcodeScanResult, preferredBarcodeFormats } from "@/domain/barcodeScanner";
import { calculateBudgetSummary, getAlertState, itemSubtotal } from "@/domain/budget";
import { extractPriceCandidates, formatOcrCandidateAmount } from "@/domain/ocrPrice";
import { formatCRC, formatSignedCRC, parseCRC } from "@/domain/money";
import { normalizeOptionalProductIdentity, getProductSnapshotLabel, hasProductIdentity } from "@/domain/productIdentity";
import { adjustQuantityInput, normalizeOptionalText, parsePositiveCRCAmount, parsePositiveQuantity } from "@/domain/purchaseInput";
import { getPurchaseAmountSignal, getPurchaseStoreLabel, groupPurchasesByStatus } from "@/domain/purchaseHistory";
import type { Purchase } from "@/types/database";

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

describe("product identity utilities", () => {
  it("keeps product identity optional for quick add", () => {
    const identity = normalizeOptionalProductIdentity("   ", "   ");

    expect(identity).toEqual({ name: null, barcode: null });
    expect(hasProductIdentity(identity)).toBe(false);
    expect(getProductSnapshotLabel(identity)).toBeNull();
  });

  it("normalizes optional product name and barcode without using barcode as price", () => {
    const identity = normalizeOptionalProductIdentity("  Leche   Dos Pinos  ", " 7 441001 234567 ");

    expect(identity).toEqual({ name: "Leche Dos Pinos", barcode: "7441001234567" });
    expect(hasProductIdentity(identity)).toBe(true);
    expect(getProductSnapshotLabel(identity)).toBe("Leche Dos Pinos");
  });

  it("derives barcode fallback labels for item snapshots", () => {
    expect(getProductSnapshotLabel(normalizeOptionalProductIdentity("", " ABC-123 "))).toBe("Código ABC-123");
  });
});

describe("barcode scanner utilities", () => {
  it("normalizes detected barcode values for the manual code field", () => {
    expect(normalizeBarcodeScanResult({ rawValue: " 7 441001 234567 " })).toBe("7441001234567");
    expect(normalizeBarcodeScanResult({ rawValue: "   " })).toBeNull();
    expect(normalizeBarcodeScanResult(null)).toBeNull();
  });

  it("keeps grocery barcode formats preferred and labels fallback formats", () => {
    expect(preferredBarcodeFormats.slice(0, 4)).toEqual(["ean_13", "ean_8", "upc_a", "upc_e"]);
    expect(getBarcodeFormatLabel("ean_13")).toBe("EAN-13");
    expect(getBarcodeFormatLabel("unknown_format")).toBe("UNKNOWN FORMAT");
  });
});

describe("purchase history utilities", () => {
  const basePurchase: Purchase = {
    id: "purchase-1",
    owner_id: "user-1",
    store_id: null,
    store_name_snapshot: null,
    budget_amount: 75000,
    total_amount: 50000,
    status: "activa",
    started_at: "2026-01-01T10:00:00.000Z",
    finished_at: null,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
  };

  it("groups active and finalized purchases for history sections", () => {
    const active = { ...basePurchase, id: "active", status: "activa" as const };
    const finalized = { ...basePurchase, id: "done", status: "finalizada" as const, finished_at: "2026-01-01T11:00:00.000Z" };
    const cancelada = { ...basePurchase, id: "cancel", status: "cancelada" as const };

    expect(groupPurchasesByStatus([finalized, active, cancelada])).toEqual({ active: [active], finalized: [finalized] });
  });

  it("builds store fallback copy and budget availability signal", () => {
    expect(getPurchaseStoreLabel(basePurchase)).toBe("Supermercado sin nombre");
    expect(getPurchaseStoreLabel({ ...basePurchase, store_name_snapshot: "  Feria  " })).toBe("Feria");
    expect(getPurchaseAmountSignal(basePurchase)).toEqual({ available: 25000, isOverBudget: false });
    expect(getPurchaseAmountSignal({ ...basePurchase, total_amount: 80000 })).toEqual({ available: -5000, isOverBudget: true });
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

  it("deduplicates noisy camera OCR output while preserving first-seen prices", () => {
    const candidates = extractPriceCandidates("CAMARA borrosa ₡2.500 precio 2500 total ₡7.500");

    expect(candidates).toEqual([
      { amount: 2500, raw: "₡2.500" },
      { amount: 7500, raw: "₡7.500" },
    ]);
  });

  it("shows OCR candidates without separators that look like decimals", () => {
    expect(formatOcrCandidateAmount(1250)).toBe("₡1250");
    expect(formatOcrCandidateAmount(2500)).toBe("₡2500");
  });

  it("returns no OCR price when text has no valid amount", () => {
    expect(extractPriceCandidates("sin precio visible")).toEqual([]);
  });
});
