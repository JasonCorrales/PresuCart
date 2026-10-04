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

export function normalizeOptionalText(input: string): string | null {
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}
