import { assertIntegerMoney, parseCRC } from "./money";

export type PriceCandidate = {
  amount: number;
  raw: string;
};

const PRICE_PATTERN = /₡\s*\d{1,3}(?:[.,]\d{3})+|₡\s*\d+|\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{4,6}\b/g;

export function extractPriceCandidates(text: string): PriceCandidate[] {
  const matches = text.match(PRICE_PATTERN) ?? [];
  const seen = new Set<number>();
  const candidates: PriceCandidate[] = [];

  for (const raw of matches) {
    const amount = parseCRC(raw);
    if (amount === null || amount <= 0) continue;
    if (seen.has(amount)) continue;

    seen.add(amount);
    candidates.push({ amount, raw: raw.trim() });
  }

  return candidates;
}

export function formatOcrCandidateAmount(amount: number): string {
  assertIntegerMoney(amount, "amount");
  return `₡${amount}`;
}
