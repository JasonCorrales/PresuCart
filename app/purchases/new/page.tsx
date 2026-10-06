"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { SessionHeader } from "@/components/SessionHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { normalizeSupabaseErrorMessage } from "@/domain/offline";
import { parsePositiveCRCAmount, normalizeOptionalText } from "@/domain/purchaseInput";
import { createBrowserSupabaseClient } from "@/services/supabase";

export default function NewPurchasePage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [storeName, setStoreName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) router.push("/auth");
    });
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;

    const parsedBudget = parsePositiveCRCAmount(budgetInput, "El presupuesto");
    if (!parsedBudget.ok) {
      setMessage(parsedBudget.message);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("purchases")
      .insert({
        owner_id: user.id,
        budget_amount: parsedBudget.amount,
        store_name_snapshot: normalizeOptionalText(storeName),
      })
      .select("id")
      .single();

    setIsSubmitting(false);

    if (error) {
      setMessage(normalizeSupabaseErrorMessage(error, navigator.onLine));
      return;
    }

    router.push(`/purchases/${data.id}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-6">
      <SessionHeader user={user} />
      <section className="rounded-[2rem] bg-white p-5 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Nueva compra</p>
        <h1 className="mt-2 text-3xl font-black text-presucart-tinta">Define tu presupuesto antes de entrar al súper</h1>
        <p className="mt-3 leading-7 text-slate-600">Usa montos enteros en colones. Ejemplo: 75000 o ₡75.000.</p>

        {!supabase ? (
          <div className="mt-5">
            <SetupNotice />
          </div>
        ) : !user ? (
          <p className="mt-5 rounded-2xl bg-amber-50 p-4 font-semibold text-amber-900">Redirigiendo a inicio de sesión...</p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block font-bold text-presucart-tinta">
              Presupuesto CRC
              <input
                inputMode="numeric"
                value={budgetInput}
                onChange={(event) => setBudgetInput(event.target.value)}
                required
                className="mt-2 min-h-16 w-full rounded-2xl border border-slate-200 px-4 text-2xl font-black"
                placeholder="₡75.000"
              />
            </label>
            <label className="block font-bold text-presucart-tinta">
              Supermercado (opcional)
              <input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-lg"
                placeholder="Automercado, Palí, feria..."
              />
            </label>
            {message ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-14 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-black text-white disabled:bg-slate-300"
            >
              {isSubmitting ? "Creando..." : "Crear compra"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
