import { assertIntegerMoney } from "./money";

export type AlertState = "normal" | "warning" | "danger" | "exceeded";

export type BudgetItem = {
  unitPrice: number;
  quantity: number;
};

export type BudgetSummary = {
  budget: number;
  spent: number;
  available: number;
  usedPercent: number;
  alertState: AlertState;
};

export function itemSubtotal(item: BudgetItem): number {
  assertIntegerMoney(item.unitPrice, "unitPrice");
  if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
    throw new Error("quantity debe ser un entero mayor que cero");
  }

  const subtotal = item.unitPrice * item.quantity;
  assertIntegerMoney(subtotal, "subtotal");
  return subtotal;
}

export function calculateBudgetSummary(budget: number, items: BudgetItem[]): BudgetSummary {
  assertIntegerMoney(budget, "budget");
  if (budget === 0) {
    throw new Error("budget debe ser mayor que cero");
  }

  const spent = items.reduce((total, item) => total + itemSubtotal(item), 0);
  const usedPercent = (spent / budget) * 100;

  return {
    budget,
    spent,
    available: budget - spent,
    usedPercent,
    alertState: getAlertState(usedPercent),
  };
}

export function getAlertState(usedPercent: number): AlertState {
  if (!Number.isFinite(usedPercent) || usedPercent < 0) {
    throw new Error("usedPercent debe ser un número válido no negativo");
  }

  if (usedPercent >= 100) return "exceeded";
  if (usedPercent >= 95) return "danger";
  if (usedPercent >= 80) return "warning";
  return "normal";
}
