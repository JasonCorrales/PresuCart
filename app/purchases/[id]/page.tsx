"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { SessionHeader } from "@/components/SessionHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { calculateBudgetSummary, itemSubtotal } from "@/domain/budget";
import { formatCRC, formatSignedCRC } from "@/domain/money";
import { adjustQuantityInput, parsePositiveCRCAmount, parsePositiveQuantity } from "@/domain/purchaseInput";
import { createBrowserSupabaseClient } from "@/services/supabase";
import type { Purchase, PurchaseItem } from "@/types/database";

type AlertCopy = {
  label: string;
  className: string;
};

type UndoAddState = {
  itemId: string;
  label: string;
};

const UNDO_VISIBLE_MS = 7000;

const alertCopy: Record<string, AlertCopy> = {
  normal: { label: "Vas bien", className: "bg-emerald-50 text-emerald-900" },
  warning: { label: "Ojo: ya usaste 80%", className: "bg-amber-50 text-amber-900" },
  danger: { label: "Casi llegas al límite", className: "bg-orange-50 text-orange-900" },
  exceeded: { label: "Presupuesto agotado", className: "bg-red-50 text-red-900" },
};

export default function PurchasePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [unitPriceInput, setUnitPriceInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [undoAdd, setUndoAdd] = useState<UndoAddState | null>(null);
  const [isUndoingItemId, setIsUndoingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editUnitPriceInput, setEditUnitPriceInput] = useState("");
  const [editQuantityInput, setEditQuantityInput] = useState("1");
  const [isUpdatingItemId, setIsUpdatingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const client = supabase;

    async function loadPurchase() {
      const { data: userData } = await client.auth.getUser();
      setUser(userData.user);
      if (!userData.user) {
        router.push("/auth");
        return;
      }

      const [{ data: purchaseData, error: purchaseError }, { data: itemData, error: itemError }] = await Promise.all([
        client.from("purchases").select("*").eq("id", params.id).eq("owner_id", userData.user.id).single(),
        client.from("purchase_items").select("*").eq("purchase_id", params.id).order("added_at", { ascending: false }),
      ]);

      if (purchaseError || itemError) {
        setMessage(purchaseError?.message ?? itemError?.message ?? "No se pudo cargar la compra.");
      } else {
        setPurchase(purchaseData as Purchase);
        setItems((itemData ?? []) as PurchaseItem[]);
      }
      setIsLoading(false);
    }

    loadPurchase();
  }, [params.id, router, supabase]);

  useEffect(() => {
    if (!undoAdd) return;

    const timeoutId = window.setTimeout(() => setUndoAdd(null), UNDO_VISIBLE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [undoAdd]);

  const summary = useMemo(() => {
    if (!purchase) return null;
    return calculateBudgetSummary(
      purchase.budget_amount,
      items.map((item) => ({ unitPrice: item.unit_price_amount, quantity: item.quantity })),
    );
  }, [items, purchase]);

  async function syncStoredTotal(nextItems: PurchaseItem[]) {
    if (!supabase || !purchase) return;
    const nextTotal = nextItems.reduce(
      (total, item) => total + itemSubtotal({ unitPrice: item.unit_price_amount, quantity: item.quantity }),
      0,
    );
    await supabase.from("purchases").update({ total_amount: nextTotal }).eq("id", purchase.id);
  }

  function setQuickQuantity(delta: number) {
    setQuantityInput((current) => adjustQuantityInput(current, delta));
  }

  function resetQuickQuantity() {
    setQuantityInput("1");
  }

  function setEditQuickQuantity(delta: number) {
    setEditQuantityInput((current) => adjustQuantityInput(current, delta));
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !purchase) return;

    const parsedPrice = parsePositiveCRCAmount(unitPriceInput, "El precio");
    if (!parsedPrice.ok) {
      setMessage(parsedPrice.message);
      return;
    }

    const parsedQuantity = parsePositiveQuantity(quantityInput);
    if (!parsedQuantity.ok) {
      setMessage(parsedQuantity.message);
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const { data, error } = await supabase
      .from("purchase_items")
      .insert({ purchase_id: purchase.id, unit_price_amount: parsedPrice.amount, quantity: parsedQuantity.quantity })
      .select("*")
      .single();
    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const createdItem = data as PurchaseItem;
    const nextItems = [createdItem, ...items];
    setItems(nextItems);
    setUndoAdd({
      itemId: createdItem.id,
      label: `${formatCRC(createdItem.unit_price_amount)} × ${createdItem.quantity}`,
    });
    setUnitPriceInput("");
    setQuantityInput("1");
    await syncStoredTotal(nextItems);
  }

  async function deletePersistedItem(itemId: string, nextItems: PurchaseItem[]) {
    if (!supabase || !purchase) return false;
    const { error } = await supabase.from("purchase_items").delete().eq("id", itemId).eq("purchase_id", purchase.id);
    if (error) {
      setMessage(error.message);
      return false;
    }
    await syncStoredTotal(nextItems);
    return true;
  }

  async function handleUndoAdd() {
    if (!undoAdd || isUndoingItemId) return;
    const itemId = undoAdd.itemId;
    const itemStillExists = items.some((item) => item.id === itemId);
    if (!itemStillExists) {
      setUndoAdd(null);
      return;
    }

    const nextItems = items.filter((item) => item.id !== itemId);
    setIsUndoingItemId(itemId);
    setMessage(null);
    const deleted = await deletePersistedItem(itemId, nextItems);
    setIsUndoingItemId(null);
    if (!deleted) return;

    setItems(nextItems);
    setUndoAdd(null);
  }

  async function handleDeleteItem(itemId: string) {
    const nextItems = items.filter((item) => item.id !== itemId);
    setItems(nextItems);
    if (undoAdd?.itemId === itemId) setUndoAdd(null);
    if (editingItemId === itemId) cancelEditing();
    await deletePersistedItem(itemId, nextItems);
  }

  function startEditing(item: PurchaseItem) {
    setEditingItemId(item.id);
    setEditUnitPriceInput(String(item.unit_price_amount));
    setEditQuantityInput(String(item.quantity));
    setMessage(null);
  }

  function cancelEditing() {
    setEditingItemId(null);
    setEditUnitPriceInput("");
    setEditQuantityInput("1");
  }

  async function handleSaveEdit(itemId: string) {
    if (!supabase || !purchase) return;

    const parsedPrice = parsePositiveCRCAmount(editUnitPriceInput, "El precio");
    if (!parsedPrice.ok) {
      setMessage(parsedPrice.message);
      return;
    }

    const parsedQuantity = parsePositiveQuantity(editQuantityInput);
    if (!parsedQuantity.ok) {
      setMessage(parsedQuantity.message);
      return;
    }

    setIsUpdatingItemId(itemId);
    setMessage(null);
    const { data, error } = await supabase
      .from("purchase_items")
      .update({ unit_price_amount: parsedPrice.amount, quantity: parsedQuantity.quantity })
      .eq("id", itemId)
      .eq("purchase_id", purchase.id)
      .select("*")
      .single();
    setIsUpdatingItemId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    const updatedItem = data as PurchaseItem;
    const nextItems = items.map((item) => (item.id === itemId ? updatedItem : item));
    setItems(nextItems);
    if (undoAdd?.itemId === itemId) setUndoAdd(null);
    cancelEditing();
    await syncStoredTotal(nextItems);
  }

  const progressWidth = summary ? `${Math.min(summary.usedPercent, 100)}%` : "0%";
  const currentAlert = summary ? alertCopy[summary.alertState] : alertCopy.normal;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-6">
      <SessionHeader user={user} />
      {!supabase ? (
        <SetupNotice />
      ) : isLoading ? (
        <p className="rounded-2xl bg-white p-5 font-semibold text-slate-700 shadow">Cargando compra...</p>
      ) : !purchase || !summary ? (
        <section className="rounded-[2rem] bg-white p-5 shadow-xl">
          <h1 className="text-2xl font-black text-presucart-tinta">No encontramos esta compra</h1>
          <p className="mt-3 text-slate-600">Verifica que hayas iniciado sesión con el usuario correcto.</p>
          {message ? <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
        </section>
      ) : (
        <div className="space-y-5">
          <section className="rounded-[2rem] bg-presucart-tinta p-5 text-white shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">Compra activa</p>
            <h1 className="mt-2 text-3xl font-black">{purchase.store_name_snapshot ?? "Sin supermercado"}</h1>
            <div className="mt-5 rounded-[1.5rem] bg-white p-4 text-presucart-tinta">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">Disponible</p>
              <p className="mt-1 text-4xl font-black leading-none">{formatSignedCRC(summary.available)}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Metric label="Presupuesto" value={formatCRC(summary.budget)} />
              <Metric label="Gastado" value={formatCRC(summary.spent)} />
              <Metric label="Usado" value={`${Math.round(summary.usedPercent)}%`} />
            </div>
            <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-emerald-300" style={{ width: progressWidth }} />
            </div>
            <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${currentAlert.className}`}>{currentAlert.label}</p>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-xl">
            <h2 className="text-2xl font-black text-presucart-tinta">Agregar precio</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Flujo rápido: escribe precio, ajusta cantidad con botones grandes y sigue caminando.</p>
            <form className="mt-5 space-y-4" onSubmit={handleAddItem}>
              <label className="block font-bold text-presucart-tinta">
                Precio unitario CRC
                <input
                  inputMode="numeric"
                  value={unitPriceInput}
                  onChange={(event) => setUnitPriceInput(event.target.value)}
                  required
                  className="mt-2 min-h-16 w-full rounded-2xl border border-slate-200 px-4 text-2xl font-black"
                  placeholder="₡2.500"
                />
              </label>
              <QuantityField
                value={quantityInput}
                onChange={setQuantityInput}
                onDecrement={() => setQuickQuantity(-1)}
                onIncrement={() => setQuickQuantity(1)}
                onReset={resetQuickQuantity}
              />
              {message ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
              {undoAdd ? (
                <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-900">Agregado: {undoAdd.label}</p>
                  <button
                    type="button"
                    onClick={handleUndoAdd}
                    disabled={isUndoingItemId === undoAdd.itemId}
                    className="mt-3 min-h-12 w-full rounded-xl bg-presucart-tinta px-4 py-3 text-lg font-black text-white disabled:bg-slate-300"
                  >
                    {isUndoingItemId === undoAdd.itemId ? "Deshaciendo..." : "DESHACER"}
                  </button>
                </div>
              ) : null}
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-14 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-black text-white disabled:bg-slate-300"
              >
                {isSaving ? "Agregando..." : "Agregar al carrito"}
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-presucart-tinta">Ítems agregados</h2>
            {items.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-slate-600 shadow-sm">Aún no has agregado precios.</p>
            ) : (
              items.map((item) => {
                const isEditing = editingItemId === item.id;
                return (
                  <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    {isEditing ? (
                      <div className="space-y-4">
                        <label className="block font-bold text-presucart-tinta">
                          Precio unitario CRC
                          <input
                            inputMode="numeric"
                            value={editUnitPriceInput}
                            onChange={(event) => setEditUnitPriceInput(event.target.value)}
                            className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-xl font-black"
                          />
                        </label>
                        <QuantityField
                          value={editQuantityInput}
                          onChange={setEditQuantityInput}
                          onDecrement={() => setEditQuickQuantity(-1)}
                          onIncrement={() => setEditQuickQuantity(1)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={isUpdatingItemId === item.id}
                            className="min-h-12 rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:bg-slate-300"
                          >
                            {isUpdatingItemId === item.id ? "Guardando..." : "Guardar"}
                          </button>
                          <button type="button" onClick={cancelEditing} className="min-h-12 rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-presucart-tinta">
                            {formatCRC(item.unit_price_amount)} × {item.quantity}
                          </p>
                          <p className="text-sm text-slate-600">Subtotal {formatCRC(itemSubtotal({ unitPrice: item.unit_price_amount, quantity: item.quantity }))}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button type="button" onClick={() => startEditing(item)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-presucart-tinta">
                            Editar
                          </button>
                          <button type="button" onClick={() => handleDeleteItem(item.id)} className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                            Borrar
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function QuantityField({
  value,
  onChange,
  onDecrement,
  onIncrement,
  onReset,
}: {
  value: string;
  onChange: (value: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="font-bold text-presucart-tinta">
      <div className="flex items-center justify-between">
        <span>Cantidad</span>
        {onReset ? (
          <button type="button" onClick={onReset} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
            Reiniciar a 1
          </button>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-[4rem_1fr_4rem] gap-2">
        <button type="button" onClick={onDecrement} className="min-h-14 rounded-2xl bg-slate-100 text-3xl font-black text-presucart-tinta" aria-label="Bajar cantidad">
          −
        </button>
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-center text-2xl font-black"
        />
        <button type="button" onClick={onIncrement} className="min-h-14 rounded-2xl bg-slate-100 text-3xl font-black text-presucart-tinta" aria-label="Subir cantidad">
          +
        </button>
      </div>
    </div>
  );
}
