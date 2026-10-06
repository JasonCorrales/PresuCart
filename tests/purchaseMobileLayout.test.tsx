import { render, screen } from "@testing-library/react";
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

describe("purchase page mobile layout", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
    supabaseClient = createSupabaseClient();
  });

  it("removes quick-add marketing copy while preserving compact summary, add actions, and default-hidden optional tools", async () => {
    render(<PurchasePage />);

    expect(await screen.findByText(/Supermercado Central/)).toBeTruthy();
    expect(screen.queryByText("Agregar precio")).toBeNull();
    expect(screen.queryByText("Flujo rápido: escribe precio, ajusta cantidad con botones grandes y sigue caminando.")).toBeNull();

    expect(screen.getByText("Disponible")).toBeTruthy();
    expect(screen.getByText("Presupuesto")).toBeTruthy();
    expect(screen.getByText("Gastado")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Finalizar compra" })).toBeTruthy();

    expect(screen.queryByText("Escáner local de precio")).toBeNull();
    expect(screen.queryByText("Identificar producto (opcional)")).toBeNull();

    const priceInput = screen.getByLabelText("Precio unitario CRC");
    const decrement = screen.getByRole("button", { name: "Bajar cantidad" });
    const increment = screen.getByRole("button", { name: "Subir cantidad" });
    const submit = screen.getByRole("button", { name: "Agregar al carrito" });

    expect(priceInput.compareDocumentPosition(decrement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(decrement.compareDocumentPosition(increment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(increment.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

function createSupabaseClient() {
  const purchase = purchaseFixture();
  const items = [itemFixture()];

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: "user-1", email: "u@example.com" } } })),
    },
    from: vi.fn((table: string) => createQuery(table, { purchase, items })),
  };
}

function createQuery(table: string, state: { purchase: Purchase; items: PurchaseItem[] }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(async () => ({ data: state.items, error: null })),
    single: vi.fn(async () => {
      if (table !== "purchases") throw new Error(`Unexpected single() on ${table}`);
      return { data: state.purchase, error: null };
    }),
  };
  return query;
}

function purchaseFixture(): Purchase {
  return {
    id: "purchase-1",
    owner_id: "user-1",
    store_id: null,
    store_name_snapshot: "Supermercado Central con nombre largo de prueba",
    budget_amount: 123456789,
    total_amount: 0,
    status: "activa",
    started_at: "2026-01-01T10:00:00.000Z",
    finished_at: null,
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
  };
}

function itemFixture(): PurchaseItem {
  return {
    id: "item-1",
    purchase_id: "purchase-1",
    product_id: null,
    product_name_snapshot: null,
    unit_price_amount: 9876543,
    quantity: 2,
    subtotal_amount: 19753086,
    added_at: "2026-01-01T10:00:00.000Z",
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
  };
}
