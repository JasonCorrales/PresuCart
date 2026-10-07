import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Purchase, PurchaseItem } from "@/types/database";

const push = vi.fn();
const scrollIntoView = vi.fn();
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
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
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

  it.each([
    { spent: 69, expectedPercent: "69%", expectedClass: "bg-emerald-300" },
    { spent: 70, expectedPercent: "70%", expectedClass: "bg-yellow-300" },
    { spent: 89, expectedPercent: "89%", expectedClass: "bg-yellow-300" },
    { spent: 90, expectedPercent: "90%", expectedClass: "bg-red-500" },
  ])("colors the active purchase progress fill for $expectedPercent budget usage", async ({ spent, expectedPercent, expectedClass }) => {
    supabaseClient = createSupabaseClient({ purchase: { budget_amount: 100 }, items: [{ unit_price_amount: spent, quantity: 1, subtotal_amount: spent }] });

    const { container } = render(<PurchasePage />);

    await screen.findByText(`${expectedPercent} usado`);
    const progressFill = container.querySelector<HTMLElement>(`div[style="width: ${expectedPercent};"]`);

    expect(progressFill).toBeTruthy();
    expect(progressFill?.className).toContain(expectedClass);
  });

  it("scrolls the active purchase summary into view after a successful add", async () => {
    render(<PurchasePage />);

    const priceInput = await screen.findByLabelText("Precio unitario CRC");
    fireEvent.change(priceInput, { target: { value: "2500" } });
    fireEvent.submit(screen.getByRole("button", { name: "Agregar al carrito" }).closest("form")!);

    await waitFor(() => expect(screen.getByText("Agregado: ₡2.500 × 1")).toBeTruthy());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect((scrollIntoView.mock.contexts[0] as HTMLElement).textContent).toContain("Compra activa");
    expect((scrollIntoView.mock.contexts[0] as HTMLElement).textContent).toContain("Disponible");
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
  });
});

function createSupabaseClient(overrides: { purchase?: Partial<Purchase>; items?: Partial<PurchaseItem>[] } = {}) {
  const purchase = purchaseFixture(overrides.purchase);
  const items = overrides.items?.map((item) => itemFixture(item)) ?? [itemFixture()];

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
    insert: vi.fn((values: Partial<PurchaseItem>) => {
      const item: PurchaseItem = {
        id: "item-2",
        purchase_id: values.purchase_id ?? state.purchase.id,
        product_id: values.product_id ?? null,
        product_name_snapshot: values.product_name_snapshot ?? null,
        unit_price_amount: values.unit_price_amount ?? 0,
        quantity: values.quantity ?? 1,
        subtotal_amount: (values.unit_price_amount ?? 0) * (values.quantity ?? 1),
        added_at: "2026-01-01T10:01:00.000Z",
        created_at: "2026-01-01T10:01:00.000Z",
        updated_at: "2026-01-01T10:01:00.000Z",
      };
      return {
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: item, error: null })),
        })),
      };
    }),
    update: vi.fn((values: Partial<Purchase>) => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: state.purchase.id, total_amount: values.total_amount }, error: null })),
            })),
          })),
        })),
      })),
    })),
    single: vi.fn(async () => {
      if (table !== "purchases") throw new Error(`Unexpected single() on ${table}`);
      return { data: state.purchase, error: null };
    }),
  };
  return query;
}

function purchaseFixture(overrides: Partial<Purchase> = {}): Purchase {
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
    ...overrides,
  };
}

function itemFixture(overrides: Partial<PurchaseItem> = {}): PurchaseItem {
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
    ...overrides,
  };
}
