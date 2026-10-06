import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Purchase, PurchaseItem } from "@/types/database";

const push = vi.fn();
const router = { push };
let supabaseClient: ReturnType<typeof createSupabaseClient>;

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "purchase-1" }),
  useRouter: () => router,
}));

vi.mock("@/services/supabase", () => ({
  createBrowserSupabaseClient: () => supabaseClient,
}));

const { default: PurchasePage } = await import("@/app/purchases/[id]/page");

describe("purchase page stored total sync", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
    supabaseClient = createSupabaseClient();
  });

  it("keeps the inserted item visible, warns when stored total/history is stale, and retries without inserting again", async () => {
    render(<PurchasePage />);

    expect(await screen.findByText("Super Test")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Precio unitario CRC"), { target: { value: "1200" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));

    expect(await screen.findByText("₡1.200 × 1")).toBeTruthy();
    expect(await screen.findByText(/El ítem sí quedó guardado/)).toBeTruthy();
    expect(screen.getByText(/historial puede mostrar un total anterior/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar guardar total" }));

    await waitFor(() => expect(screen.queryByText(/El ítem sí quedó guardado/)).toBeNull());
    expect(supabaseClient.insertedItems).toHaveLength(1);
    expect(supabaseClient.purchaseTotalUpdates).toEqual([1200, 1200]);
  });
});

function createSupabaseClient() {
  const purchase = purchaseFixture();
  const insertedItems: PurchaseItem[] = [];
  const purchaseTotalUpdates: number[] = [];
  let totalUpdateAttempts = 0;

  return {
    insertedItems,
    purchaseTotalUpdates,
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1", email: "u@example.com" } } })),
    },
    from: vi.fn((table: string) => createQuery(table, { purchase, insertedItems, purchaseTotalUpdates, get totalUpdateAttempts() { return totalUpdateAttempts; }, incrementTotalUpdateAttempts: () => { totalUpdateAttempts += 1; } })),
  };
}

function createQuery(
  table: string,
  state: {
    purchase: Purchase;
    insertedItems: PurchaseItem[];
    purchaseTotalUpdates: number[];
    totalUpdateAttempts: number;
    incrementTotalUpdateAttempts: () => void;
  },
) {
  const filters = new Map<string, string>();
  let updateValues: Record<string, unknown> | null = null;
  const query = {
    insert: vi.fn((values: Partial<PurchaseItem>) => {
      const created = itemFixture({
        id: "item-1",
        unit_price_amount: Number(values.unit_price_amount),
        quantity: Number(values.quantity),
      });
      state.insertedItems.push(created);
      return query;
    }),
    update: vi.fn((values: Record<string, unknown>) => {
      updateValues = values;
      return query;
    }),
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      filters.set(column, value);
      return query;
    }),
    order: vi.fn(async () => ({ data: [], error: null })),
    single: vi.fn(async () => {
      if (table === "purchases" && updateValues?.total_amount !== undefined) {
        const totalAmount = Number(updateValues.total_amount);
        state.purchaseTotalUpdates.push(totalAmount);
        state.incrementTotalUpdateAttempts();
        if (state.totalUpdateAttempts === 1) return { data: null, error: { message: "total failed" } };
        return { data: { id: state.purchase.id, total_amount: totalAmount }, error: null };
      }
      if (table === "purchases") return { data: state.purchase, error: null };
      if (table === "purchase_items") return { data: state.insertedItems.at(-1), error: null };
      throw new Error(`Unexpected single() on ${table}`);
    }),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  return query;
}

function purchaseFixture(): Purchase {
  return {
    id: "purchase-1",
    owner_id: "user-1",
    store_id: null,
    store_name_snapshot: "Super Test",
    budget_amount: 10000,
    total_amount: 0,
    status: "activa",
    started_at: "2026-01-01T10:00:00.000Z",
    finished_at: null,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
  };
}

function itemFixture(overrides: Pick<PurchaseItem, "id" | "unit_price_amount" | "quantity">): PurchaseItem {
  return {
    id: overrides.id,
    purchase_id: "purchase-1",
    product_id: null,
    product_name_snapshot: null,
    unit_price_amount: overrides.unit_price_amount,
    quantity: overrides.quantity,
    subtotal_amount: overrides.unit_price_amount * overrides.quantity,
    added_at: "2026-01-01T10:00:00.000Z",
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
  };
}
