import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildActivePurchaseDraftKey } from "@/domain/activePurchaseDraft";
import type { Purchase, PurchaseItem } from "@/types/database";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

type QueryResult<T> = { data: T; error: null };

let routePurchaseId = "purchase-old";
const push = vi.fn();
const router = { push };
let supabaseClient: ReturnType<typeof createSupabaseClient>;

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: routePurchaseId }),
  useRouter: () => router,
}));

vi.mock("@/services/supabase", () => ({
  createBrowserSupabaseClient: () => supabaseClient,
}));

const { default: PurchasePage } = await import("@/app/purchases/[id]/page");

describe("purchase route lifecycle", () => {
  beforeEach(() => {
    routePurchaseId = "purchase-old";
    push.mockClear();
    window.localStorage.clear();
    supabaseClient = createSupabaseClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores stale purchase loads and does not write the current draft into the old purchase", async () => {
    const { rerender } = render(<PurchasePage />);
    await waitFor(() => expect(supabaseClient.hasPurchaseRequest("purchase-old")).toBe(true));

    routePurchaseId = "purchase-new";
    rerender(<PurchasePage />);
    await waitFor(() => expect(supabaseClient.hasPurchaseRequest("purchase-new")).toBe(true));

    supabaseClient.resolvePurchase("purchase-new", purchaseFixture("purchase-new", "Super Nuevo"));
    supabaseClient.resolveItems("purchase-new", []);

    expect(await screen.findByText("Super Nuevo")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Precio unitario CRC"), { target: { value: "1234" } });

    await act(async () => {
      supabaseClient.resolvePurchase("purchase-old", purchaseFixture("purchase-old", "Super Viejo"));
      supabaseClient.resolveItems("purchase-old", []);
    });

    await waitFor(() => expect(screen.queryByText("Super Viejo")).toBeNull());
    expect(window.localStorage.getItem(buildActivePurchaseDraftKey("user-1", "purchase-old"))).toBeNull();
    expect(window.localStorage.getItem(buildActivePurchaseDraftKey("user-1", "purchase-new"))).toContain("1234");
  });
});

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function createSupabaseClient() {
  const purchaseDeferreds = new Map<string, Deferred<QueryResult<Purchase>>>();
  const itemDeferreds = new Map<string, Deferred<QueryResult<PurchaseItem[]>>>();

  function getPurchaseDeferred(purchaseId: string) {
    const existing = purchaseDeferreds.get(purchaseId);
    if (existing) return existing;
    const created = createDeferred<QueryResult<Purchase>>();
    purchaseDeferreds.set(purchaseId, created);
    return created;
  }

  function getItemsDeferred(purchaseId: string) {
    const existing = itemDeferreds.get(purchaseId);
    if (existing) return existing;
    const created = createDeferred<QueryResult<PurchaseItem[]>>();
    itemDeferreds.set(purchaseId, created);
    return created;
  }

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1", email: "u@example.com" } } })),
    },
    from: vi.fn((table: string) => createQuery(table, getPurchaseDeferred, getItemsDeferred)),
    hasPurchaseRequest: (purchaseId: string) => purchaseDeferreds.has(purchaseId),
    resolvePurchase: (purchaseId: string, purchase: Purchase) => getPurchaseDeferred(purchaseId).resolve({ data: purchase, error: null }),
    resolveItems: (purchaseId: string, items: PurchaseItem[]) => getItemsDeferred(purchaseId).resolve({ data: items, error: null }),
  };
}

function createQuery(
  table: string,
  getPurchaseDeferred: (purchaseId: string) => Deferred<QueryResult<Purchase>>,
  getItemsDeferred: (purchaseId: string) => Deferred<QueryResult<PurchaseItem[]>>,
) {
  const filters = new Map<string, string>();
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      filters.set(column, value);
      return query;
    }),
    single: vi.fn(() => {
      const purchaseId = filters.get("id") ?? filters.get("purchase_id") ?? "";
      if (table !== "purchases") throw new Error(`Unexpected single() on ${table}`);
      return getPurchaseDeferred(purchaseId).promise;
    }),
    order: vi.fn(() => {
      const purchaseId = filters.get("purchase_id") ?? "";
      if (table !== "purchase_items") throw new Error(`Unexpected order() on ${table}`);
      return getItemsDeferred(purchaseId).promise;
    }),
  };
  return query;
}

function purchaseFixture(id: string, storeName: string): Purchase {
  return {
    id,
    owner_id: "user-1",
    store_id: null,
    store_name_snapshot: storeName,
    budget_amount: 10000,
    total_amount: 0,
    status: "activa",
    started_at: "2026-01-01T10:00:00.000Z",
    finished_at: null,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
  };
}
