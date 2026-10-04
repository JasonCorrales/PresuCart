export const CRC_CURRENCY = "CRC";

export function formatCRC(amount: number): string {
  assertIntegerMoney(amount, "amount");
  return formatSignedCRC(amount);
}

export function formatSignedCRC(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new Error("amount debe ser un entero en colones");
  }

  const formattedNumber = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.abs(amount));
  return amount < 0 ? `-₡${formattedNumber}` : `₡${formattedNumber}`;
}

export function parseCRC(input: string): number | null {
  const normalized = input.trim();
  if (!normalized) return null;

  const withoutCurrency = normalized.replace(/[₡\s]/g, "");
  if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(withoutCurrency)) return null;

  const amount = Number(withoutCurrency.replace(/[.,]/g, ""));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function assertIntegerMoney(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} debe ser un entero no negativo en colones`);
  }
}
