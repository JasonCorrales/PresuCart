export type BarcodeScanResult = {
  rawValue?: string | null;
};

const barcodeFormatLabels: Record<string, string> = {
  aztec: "Aztec",
  codabar: "Codabar",
  code_39: "Code 39",
  code_93: "Code 93",
  code_128: "Code 128",
  data_matrix: "Data Matrix",
  ean_8: "EAN-8",
  ean_13: "EAN-13",
  itf: "ITF",
  pdf417: "PDF417",
  qr_code: "QR",
  upc_a: "UPC-A",
  upc_e: "UPC-E",
};

export const preferredBarcodeFormats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"] as const;

export function normalizeBarcodeScanResult(result: BarcodeScanResult | null | undefined): string | null {
  const normalized = result?.rawValue?.trim().replace(/\s+/g, "") ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function getBarcodeFormatLabel(format: string): string {
  return barcodeFormatLabels[format] ?? format.replace(/_/g, " ").toUpperCase();
}
