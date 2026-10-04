import { parseCRC } from "./money";

export type AmountValidation =
  | { ok: true; amount: number }
  | { ok: false; message: string };

export function parsePositiveCRCAmount(input: string, fieldLabel: string): AmountValidation {
  const amount = parseCRC(input);

  if (amount === null) {
    return { ok: false, message: `${fieldLabel} debe ser un monto entero en colones.` };
  }

  if (amount <= 0) {
    return { ok: false, message: `${fieldLabel} debe ser mayor que cero.` };
  }

  return { ok: true, amount };
}

export type QuantityValidation =
  | { ok: true; quantity: number }
  | { ok: false; message: string };

export function parsePositiveQuantity(input: string, fieldLabel = "La cantidad"): QuantityValidation {
  const quantity = Number(input);

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return { ok: false, message: `${fieldLabel} debe ser un entero mayor que cero.` };
  }

  return { ok: true, quantity };
}

export function adjustQuantityInput(input: string, delta: number): string {
  const current = Number(input);
  const safeCurrent = Number.isSafeInteger(current) && current > 0 ? current : 1;
  return String(Math.max(1, safeCurrent + delta));
}

export function normalizeOptionalText(input: string): string | null {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}
