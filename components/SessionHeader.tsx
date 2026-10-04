"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase";

type SessionHeaderProps = {
  user: User | null;
};

export function SessionHeader({ user }: SessionHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <Link href="/" className="text-lg font-black text-presucart-tinta" aria-label="Ir al inicio">
        PresuCart
      </Link>
      {user ? (
        <div className="flex items-center gap-2">
          <Link href="/purchases" className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
            Historial
          </Link>
          <span className="max-w-[7rem] truncate text-xs text-slate-600">{user.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            Salir
          </button>
        </div>
      ) : (
        <Link href="/auth" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
          Iniciar sesión
        </Link>
      )}
    </header>
  );
}
