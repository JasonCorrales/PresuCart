"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { SessionHeader } from "@/components/SessionHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { formatCRC, formatSignedCRC } from "@/domain/money";
import { normalizeSupabaseErrorMessage } from "@/domain/offline";
import { getPurchaseAmountSignal, getPurchaseDisplayDate, getPurchaseStoreLabel, groupPurchasesByStatus } from "@/domain/purchaseHistory";
import { createBrowserSupabaseClient } from "@/services/supabase";
import type { Purchase } from "@/types/database";

export default function PurchasesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;

    async function loadPurchases() {
      const { data: userData } = await client.auth.getUser();
      setUser(userData.user);
      if (!userData.user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await client
        .from("purchases")
        .select("*")
        .eq("owner_id", userData.user.id)
        .order("started_at", { ascending: false });

      if (error) {
        setMessage(normalizeSupabaseErrorMessage(error, navigator.onLine));
      } else {
        setPurchases((data ?? []) as Purchase[]);
      }
      setIsLoading(false);
    }

    loadPurchases();
  }, [router, supabase]);

  const groupedPurchases = groupPurchasesByStatus(purchases);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-6">
      <SessionHeader user={user} />
      {!supabase ? (
        <SetupNotice />
      ) : isLoading ? (
        <p className="rounded-2xl bg-white p-5 font-semibold text-slate-700 shadow">Cargando historial...</p>
      ) : (
        <div className="space-y-5">
          <section className="rounded-[2rem] bg-presucart-tinta p-5 text-white shadow-xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">Historial</p>
            <h1 className="mt-2 text-3xl font-black">Tus compras</h1>
            <p className="mt-3 leading-7 text-emerald-50">Reabre compras activas o revisa las finalizadas en modo solo lectura.</p>
            <Link href="/purchases/new" className="mt-5 block rounded-2xl bg-emerald-500 px-5 py-4 text-center text-lg font-black text-white">
              Crear compra nueva
            </Link>
          </section>

          {message ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}

          <PurchaseSection title="Compras activas" emptyCopy="No tienes compras activas." purchases={groupedPurchases.active} />
          <PurchaseSection title="Compras finalizadas" emptyCopy="Aún no hay compras finalizadas." purchases={groupedPurchases.finalized} />
        </div>
      )}
    </main>
  );
}

function PurchaseSection({ title, emptyCopy, purchases }: { title: string; emptyCopy: string; purchases: Purchase[] }) {
  return (
    <section className="space-y-3" aria-labelledby={title.replace(/\s+/g, "-").toLowerCase()}>
      <h2 id={title.replace(/\s+/g, "-").toLowerCase()} className="text-xl font-black text-presucart-tinta">
        {title}
      </h2>
      {purchases.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-slate-600 shadow-sm">{emptyCopy}</p>
      ) : (
        purchases.map((purchase) => <PurchaseCard key={purchase.id} purchase={purchase} />)
      )}
    </section>
  );
}

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const signal = getPurchaseAmountSignal(purchase);
  const signalClassName = signal.isOverBudget ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900";
  const signalLabel = signal.isOverBudget ? `Sobre presupuesto ${formatSignedCRC(signal.available)}` : `Disponible ${formatSignedCRC(signal.available)}`;

  return (
    <Link href={`/purchases/${purchase.id}`} className="block rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-presucart-tinta">{getPurchaseStoreLabel(purchase)}</h3>
          <p className="mt-1 text-sm text-slate-600">{getPurchaseDisplayDate(purchase)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-700">{purchase.status}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Presupuesto" value={formatCRC(purchase.budget_amount)} />
        <Metric label="Total" value={formatCRC(purchase.total_amount)} />
      </div>
      <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${signalClassName}`}>{signalLabel}</p>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-presucart-tinta">{value}</p>
    </div>
  );
}
