"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { SessionHeader } from "@/components/SessionHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { createBrowserSupabaseClient } from "@/services/supabase";

export default function AuthPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setMessage(null);

    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsSubmitting(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Cuenta creada. Revisa tu correo si Supabase requiere confirmación antes de entrar.");
      return;
    }

    router.push("/purchases/new");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-6">
      <SessionHeader user={user} />
      <section className="rounded-[2rem] bg-white p-5 shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Acceso</p>
        <h1 className="mt-2 text-3xl font-black text-presucart-tinta">Entra antes de crear tu compra</h1>
        <p className="mt-3 leading-7 text-slate-600">
          PresuCart guarda tus compras con Supabase Auth para que cada carrito pertenezca a tu usuario.
        </p>

        {!supabase ? (
          <div className="mt-5">
            <SetupNotice />
          </div>
        ) : user ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-900">Sesión activa: {user.email}</p>
            <button
              type="button"
              onClick={() => router.push("/purchases/new")}
              className="min-h-14 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-black text-white"
            >
              Crear compra
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-xl px-3 py-3 font-bold ${mode === "signin" ? "bg-white text-emerald-700 shadow" : "text-slate-600"}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-xl px-3 py-3 font-bold ${mode === "signup" ? "bg-white text-emerald-700 shadow" : "text-slate-600"}`}
              >
                Crear cuenta
              </button>
            </div>
            <label className="block font-bold text-presucart-tinta">
              Correo
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-lg"
                placeholder="tu@correo.com"
              />
            </label>
            <label className="block font-bold text-presucart-tinta">
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-200 px-4 text-lg"
                placeholder="Mínimo 6 caracteres"
              />
            </label>
            {message ? <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-14 w-full rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-black text-white disabled:bg-slate-300"
            >
              {isSubmitting ? "Procesando..." : mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
