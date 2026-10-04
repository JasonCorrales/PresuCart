export type OptionalProductIdentity = {
  name: string | null;
  barcode: string | null;
};

function normalizeProductName(input: string): string | null {
  const normalized = input.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function normalizeBarcode(input: string): string | null {
  const normalized = input.trim().replace(/\s+/g, "");
  return normalized.length > 0 ? normalized : null;
}

export function normalizeOptionalProductIdentity(nameInput: string, barcodeInput: string): OptionalProductIdentity {
  return {
    name: normalizeProductName(nameInput),
    barcode: normalizeBarcode(barcodeInput),
  };
}

export function hasProductIdentity(identity: OptionalProductIdentity): boolean {
  return identity.name !== null || identity.barcode !== null;
}

export function getProductSnapshotLabel(identity: OptionalProductIdentity): string | null {
  if (identity.name) return identity.name;
  if (identity.barcode) return `Código ${identity.barcode}`;
  return null;
}
