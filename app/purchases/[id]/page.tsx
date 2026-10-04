"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { SessionHeader } from "@/components/SessionHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { calculateBudgetSummary, itemSubtotal } from "@/domain/budget";
import { formatCRC, formatSignedCRC } from "@/domain/money";
import { parsePositiveCRCAmount } from "@/domain/purchaseInput";
import { createBrowserSupabaseClient } from "@/services/supabase";
import type { Purchase, PurchaseItem } from "@/types/database";

type AlertCopy = {
  label: string;
  className: string;
};

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

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !purchase) return;

    const parsedPrice = parsePositiveCRCAmount(unitPriceInput, "El precio");
    if (!parsedPrice.ok) {
      setMessage(parsedPrice.message);
      return;
    }

    const quantity = Number(quantityInput);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setMessage("La cantidad debe ser un entero mayor que cero.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const { data, error } = await supabase
      .from("purchase_items")
      .insert({ purchase_id: purchase.id, unit_price_amount: parsedPrice.amount, quantity })
      .select("*")
      .single();
    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const nextItems = [data as PurchaseItem, ...items];
    setItems(nextItems);
    setUnitPriceInput("");
    setQuantityInput("1");
    await syncStoredTotal(nextItems);
  }

  async function handleDeleteItem(itemId: string) {
    if (!supabase) return;
    const nextItems = items.filter((item) => item.id !== itemId);
    setItems(nextItems);
    const { error } = await supabase.from("purchase_items").delete().eq("id", itemId);
    if (error) {
      setMessage(error.message);
      return;
    }
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
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Presupuesto" value={formatCRC(summary.budget)} />
              <Metric label="Gastado" value={formatCRC(summary.spent)} />
              <Metric label="Disponible" value={formatSignedCRC(summary.available)} />
              <Metric label="Usado" value={`${Math.round(summary.usedPercent)}%`} />
            </div>
            <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-emerald-300" style={{ width: progressWidth }} />
            </div>
            <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${currentAlert.className}`}>{currentAlert.label}</p>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-xl">
            <h2 className="text-2xl font-black text-presucart-tinta">Agregar precio</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Flujo rápido: solo escribe precio y cantidad; producto es opcional para fases futuras.</p>
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
              <label className="block font-bold text-presucart-tinta">
                Cantidad
                <input
                  inputMode="numeric"
                  value={quantityInput}
                  onChange={(event) => setQuantityInput(event.target.value)}
                  required
                  className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-xl font-bold"
                />
              </label>
              {message ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
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
              items.map((item) => (
                <article key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="font-black text-presucart-tinta">{formatCRC(item.unit_price_amount)} × {item.quantity}</p>
                    <p className="text-sm text-slate-600">Subtotal {formatCRC(itemSubtotal({ unitPrice: item.unit_price_amount, quantity: item.quantity }))}</p>
                  </div>
                  <button type="button" onClick={() => handleDeleteItem(item.id)} className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                    Borrar
                  </button>
                </article>
              ))
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
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}
