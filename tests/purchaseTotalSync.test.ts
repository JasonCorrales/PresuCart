import { describe, expect, it, vi } from "vitest";
import { syncPurchaseStoredTotal, type PurchaseTotalSyncItem } from "@/domain/purchaseTotalSync";

describe("syncPurchaseStoredTotal", () => {
  it("reports insert/delete/edit total update failures without mutating purchase items", async () => {
    const itemsAfterInsert = [item("created", 1250, 2)];
    const itemsAfterEdit = [item("created", 1500, 3)];
    const itemsAfterDelete: PurchaseTotalSyncItem[] = [];
    const client = createClient([
      { error: { message: "insert total failed" }, data: null },
      { error: { message: "edit total failed" }, data: null },
      { error: { message: "delete total failed" }, data: null },
    ]);

    await expect(syncPurchaseStoredTotal(client, request(itemsAfterInsert))).resolves.toMatchObject({ ok: false, totalAmount: 2500, message: "insert total failed" });
    await expect(syncPurchaseStoredTotal(client, request(itemsAfterEdit))).resolves.toMatchObject({ ok: false, totalAmount: 4500, message: "edit total failed" });
    await expect(syncPurchaseStoredTotal(client, request(itemsAfterDelete))).resolves.toMatchObject({ ok: false, totalAmount: 0, message: "delete total failed" });

    expect(client.itemMutations).toEqual([]);
    expect(client.updates).toEqual([{ total_amount: 2500 }, { total_amount: 4500 }, { total_amount: 0 }]);
  });

  it("retries the same scoped total snapshot successfully without double item mutations", async () => {
    const currentItems = [item("kept", 1000, 2), item("edited", 750, 2)];
    const client = createClient([
      { error: { message: "network down" }, data: null },
      { error: null, data: { id: "purchase-1", total_amount: 3500 } },
    ]);

    const firstAttempt = await syncPurchaseStoredTotal(client, request(currentItems));
    const retry = await syncPurchaseStoredTotal(client, request(currentItems));

    expect(firstAttempt).toMatchObject({ ok: false, totalAmount: 3500 });
    expect(retry).toEqual({ ok: true, totalAmount: 3500 });
    expect(client.itemMutations).toEqual([]);
    expect(client.filters).toEqual([
      ["id:purchase-1", "owner_id:user-1", "status:activa"],
      ["id:purchase-1", "owner_id:user-1", "status:activa"],
    ]);
  });

  it("treats thrown rejections and no-row update confirmations as visible failures", async () => {
    const currentItems = [item("kept", 500, 2)];
    const rejectedClient = createClient([new Error("connection reset")]);
    const noRowsClient = createClient([{ error: null, data: null }]);

    await expect(syncPurchaseStoredTotal(rejectedClient, request(currentItems))).resolves.toMatchObject({
      ok: false,
      totalAmount: 1000,
      message: "connection reset",
    });
    await expect(syncPurchaseStoredTotal(noRowsClient, request(currentItems))).resolves.toMatchObject({
      ok: false,
      totalAmount: 1000,
    });
  });
});

function item(id: string, unit_price_amount: number, quantity: number): PurchaseTotalSyncItem & { id: string } {
  return { id, unit_price_amount, quantity };
}

function request(items: PurchaseTotalSyncItem[]) {
  return { purchaseId: "purchase-1", ownerId: "user-1", items };
}

function createClient(results: (Error | { data: { id: string; total_amount: number } | null; error: { message?: string } | null })[]) {
  const updates: { total_amount: number }[] = [];
  const filters: string[][] = [];
  const itemMutations: string[] = [];

  return {
    updates,
    filters,
    itemMutations,
    from: vi.fn((table: string) => {
      if (table !== "purchases") {
        itemMutations.push(table);
      }

      return {
        update: vi.fn((values: { total_amount: number }) => {
          const currentFilters: string[] = [];
          updates.push(values);
          filters.push(currentFilters);
          const query = {
            eq: vi.fn((column: string, value: string) => {
              currentFilters.push(`${column}:${value}`);
              return query;
            }),
            select: vi.fn(() => query),
            single: vi.fn(async () => {
              const result = results.shift();
              if (result instanceof Error) throw result;
              return result ?? { data: null, error: { message: "missing mocked result" } };
            }),
          };
          return query;
        }),
      };
    }),
  };
}
