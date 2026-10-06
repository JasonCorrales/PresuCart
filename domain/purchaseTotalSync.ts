import { itemSubtotal } from "@/domain/budget";
import type { PurchaseItem } from "@/types/database";

export type PurchaseTotalSyncItem = Pick<PurchaseItem, "unit_price_amount" | "quantity">;

export type PurchaseTotalSyncRequest = {
  purchaseId: string;
  ownerId: string;
  items: PurchaseTotalSyncItem[];
};

type PurchaseTotalSyncResponse = {
  data?: { id: string; total_amount: number } | null;
  error?: { message?: string } | null;
};

type PurchaseTotalSyncQuery = {
  eq: (column: string, value: string) => PurchaseTotalSyncQuery;
  select: (columns: string) => PurchaseTotalSyncQuery;
  single: () => PromiseLike<PurchaseTotalSyncResponse>;
};

export type PurchaseTotalSyncClient = {
  from: (table: string) => {
    update: (values: { total_amount: number }) => PurchaseTotalSyncQuery;
  };
};

export type PurchaseTotalSyncResult =
  | { ok: true; totalAmount: number }
  | { ok: false; totalAmount: number; message: string };

export function calculatePurchaseStoredTotal(items: PurchaseTotalSyncItem[]) {
  return items.reduce((total, item) => total + itemSubtotal({ unitPrice: item.unit_price_amount, quantity: item.quantity }), 0);
}

export async function syncPurchaseStoredTotal(client: PurchaseTotalSyncClient, request: PurchaseTotalSyncRequest): Promise<PurchaseTotalSyncResult> {
  const totalAmount = calculatePurchaseStoredTotal(request.items);

  try {
    const { data, error } = await client
      .from("purchases")
      .update({ total_amount: totalAmount })
      .eq("id", request.purchaseId)
      .eq("owner_id", request.ownerId)
      .eq("status", "activa")
      .select("id,total_amount")
      .single();

    if (error) {
      return { ok: false, totalAmount, message: error.message ?? "No pudimos guardar el total de la compra." };
    }

    if (!data || data.id !== request.purchaseId || data.total_amount !== totalAmount) {
      return { ok: false, totalAmount, message: "No pudimos confirmar que el total guardado pertenezca a esta compra activa." };
    }

    return { ok: true, totalAmount };
  } catch (error) {
    return {
      ok: false,
      totalAmount,
      message: error instanceof Error ? error.message : "No pudimos guardar el total de la compra.",
    };
  }
}
