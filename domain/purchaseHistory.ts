import type { Purchase } from "@/types/database";

export type PurchaseStatusGroups = {
  active: Purchase[];
  finalized: Purchase[];
};

export type PurchaseAmountSignal = {
  available: number;
  isOverBudget: boolean;
};

export function groupPurchasesByStatus(purchases: Purchase[]): PurchaseStatusGroups {
  return purchases.reduce<PurchaseStatusGroups>(
    (groups, purchase) => {
      if (purchase.status === "activa") groups.active.push(purchase);
      if (purchase.status === "finalizada") groups.finalized.push(purchase);
      return groups;
    },
    { active: [], finalized: [] },
  );
}

export function getPurchaseStoreLabel(purchase: Pick<Purchase, "store_name_snapshot">): string {
  return purchase.store_name_snapshot?.trim() || "Supermercado sin nombre";
}

export function getPurchaseAmountSignal(purchase: Pick<Purchase, "budget_amount" | "total_amount">): PurchaseAmountSignal {
  const available = purchase.budget_amount - purchase.total_amount;
  return {
    available,
    isOverBudget: available < 0,
  };
}

export function getPurchaseDisplayDate(purchase: Pick<Purchase, "started_at" | "finished_at" | "status">): string {
  const date = purchase.status === "finalizada" && purchase.finished_at ? purchase.finished_at : purchase.started_at;
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}
