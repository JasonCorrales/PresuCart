import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("app/purchases/[id]/page.tsx", "utf8");

describe("purchase page compact add flow", () => {
  it("keeps top settings and places Agregar al carrito immediately after quantity before undo and optional sections", () => {
    const settingsIndex = source.indexOf("<PurchaseToolSettings");
    const quantityIndex = source.indexOf("<QuantityField\n                  value={quantityInput}");
    const submitIndex = source.indexOf('type="submit"', quantityIndex);
    const undoIndex = source.indexOf("{undoAdd ?", quantityIndex);
    const ocrIndex = source.indexOf("<OcrPriceScanner", quantityIndex);
    const productIndex = source.indexOf("<fieldset>", quantityIndex);

    expect(settingsIndex).toBeGreaterThan(-1);
    expect(quantityIndex).toBeGreaterThan(settingsIndex);
    expect(submitIndex).toBeGreaterThan(quantityIndex);
    expect(undoIndex).toBeGreaterThan(submitIndex);
    expect(ocrIndex).toBeGreaterThan(undoIndex);
    expect(productIndex).toBeGreaterThan(undoIndex);
  });
});
